import { logError, logInfo, isNumber, _each } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
// import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { getCoreStorageManager } from '../src/storageManager.js';
import { getParameterByName } from '../src/utils.js';
import { configurationMap, validateConsentData } from '../src/complianceUtils.js';
/* installed modules = 
'complianceAnalyticsAdapter', 'consentManagement', 'gdprEnforcement', , 'userId'
'criteoBidAdapter', 'pubmaticBidAdapter', 
'hadronIdSystem', 'id5IdSystem', 'lotamePanoramaIdSystem', 'pubProvidedIdSystem', 'sharedIdSystem'
*/

/// /////////// CONSTANTS //////////////
const ADAPTER_CODE = 'complianceAnalytics';
const END_POINT_HOST = "http://172.16.10.110:5500/api/data/addData"; //'https://t.pubmatic.com/?compliance=true';
//const END_POINT_BID_LOGGER = END_POINT_HOST + '&wl&';
const LOG_PRE_FIX = 'PubMatic-Compliance-Analytics: ';

// todo: input profileId and profileVersionId ; defaults to zero or one
const enc = window.encodeURIComponent;
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const DEFAULT_IDENTITY_ONLY = '0';
const COMPLIANCE_INIT = 'CMP_Loaded';


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
let pixelURL = END_POINT_HOST; //END_POINT_BID_LOGGER;
window.complianceData = {};
export const coreStorage = getCoreStorageManager('userid');

/// /////////// HELPER FUNCTIONS //////////////

function collectBasicConsentData(args) {
  console.log("Compliance logger call - collectConsentData");

  outputObj['namespaces'] = window._pbjsGlobals;
  outputObj['pv'] = owpbjs.version;
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
      outputObj['loc'] = location.cc || location.error;
      fireComplianceLoggerCall(args);
    } catch(e) {
        console.log("Location data is expected to be an object");
        fireComplianceLoggerCall({error: e});
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
    getRegion({error: e});
  }
}

function populateDummyData() {
  if (getParameterByName('dummy')) {
    outputObj['vc']['131'] = false; //dummy data to override cmp data
    outputObj['vc']['76'] = false; //dummy data to override cmp data
    outputObj['pc']['1'] = false;
    outputObj['namespaces'] = ["owpbjs", "owpbjs", "pbjs"];
    outputObj['loc'] = 'UK';
    outputObj['gdprA'] = false;
    outputObj['pv'] = "v6.18.0";
  }
}

function fireComplianceLoggerCall(args) {
  console.log("Compliance logger call - fireComplianceLoggerCall");
  window.complianceData = outputObj;
  populateDummyData();
  //outputObj['bb'] = args.biddersBlocked; //list of blocked bidders
  //outputObj['ipb'] = args.storageBlocked; //list of id modules blocked
  validateConsentData(outputObj);
  ajax(
    pixelURL,
    null,
    JSON.stringify(outputObj), 
    {
      contentType: 'application/json',
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
        if (args.consentData.eventStatus === "tcloaded" || args.consentData.eventStatus === "cmpuishown" ) {
          collectBasicConsentData(args); 
          setTimeout(function() {
            collectUserConsentDataAndFireLogger(args);
          }, 2000);
        }
        if(args.consentData.eventStatus === "useractioncomplete") {
          collectUserConsentDataAndFireLogger(args);
        } 
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
