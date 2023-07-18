import { logError, logInfo, isNumber, _each } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
// import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getCoreStorageManager } from '../src/storageManager.js';

/* installed modules = 
'complianceAnalyticsAdapter', 'consentManagement', 'gdprEnforcement', , 'userId'
'criteoBidAdapter', 'pubmaticBidAdapter', 
'hadronIdSystem', 'id5IdSystem', 'lotamePanoramaIdSystem', 'pubProvidedIdSystem', 'sharedIdSystem'
*/

/// /////////// CONSTANTS //////////////
const ADAPTER_CODE = 'complianceAnalytics';
const END_POINT_HOST = 'https://t.pubmatic.com/?compliance=true';
const END_POINT_BID_LOGGER = END_POINT_HOST + '&wl&';
const LOG_PRE_FIX = 'PubMatic-Compliance-Analytics: ';

// todo: input profileId and profileVersionId ; defaults to zero or one
const enc = window.encodeURIComponent;
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const DEFAULT_IDENTITY_ONLY = '0';
const COMPLIANCE_INIT = 'CMP_Loaded';
const configurationMap = {
  'criteoBidAdapter': {
    gvlid: 91,
    url: '/bidder.criteo.com/cdb'
  },
  'pubmaticBidAdapter': {
    gvlid: 76,
    url: "translator"
  },
  'hadronIdSystem': {
    gvlid: 561, 
    url: 'id.hadron.ad.gt'
  },
  'id5IdSystem': {
    gvlid: 131, 
    url: 'id5-sync.com/api/config/prebid'
  },
  'lotamePanoramaIdSystem': {
    gvlid: 95,
    url: 'id.crwdcntrl.net'
  }
};

//const IH_ANALYTICS_EXPIRY = 7;
//const IH_LOGGER_STORAGE_KEY = 'IH_LGCL_TS'

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional
let identityOnly = DEFAULT_IDENTITY_ONLY;
let domain = '';
let cmpConfig = {};
let outputObj = {};
let pixelURL = END_POINT_BID_LOGGER;

export const coreStorage = getCoreStorageManager('userid');

/// /////////// HELPER FUNCTIONS //////////////

function collectBasicConsentData(args) {
  console.log("Compliance logger call - collectConsentData");
  outputObj['namespaces'] = window._pbjsGlobals;

  outputObj['pubid'] = '' + publisherId;
  outputObj['pid'] = '' + profileId;
  outputObj['pdvid'] = '' + profileVersionId;
  outputObj['ih'] = identityOnly;
  outputObj['orig'] = domain;
  outputObj['ge'] = cmpConfig.gdprEnabled;  // is gdpr enabled
  outputObj["ce"] = cmpConfig.ccpaEnabled; // is ccpa enabled
  outputObj["gApi"] = cmpConfig.cmpApi; // gdpr api
  outputObj["gto"] = cmpConfig.gdprTO; // gdpr timeout
  outputObj["cApi"] = cmpConfig.ccpaCmpAPI; // ccpa api
  outputObj["cto"] = cmpConfig.ccpaTO; // ccpa timeout
  outputObj['gaTo'] = cmpConfig.actionTO; // gdpr action timeout
  outputObj['cmpEv'] = args.consentData.eventStatus; // cmp event code
  outputObj['cmpNm'] = args.cmp.name; // cmp name
  outputObj['cmpId'] = args.cmp.id; // cmp id
  outputObj['tcS'] = args.consentData.tcString;
  outputObj['gdprA'] = args.consentData.gdprApplies; // whether gdpr applies or not
  outputObj['cc'] = args.consentData.publisherCC; // geo of publisher or site

  pixelURL += 'pubid=' + publisherId;        
};

function collectUserConsentDataAndFireLogger(args) {
  console.log("Compliance logger call - collectUserConsentDataAndFireLogger");
  const URL = "https://ut.pubmatic.com/geo?pubid="+publisherId;
  outputObj['vc'] = {};
  
  _each(configurationMap, function(obj, key) {
    outputObj['vc'] = { ...outputObj['vc'], [obj.gvlid]: args.consentData.vendor.consents[obj.gvlid]};
  });
  outputObj['pc'] = { ...outputObj['pc'], 1: args.consentData.purpose.consents['1']}; //purpose consent values
  outputObj['pc'] = { ...outputObj['pc'], 2: args.consentData.purpose.consents['2']}; //purpose consent values
  outputObj['pc'] = { ...outputObj['pc'], 7: args.consentData.purpose.consents['7']}; //purpose consent values
  

  outputObj['li'] = args.consentData.purpose.legitimateInterests; // legitimateInterests consent values
  //outputObj['vc'] = args.consentData.vendor.consents; // vendor consent values
  outputObj['vli'] = args.consentData.vendor.legitimateInterests; // vendor legitimateInterests consent values

  getRegion = function(resp) {
    try {
      let location = JSON.parse(resp);
      outputObj['loc'] = location.cc || location.error
      fireComplianceLoggerCall(args);
    } catch(e) {
        console.log("Location data is expected to be an object");
        callback({error: e});
    }
  }

  try {
      ajax(
          URL,
          { success: getRegion, error: function(e) {getRegion({error: e})} },
          null,
          { contentType: 'application/x-www-form-urlencoded', method: 'GET' }
      );
  } catch(e) {
      callback({error: e});
  }
}

function identifyViolations() {
  console.log("Compliance logger call - identifyViolations");
  
  outputObj['violation'] = {violation_str: ""};
  outputObj['misconfiguration'] = {misconf_str: ""};
  //violations
  if (!outputObj['gdprA'] && outputObj['loc'] === 'UK' ) {
    outputObj['violation'].violation_str += "CMP returned gdprApplies false for GDPR enabled region";
  }
  let networkEntries = window.performance.getEntries();
  let xhrCalls = [];
  for(let i in networkEntries) {
    if (networkEntries[i].initiatorType === 'xmlhttprequest') {;
      // check if installed modules have been blocked, but calls are still triggered. if that is the case, add it to xhrCalls array
      _each(configurationMap, function(obj) {
          if (outputObj['vc'][obj.gvlid] === 'false' && networkEntries[i].indexOf(obj.url) > 0 ) {
            xhrCalls.push(networkEntries[i].name);
            outputObj['violation'].violation_str += "Call made to url "+obj.url+" when consent was not given. \n"
          }
      });
      
    }
  }
  outputObj['xhrCalls'] = xhrCalls;
  // mis configurations
  if(outputObj['gto'] < 500) {
    outputObj['misconfiguration'].misconf_str += "GDPR timeout is very low - "+outputObj['gto'];
  }
  if(outputObj['gaTo'] === 0 || outputObj['gaTo'] === undefined) {
    outputObj['misconfiguration'].misconf_str += "GDPR Action timeout not set/set to 0.";
  }
  if(outputObj['ge'] === 0) {
    outputObj['misconfiguration'].misconf_str += "GDPR is not configured for a GDPR region. Region detected - "+outputObj['loc'];
  }
  if(outputObj['ce'] === 0) {
    outputObj['misconfiguration'].misconf_str += "CCPA is not configured for a CCPA region. Region detected - "+outputObj['loc'];
  }
}

function fireComplianceLoggerCall(args) {
  console.log("Compliance logger call - fireComplianceLoggerCall");

  //outputObj['bb'] = args.biddersBlocked; //list of blocked bidders
  //outputObj['ipb'] = args.storageBlocked; //list of id modules blocked
  identifyViolations();
  ajax(
    pixelURL,
    null,
    'json=' + enc(JSON.stringify(outputObj)), {
      contentType: 'application/x-www-form-urlencoded',
      withCredentials: true,
      method: 'POST'
    }
  );
};
/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

/// /////////// ADAPTER DEFINITION //////////////

let baseAdapter = adapter({
  analyticsType: 'endpoint'
});
let complianceAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(conf = {}) {
    let error = false;

    if (typeof conf.options === 'object') {
      if (conf.options.publisherId) {
        publisherId = Number(conf.options.publisherId);
      }
      profileId = Number(conf.options.profileId) || 0;
      profileVersionId = Number(conf.options.profileVersionId) || 0;
      identityOnly = conf.options.identityOnly;
      domain = conf.options.domain || '';
      cmpConfig = conf.options.cmpConfig;
    } else {
      logError(LOG_PRE_FIX + 'Config not found.');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PRE_FIX + 'Missing publisherId(Number).');
      error = true;
    }

    if (error) {
      logError(LOG_PRE_FIX + 'Not collecting data due to error(s).');
    } else {
      baseAdapter.enableAnalytics.call(this, conf);
    }
  },

  disableAnalytics() {
    publisherId = 0;
    profileId = 0;
    profileVersionId = 0;
    identityOnly = '0';
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({
    eventType,
    args
  }) {
    switch (eventType) {
      case COMPLIANCE_INIT:
        logInfo('Compliance Logger fired - '+COMPLIANCE_INIT);
        logInfo(args);
        if (args.consentData.eventStatus === "tcloaded") {
          collectBasicConsentData(args); 
        }
        if(args.consentData.eventStatus === "useractioncomplete") {
          collectUserConsentDataAndFireLogger(args);
        }  
        break;
      case 'tcf2Enforcement1':
        logInfo('Compliance Logger fired - tcf2Enforcement');
        collectGeoDataAndFireLogger(args);
        //fireComplianceLoggerCall(args);
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: complianceAdapter,
  code: ADAPTER_CODE
});
// export default pubmaticAdapter;
export { complianceAdapter as default };
