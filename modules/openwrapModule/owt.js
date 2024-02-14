import * as util from './util.js';
import * as bidManager from './bidManager.js';
import * as CONSTANTS from './constants.js';
import * as CONFIG from './config.js';
import * as conf from './conf.js';
const metaInfo = util.getMetaInfo(window);

window.PWT = window.PWT || {};
window.PWT.bidMap = window.PWT.bidMap || {};
window.PWT.bidIdMap = window.PWT.bidIdMap || {};
window.PWT.adUnits = window.PWT.adUnits || {};
window.PWT.floorData = window.PWT.floorData || {};
window.PWT.isIframe = window.PWT.isIframe || metaInfo.isInIframe;
window.PWT.protocol = window.PWT.protocol || metaInfo.protocol;
window.PWT.secure = window.PWT.secure || metaInfo.secure;
window.PWT.pageURL = window.PWT.pageURL || metaInfo.pageURL;
window.PWT.refURL = window.PWT.refURL || metaInfo.refURL;
window.PWT.isSafeFrame = window.PWT.isSafeFrame || false;
window.PWT.safeFrameMessageListenerAdded = window.PWT.safeFrameMessageListenerAdded || false;
window.PWT.isSyncAuction = window.PWT.isSyncAuction || false;
// usingDifferentProfileVersion
window.PWT.udpv = window.PWT.udpv || util.findQueryParamInURL(metaInfo.isIframe ? metaInfo.refURL : metaInfo.pageURL, 'pwtv');

util.findQueryParamInURL(metaInfo.isIframe ? metaInfo.refURL : metaInfo.pageURL, 'pwtc') && util.enableDebugLog();
util.findQueryParamInURL(metaInfo.isIframe ? metaInfo.refURL : metaInfo.pageURL, 'pwtvc') && util.enableVisualDebugLog();

var isPrebidPubMaticAnalyticsEnabled = CONFIG.isPrebidPubMaticAnalyticsEnabled();

window.PWT.displayCreative = function(theDocument, bidID) {
  util.log('In displayCreative for: ' + bidID);
  if (isPrebidPubMaticAnalyticsEnabled) {
    window[CONSTANTS.COMMON.PREBID_NAMESPACE].renderAd(theDocument, bidID);
  } else {
    // removeIf(removeLegacyAnalyticsRelatedCode)
    bidManager.displayCreative(theDocument, bidID);
    // endRemoveIf(removeLegacyAnalyticsRelatedCode)
  }
};

window.PWT.displayPMPCreative = function(theDocument, values, priorityArray) {
  util.log('In displayPMPCreative for: ' + values);
  var bidID = util.getBididForPMP(values, priorityArray);
  if (bidID) {
    if (isPrebidPubMaticAnalyticsEnabled) {
      window[CONSTANTS.COMMON.PREBID_NAMESPACE].renderAd(theDocument, bidID);
    } else {
      // removeIf(removeLegacyAnalyticsRelatedCode)
      bidManager.displayCreative(theDocument, bidID);
      // endRemoveIf(removeLegacyAnalyticsRelatedCode)
    }
  }
};

window.PWT.sfDisplayCreative = function(theDocument, bidID) {
  util.log('In sfDisplayCreative for: ' + bidID);
  var ucTag = window.ucTag || {};
  this.isSafeFrame = true;
  ucTag = window.ucTag || {};
  if (isPrebidPubMaticAnalyticsEnabled) {
    ucTag.renderAd(theDocument, {adId: bidID, pubUrl: document.referrer});
  } else {
    window.parent.postMessage(
      JSON.stringify({
        pwt_type: '1',
        pwt_bidID: bidID,
        pwt_origin: CONSTANTS.COMMON.PROTOCOL + window.location.hostname
      }),
      '*'
    );
  }
};

window.PWT.sfDisplayPMPCreative = function(theDocument, values, priorityArray) {
  util.log('In sfDisplayPMPCreative for: ' + values);
  this.isSafeFrame = true;
  var ucTag = window.ucTag || {};
  var bidID = util.getBididForPMP(values, priorityArray);
  if (bidID) {
    if (CONFIG.isPrebidPubMaticAnalyticsEnabled()) {
      ucTag.renderAd(theDocument, {adId: bidID, pubUrl: document.referrer});
    } else {
      window.parent.postMessage(
        JSON.stringify({
          pwt_type: '1',
          pwt_bidID: bidID,
          pwt_origin: CONSTANTS.COMMON.PROTOCOL + window.location.hostname
        }),
        '*'
      );
    }
  }
};

// removeIf(removeNativeRelatedCode)
window.PWT.initNativeTrackers = function(theDocument, bidID) {
  util.log('In startTrackers for: ' + bidID);
  util.addEventListenerForClass(window, 'click', CONSTANTS.COMMON.OW_CLICK_NATIVE, bidManager.loadTrackers);
  bidManager.executeTracker(bidID);
};
// endRemoveIf(removeNativeRelatedCode)

window.PWT.getUserIds = function() {
  return util.getUserIds();
};

window.OWT = {
  notifyCount: 0, // To maintain the id which should be return after externalBidder registered
  externalBidderStatuses: {}
};

window.OWT.registerExternalBidders = function(divIds) {
  window.OWT.notifyCount++;

  util.forEachOnArray(divIds, function (key, divId) {
    util.log('registerExternalBidders: ' + divId);
    window.OWT.externalBidderStatuses[divId] = {
      id: window.OWT.notifyCount,
      status: false
    };
  });

  return window.OWT.notifyCount;
};

window.OWT.notifyExternalBiddingComplete = function(notifyId) {
  util.forEachOnObject(window.OWT.externalBidderStatuses, function (key, obj) {
    if (obj && (obj.id === notifyId)) {
      util.log('notify externalBidding complete: ' + key);
      window.OWT.externalBidderStatuses[key] = {
        id: obj.id,
        status: true
      };
    }
  });
};

// removeIf(removeLegacyAnalyticsRelatedCode)
window.PWT.UpdateVastWithTracker = function(bid, vast) {
  return util.UpdateVastWithTracker(bid, vast);
};
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeInStreamRelatedCode)
window.PWT.generateDFPURL = function(adUnit, custParams) {
  var dfpurl = '';
  if (!adUnit || !util.isObject(adUnit)) {
    util.logError('An AdUnit should be an Object', adUnit);
  }
  if (adUnit.bidData && adUnit.bidData.wb && adUnit.bidData.kvp) {
    adUnit.bid = adUnit.bidData.wb;
    adUnit.bid['adserverTargeting'] = adUnit.bidData.kvp;
  } else {
    util.logWarning('No bid found for given adUnit');
  }
  var params = {
    adUnit: adUnit,
    params: {
      iu: adUnit.adUnitId,
      custParams: custParams,
      output: 'vast'
    }
  };
  if (adUnit.bid) {
    params['bid'] = adUnit.bid;
  }
  dfpurl = window.owpbjs.adServers.dfp.buildVideoUrl(params);
  return dfpurl;
};
// endRemoveIf(removeInStreamRelatedCode)

// removeIf(removeInStreamRelatedCode)
window.PWT.getCustomParamsForDFPVideo = function(customParams, bid) {
  return util.getCustomParamsForDFPVideo(customParams, bid);
};
// endRemoveIf(removeInStreamRelatedCode)

window.PWT.setAuctionTimeout = function(timeout) {
  if (!isNaN(timeout)) {
    util.log('updating aution timeout from: ' + conf.pwt.t + ' to: ' + timeout);
    conf.pwt.t = timeout;
  }
}

window.PWT.versionDetails = util.getOWConfig();

window.PWT.getAdapterNameForAlias = CONFIG.getAdapterNameForAlias;

window.PWT.browserMapping = bidManager.getBrowser();

export function init() {

}