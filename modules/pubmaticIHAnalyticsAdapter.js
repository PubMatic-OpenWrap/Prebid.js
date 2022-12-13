import { logError, logInfo } from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';

/// /////////// CONSTANTS //////////////
const ADAPTER_CODE = 'pubmaticIH';
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl?';
const LOG_PRE_FIX = 'PubMatic-Identity-Analytics: ';

// todo: input profileId and profileVersionId ; defaults to zero or one
const enc = window.encodeURIComponent;
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const DEFAULT_IDENTITY_ONLY = '0';

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional
let identityOnly = DEFAULT_IDENTITY_ONLY;

/// /////////// HELPER FUNCTIONS //////////////

/**
 * Prepare meta object to pass in logger call
 * @param {*} meta
 */
function getMetadata(meta) {
  return {};
}

function executeIHLoggerCall() {
  let pixelURL = END_POINT_BID_LOGGER;
  let outputObj = {};
  outputObj['pubid'] = '' + publisherId;
  outputObj['pid'] = '' + profileId;
  outputObj['pdvid'] = '' + profileVersionId;
  outputObj['ih'] = identityOnly;

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
let pubmaticIHAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(conf = {}) {
    let error = false;

    if (typeof conf.options === 'object') {
      if (conf.options.publisherId) {
        publisherId = Number(conf.options.publisherId);
      }
      profileId = Number(conf.options.profileId) || 0;
      profileVersionId = Number(conf.options.profileVersionId) || 0;
      identityOnly = conf.options.identityOnly;
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
    eventType
  }) {
    switch (eventType) {
      case CONSTANTS.EVENTS.IH_INIT:
        logInfo('IHANALYTICS Logger fired')
        executeIHLoggerCall();
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: pubmaticIHAdapter,
  code: ADAPTER_CODE
});

// export default pubmaticAdapter;
export { pubmaticIHAdapter as default, getMetadata };
