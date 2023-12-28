import { logError, logInfo, _each, hasDeviceAccess, cyrb53Hash } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
// import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { getCoreStorageManager } from '../src/storageManager.js';
import { configurationMap } from '../src/complianceUtils.js';
import { getGlobal } from '../src/prebidGlobal.js';

/* installed modules =
'complianceAnalyticsAdapter', 'consentManagement', 'gdprEnforcement', , 'userId'
'criteoBidAdapter', 'pubmaticBidAdapter',
'hadronIdSystem', 'id5IdSystem', 'lotamePanoramaIdSystem', 'pubProvidedIdSystem', 'sharedIdSystem'
*/

/// /////////// CONSTANTS //////////////
const ADAPTER_CODE = 'complianceAnalytics';
const END_POINT_HOST = 'http://172.16.10.110:5500/api/data/addData'; // 'https://t.pubmatic.com/?compliance=true';
// const END_POINT_BID_LOGGER = END_POINT_HOST + '&wl&';
const LOG_PRE_FIX = 'PubMatic-Compliance-Analytics: ';

// todo: input profileId and profileVersionId ; defaults to zero or one
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const DEFAULT_IDENTITY_ONLY = '0';
const COMPLIANCE_INIT = 'CMP_Loaded';

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional
let identityOnly = DEFAULT_IDENTITY_ONLY;
let domain = '';
let cmpConfig = {};
let outputObj = {};
let pixelURL = END_POINT_HOST; // END_POINT_BID_LOGGER;
window.complianceData = {};

let loggerFired = false;
const COMPLIANCE_LOGGER_COOKIE = 'csh';
const COMPLIANCE_LOGGER_COOKIE_EXP = 'csh_exp';
const COMPLIANCE_LOGGER_EXPIRY_VALUE = 1;
export const coreStorage = getCoreStorageManager('userid');
const owpbjs = window.owpbjs || {};
/// /////////// HELPER FUNCTIONS //////////////

export function collectBasicConsentData(args) {
  console.log('in collectBasicConsentData');
  logInfo('Compliance Analytics: Collecting basic consent data.');

  outputObj['namespaces'] = window._pbjsGlobals;
  outputObj['pv'] = owpbjs.version;
  outputObj['pubid'] = '' + publisherId;
  outputObj['pid'] = '' + profileId;
  outputObj['pdvid'] = '' + profileVersionId;
  outputObj['ih'] = identityOnly;
  outputObj['orig'] = domain;
  outputObj['ge'] = cmpConfig.gdprEnabled; // is gdpr enabled
  outputObj['ce'] = cmpConfig.ccpaEnabled; // is ccpa enabled
  outputObj['gApi'] = cmpConfig.cmpApi; // gdpr api
  outputObj['gto'] = cmpConfig.gdprTO; // gdpr timeout
  outputObj['cApi'] = cmpConfig.ccpaCmpAPI; // ccpa api
  outputObj['cto'] = cmpConfig.ccpaTO; // ccpa timeout
  outputObj['gaTo'] = cmpConfig.actionTO; // gdpr action timeout
  outputObj['cmpEv'] = args.consentData.eventStatus; // cmp event code
  outputObj['cmpNm'] = args.cmp.name; // cmp name
  outputObj['cmpId'] = args.cmp.id; // cmp id
  outputObj['dtcS'] = args.consentData.tcString; // default consent string
  outputObj['gdprA'] = args.consentData.gdprApplies; // whether gdpr applies or not
  outputObj['cc'] = args.consentData.publisherCC; // geo of publisher or site
  outputObj['im'] = getGlobal().installedModules;
  outputObj['ts'] = new Date().getTime();// timstamp
};

function setCookie(tcs) {
  if (hasDeviceAccess()) {
    coreStorage.setCookie(COMPLIANCE_LOGGER_COOKIE_EXP, (new Date(Date.now() + (COMPLIANCE_LOGGER_EXPIRY_VALUE * (60 * 60 * 24 * 1000)))).toUTCString())
    coreStorage.setCookie(COMPLIANCE_LOGGER_COOKIE, cyrb53Hash(tcs));
  }
}

function shouldFireLogger(tcs) {
  if (!hasDeviceAccess()) { // device access is denied, so there is not existing cookie. fire the logger call.
    return true;
  }
  var ts = coreStorage.getCookie(COMPLIANCE_LOGGER_COOKIE_EXP); // if ts is undefined, there is no prev cookie, so fire the logger.
  const prevConsentStr = coreStorage.getCookie(COMPLIANCE_LOGGER_COOKIE);
  const newConsentStr = cyrb53Hash(tcs);
  const today = new Date();

  if (ts === undefined || (ts !== undefined && new Date(ts) < today) || newConsentStr !== prevConsentStr) {
    return true;
  }
  return false;
}
export function collectUserConsentDataAndFireLogger(args) {
  logInfo('Compliance Analytics: Collecting user consent data.');
  outputObj['vc'] = {};

  _each(configurationMap, function(obj, key) {
    outputObj['vc'] = { ...outputObj['vc'], [obj.gvlid]: args.consentData.vendor.consents[obj.gvlid] };
  });

  outputObj['pc'] = { ...outputObj['pc'], 1: args.consentData.purpose.consents['1'] }; // purpose consent values
  outputObj['pc'] = { ...outputObj['pc'], 2: args.consentData.purpose.consents['2'] }; // purpose consent values
  outputObj['pc'] = { ...outputObj['pc'], 7: args.consentData.purpose.consents['7'] }; // purpose consent
  outputObj['tcS'] = args.consentData.tcString;

  outputObj['li'] = args.consentData.purpose.legitimateInterests; // legitimateInterests consent values
  // outputObj['vc'] = args.consentData.vendor.consents; // vendor consent values
  outputObj['vli'] = args.consentData.vendor.legitimateInterests; // vendor legitimateInterests consent values
  fireComplianceLoggerCall(args)
}

/* function populateDummyData() {
  if (getParameterByName('dummy')) {
    outputObj['vc']['131'] = false; // dummy data to override cmp data
    outputObj['vc']['76'] = false; // dummy data to override cmp data
    outputObj['pc']['1'] = false;
    outputObj['namespaces'] = ['owpbjs', 'owpbjs', 'pbjs'];
    outputObj['loc'] = 'UK';
    outputObj['gdprA'] = false;
    outputObj['pv'] = 'v6.18.0';
  }
} */

export function fireComplianceLoggerCall(tcs) {
  if (shouldFireLogger(tcs)) {
    logInfo('Compliance Analytics: Firing logger.');
    window.complianceData = outputObj;
    // populateDummyData();
    // outputObj['bb'] = args.biddersBlocked; //list of blocked bidders
    // outputObj['ipb'] = args.storageBlocked; //list of id modules blocked
    // validateConsentData(outputObj);
    loggerFired = true;
    ajax(
      pixelURL,
      { success: setCookie(tcs), error: setCookie(tcs) },
      JSON.stringify(outputObj),
      {
        contentType: 'application/json',
        withCredentials: true,
        method: 'POST'
      }
    );
  }
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
        logInfo(LOG_PRE_FIX + 'Logger fired - ' + COMPLIANCE_INIT);
        logInfo(args);
        console.log('in switch case ', args.consentData.eventStatus);
        switch (args.consentData.eventStatus) {
          case 'tcloaded':
          case 'cmpuishown':
            console.log('in case tcloaded');
            collectBasicConsentData(args);
            break;
          case 'useractioncomplete':
            collectUserConsentDataAndFireLogger(args);
            break;
        }
        setTimeout(function() {
          logInfo(LOG_PRE_FIX + 'Logger did not fire with cmp values. CMP not loaded, or user action not detected. Firing logger with defqault values')
          if (!loggerFired) {
            fireComplianceLoggerCall(args.consentData.tcString);
          }
        },
        20000);
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: complianceAdapter,
  code: ADAPTER_CODE
});
// (getGlobal()).collectBasicConsentData = collectBasicConsentData;
// (getGlobal()).collectUserConsentDataAndFireLogger = collectUserConsentDataAndFireLogger;

// export default complianceAdapter;
// export { complianceAdapter as default };
export default complianceAdapter;
