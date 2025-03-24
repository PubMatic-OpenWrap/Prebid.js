import * as CONFIG from './config.js';
import * as CONSTANTS from './constants.js';
import * as UTIL from './util.js';

class Bid {
  constructor(adapterID, kgpv) {
    this.adapterID = adapterID;
    this.kgpv = kgpv;
    this.bidID = UTIL.getUniqueIdentifierStr();
    this.grossEcpm = 0; // one given by bidder
    this.netEcpm = 0; // one after bid adjustment
    this.defaultBid = 0;
    this.adHtml = '';
    this.adUrl = '';
    this.height = 0;
    this.width = 0;
    this.creativeID = ''; // todo, is it needed ?
    this.keyValuePairs = {};
    this.isPostTimeout = false;
    this.receivedTime = 0;
    this.isServerSide = CONFIG.isServerSideAdapter(adapterID) ? 1 : 0;
    this.dealID = '';
    this.dealChannel = '';
    this.isWinningBid = false;
    this.status = 0;
    this.serverSideResponseTime = 0;
    this.mi = undefined;
    this.originalCpm = 0;
    this.originalCurrency = '';
    this.analyticsGrossCpm = 0;
    this.analyticsNetCpm = 0;
    this.native = undefined;
    this.adFormat = undefined;
    this.regexPattern = undefined;
    this.cacheUUID = undefined;
    this.sspID = '';
    this.vastUrl = undefined;
    this.vastCache = undefined;
    this.renderer = undefined;
    this.pbBid = undefined;
  }

  getAdapterID() {
    return this.adapterID;
  }

  getBidID() {
    return this.bidID;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)
  setGrossEcpm(ecpm, origCurrency, displayCurrency, bidStatus) {
    /* istanbul ignore else */
    if (ecpm === null) {
      UTIL.log(CONSTANTS.MESSAGES.M10);
      UTIL.log(this);
      return this;
    }
    /* istanbul ignore else */
    if (UTIL.isString(ecpm)) {
      ecpm = ecpm.replace(/\s/g, '');
      /* istanbul ignore else */
      if (ecpm.length === 0) {
        UTIL.log(CONSTANTS.MESSAGES.M20);
        UTIL.log(this);
        return this;
      }
      ecpm = window.parseFloat(ecpm);
    }

    /* istanbul ignore else */
    if (window.isNaN(ecpm)) {
      UTIL.log(CONSTANTS.MESSAGES.M11 + ecpm);
      UTIL.log(this);
      return this;
    }

    if (CONFIG.getAdServerCurrency() && origCurrency && displayCurrency && (UTIL.isFunction(window[CONSTANTS.COMMON.PREBID_NAMESPACE].convertCurrency) || typeof window[CONSTANTS.COMMON.PREBID_NAMESPACE].convertCurrency == 'function')) {
      ecpm = window[CONSTANTS.COMMON.PREBID_NAMESPACE].convertCurrency(ecpm, origCurrency, displayCurrency)
    }

    ecpm = window.parseFloat(ecpm.toFixed(CONSTANTS.COMMON.BID_PRECISION));

    this.grossEcpm = ecpm;
    this.netEcpm = bidStatus == CONSTANTS.BID_STATUS.BID_REJECTED ? 0 : getNetECPM(this.grossEcpm, this.getAdapterID());

    return this;
  }

  getHeight() {
    return this.height;
  }

  getWidth() {
    return this.width;
  }

  setPostTimeoutStatus() {
    this.isPostTimeout = true;
    return this;
  }

  getPostTimeoutStatus() {
    return this.isPostTimeout;
  }

  setReceivedTime(receivedTime) {
    this.receivedTime = receivedTime;
    return this;
  }

  getReceivedTime() {
    return this.receivedTime;
  }

  setRegexPattern(pattern) {
    this.regexPattern = pattern;
    return this;
  }
}

  /* start-test-block */
export {Bid};

/* end-test-block */

export function createBid(adapterID, kgpv) {
  return new Bid(adapterID, kgpv);
}

// todo:
// add validations
