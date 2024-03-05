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

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setServerSideResponseTime(ssResponseTime) {
    this.serverSideResponseTime = ssResponseTime;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getServerSideResponseTime() {
    return this.serverSideResponseTime;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getServerSideStatus() {
    return this.isServerSide;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  setServerSideStatus(isServerSide) {
    this.isServerSide = isServerSide;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

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

  // removeIf(removeLegacyAnalyticsRelatedCode)

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

  setDefaultBidStatus(status) {
    this.defaultBid = status;
    return this;
  }

  getDefaultBidStatus() {
    return this.defaultBid;
  }

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setAdHtml(adHtml) {
    this.adHtml = adHtml;
    this.setAdFormat(adHtml);
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getAdHtml() {
    return this.adHtml;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setAdUrl(adUrl) {
    this.adUrl = adUrl;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getAdUrl() {
    return this.adUrl;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setHeight(height) {
    this.height = height;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  getHeight() {
    return this.height;
  }

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setWidth(width) {
    this.width = width;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  getWidth() {
    return this.width;
  }

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getKGPV(isActualValueRequired, mediaType) {
    if (!isActualValueRequired && this.regexPattern) {
      return this.regexPattern;
    }
    if (this.adFormat == CONSTANTS.FORMAT_VALUES.VIDEO || mediaType == CONSTANTS.FORMAT_VALUES.VIDEO) {
      return UTIL.getUpdatedKGPVForVideo(this.kgpv, CONSTANTS.FORMAT_VALUES.VIDEO);
    }
    return this.kgpv;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setKeyValuePair(key, value) {
    // max length of key is restricted to 20 characters
    this.keyValuePairs[key.substr(0, 20)] = value;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getKeyValuePairs() {
    return this.keyValuePairs;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

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

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setDealID(dealID) {
    /* istanbul ignore else */
    if (dealID) {
      this.dealID = dealID;
      this.dealChannel = this.dealChannel || 'PMP';
      this.setKeyValuePair(
        CONSTANTS.COMMON.DEAL_KEY_FIRST_PART + this.adapterID,
        this.dealChannel + CONSTANTS.COMMON.DEAL_KEY_VALUE_SEPARATOR + this.dealID + CONSTANTS.COMMON.DEAL_KEY_VALUE_SEPARATOR + this.bidID
      );
    }
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getDealID() {
    return this.dealID;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setDealChannel(dealChannel) {
    /* istanbul ignore else */
    if (this.dealID && dealChannel) {
      this.dealChannel = dealChannel;
      this.setKeyValuePair(
        CONSTANTS.COMMON.DEAL_KEY_FIRST_PART + this.adapterID,
        this.dealChannel + CONSTANTS.COMMON.DEAL_KEY_VALUE_SEPARATOR + this.dealID + CONSTANTS.COMMON.DEAL_KEY_VALUE_SEPARATOR + this.bidID
      );
    }
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getDealChannel() {
    return this.dealChannel;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setWinningBidStatus() {
    this.isWinningBid = true;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getWinningBidStatus() {
    return this.isWinningBid;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setStatus(status) {
    this.status = status;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getStatus() {
    return this.status;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setSendAllBidsKeys() {
    this.setKeyValuePair(`${CONSTANTS.WRAPPER_TARGETING_KEYS.BID_ID}_${this.adapterID}`, this.bidID);
    this.setKeyValuePair(`${CONSTANTS.WRAPPER_TARGETING_KEYS.BID_STATUS}_${this.adapterID}`, this.getNetEcpm() > 0 ? 1 : 0);
    this.setKeyValuePair(`${CONSTANTS.WRAPPER_TARGETING_KEYS.BID_ECPM}_${this.adapterID}`, this.getNetEcpm().toFixed(CONSTANTS.COMMON.BID_PRECISION));
    this.setKeyValuePair(`${CONSTANTS.WRAPPER_TARGETING_KEYS.BID_SIZE}_${this.adapterID}`, `${this.width}x${this.height}`);
    if (this.native) {
      const keyValues = this.keyValuePairs;
      const globalThis = this;
      UTIL.forEachOnObject(keyValues, (key, value) => {
        if (key.includes('native')) {
          globalThis.setKeyValuePair(`${key}_${globalThis.adapterID}`, value);
        }
      });
    }
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setMi(mi) {
    this.mi = mi;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getMi(partnerName) {
    if (UTIL.isUndefined(this.mi)) {
      this.mi = window.matchedimpressions && window.matchedimpressions[partnerName];
    }
    return this.mi;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setOriginalCpm(originalCpm) {
    this.originalCpm = window.parseFloat(originalCpm.toFixed(CONSTANTS.COMMON.BID_PRECISION));
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getOriginalCpm() {
    return this.originalCpm;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setOriginalCurrency(originalCurrency) {
    this.originalCurrency = originalCurrency;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getOriginalCurrency() {
    return this.originalCurrency;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setAnalyticsCpm(analyticsCpm, bidStatus) {
    this.analyticsGrossCpm = window.parseFloat(analyticsCpm.toFixed(CONSTANTS.COMMON.BID_PRECISION));
    this.analyticsNetCpm = bidStatus == CONSTANTS.BID_STATUS.BID_REJECTED ? 0 : getNetECPM(this.analyticsGrossCpm, this.getAdapterID());
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getAnalyticsCpm() {
    return this.analyticsGrossCpm;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getNative() {
    return this.native;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setNative(native) {
    this.native = native;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getAdFormat() {
    return this.adFormat;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setAdFormat(ad, format) {
    this.adFormat = format || UTIL.getAdFormatFromBidAd(ad);
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getRegexPattern() {
    return this.regexPattern;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  setRegexPattern(pattern) {
    this.regexPattern = pattern;
    return this;
  }

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getcacheUUID() {
    return this.cacheUUID;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setcacheUUID(cacheUUID) {
    this.cacheUUID = cacheUUID;
    if (!this.adFormat) {
      this.adFormat = CONSTANTS.FORMAT_VALUES.VIDEO;
    }
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getsspID() {
    return this.sspID;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setsspID(sspID) {
    this.sspID = sspID;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setRenderer(renderer) {
    if (!UTIL.isEmptyObject(renderer)) {
      this.renderer = renderer;
    }
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getRenderer() {
    return this.renderer;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setVastCache(vastCache) {
    if (UTIL.isString(vastCache)) {
      this.vastCache = vastCache;
    }
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getVastCache() {
    return this.vastCache;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setVastUrl(vastUrl) {
    if (UTIL.isString(vastUrl)) {
      this.vastUrl = vastUrl;
    }
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getVastUrl() {
    return this.vastUrl;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  setVastXml(xml) {
    if (UTIL.isString(xml)) {
      this.vastXml = xml;
    }
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // should be always removed; not in use at all
  getVastXml() {
    return this.vastXml;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  setPbBid(pbbid) {
    this.pbbid = pbbid;
    return this;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  getPbBid() {
    return this.pbbid;
  }

  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // removeIf(removeLegacyAnalyticsRelatedCode)
  // This function is used to update the bid in case of video bid
  // this should only be called if bid is video so that there is no discrepancy in tracker and logger for bid Id
  updateBidId(slotID) {
    if (window.PWT.bidMap[slotID] && window.PWT.bidMap[slotID].adapters && Object.keys(window.PWT.bidMap[slotID].adapters).length > 0) {
      const bidId = window.PWT.bidMap[slotID].adapters[this.adapterID].bids[Object.keys(window.PWT.bidMap[slotID].adapters[this.adapterID].bids)[0]].bidID;
      if (bidId && this.adFormat == CONSTANTS.FORMAT_VALUES.VIDEO) {
        this.bidID = bidId;
      }
    } else {
      UTIL.logWarning('Error in Updating BidId. It might be possible singleImpressionEnabled is false');
      console.warn('Setup for video might not be correct. Try setting up Optimize MultiSize AdSlot to true.'); // eslint-disable-line no-console
    }
    return this;
  }
}

var getNetECPM = (grossEcpm, adapterID) => {
  return window.parseFloat((grossEcpm * CONFIG.getAdapterRevShare(adapterID)).toFixed(CONSTANTS.COMMON.BID_PRECISION));
};

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

/* start-test-block */
export {Bid};

/* end-test-block */

export function createBid(adapterID, kgpv) {
  return new Bid(adapterID, kgpv);
}

// todo:
// add validations
