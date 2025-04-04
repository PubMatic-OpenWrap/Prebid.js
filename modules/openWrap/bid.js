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
  setDefaultBidStatus(status) {
    this.defaultBid = status;
    return this;
  }

  getDefaultBidStatus() {
    return this.defaultBid;
  }

  getGrossEcpm(forAnalytics) {
    // Check config if currency module is enabled.
    if (CONFIG.getAdServerCurrency() && this.analyticsGrossCpm && forAnalytics) {
      return this.analyticsGrossCpm;
    }
    return this.grossEcpm;
  }
  
  getNetEcpm(forAnalytics) {
    if (CONFIG.getAdServerCurrency() && this.analyticsNetCpm && forAnalytics) {
      return this.analyticsNetCpm;
    }
    return this.netEcpm;
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
