import { logError, logInfo, isNumber } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
// import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getCoreStorageManager } from '../src/storageManager.js';
import * as events from '../src/events.js';

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

//const IH_ANALYTICS_EXPIRY = 7;
//const IH_LOGGER_STORAGE_KEY = 'IH_LGCL_TS'

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional
let identityOnly = DEFAULT_IDENTITY_ONLY;
let domain = '';
let cmpConfig = {};

export const coreStorage = getCoreStorageManager('userid');

/// /////////// HELPER FUNCTIONS //////////////

export function fireComplianceLoggerCall() {
 // events.emit(COMPLIANCE_INIT);
};

function executeComplianceLoggerCall(args) {
  let pixelURL = END_POINT_BID_LOGGER;
  let outputObj = {};
  let cmConfig = 
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
  outputObj['cmpEv'] = args.eventCode; // cmp event code
  outputObj['cmpNm'] = args.cmp.name; // cmp name
  outputObj['cmpId'] = args.cmp.id; // cmp id
  outputObj['tcS'] = args.tcString;
  outputObj['gdprA'] = args.gdprApplies; // whether gdpr applies or not
  outputObj['cc'] = args.publisherCC; // geo of publisher or site


  pixelURL += 'pubid=' + publisherId;
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
        logInfo('Compliance Logger fired - ');
        logInfo(args);
        executeComplianceLoggerCall(args);
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: complianceAdapter,
  code: ADAPTER_CODE
});

(getGlobal()).fireComplianceLoggerCall = fireComplianceLoggerCall;
// export default pubmaticAdapter;
export { complianceAdapter as default };
