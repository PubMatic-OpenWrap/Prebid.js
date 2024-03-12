// import * as util from './util.js';
// import * as controller from './controllers/custom.js';
// import * as bidManager from './bidManager.js';
// import * as CONSTANTS from './constants.js';
// import * as CONFIG from './config.js';
// import * as conf from './conf.js';
// const metaInfo = util.getMetaInfo(window);
// window.PWT = window.PWT || {};
// window.PWT.bidMap = window.PWT.bidMap || {};
// window.PWT.bidIdMap = window.PWT.bidIdMap || {};
// window.PWT.adUnits = window.PWT.adUnits || {};
// window.PWT.floorData = window.PWT.floorData || {};
// window.PWT.isIframe = window.PWT.isIframe || metaInfo.isInIframe;
// window.PWT.protocol = window.PWT.protocol || metaInfo.protocol;
// window.PWT.secure = window.PWT.secure || metaInfo.secure;
// window.PWT.pageURL = window.PWT.pageURL || metaInfo.pageURL;
// window.PWT.refURL = window.PWT.refURL || metaInfo.refURL;
// window.PWT.isSafeFrame = window.PWT.isSafeFrame || false;
// window.PWT.safeFrameMessageListenerAdded = window.PWT.safeFrameMessageListenerAdded || false;
// window.PWT.isSyncAuction = window.PWT.isSyncAuction || false;
// // usingDifferentProfileVersion
// window.PWT.udpv = window.PWT.udpv || util.findQueryParamInURL(metaInfo.isIframe ? metaInfo.refURL : metaInfo.pageURL, 'pwtv');

import { module } from "../../src/hook";

// util.findQueryParamInURL(metaInfo.isIframe ? metaInfo.refURL : metaInfo.pageURL, 'pwtc') && util.enableDebugLog();
// util.findQueryParamInURL(metaInfo.isIframe ? metaInfo.refURL : metaInfo.pageURL, 'pwtvc') && util.enableVisualDebugLog();

// const isPrebidPubMaticAnalyticsEnabled = CONFIG.isPrebidPubMaticAnalyticsEnabled();

// window.PWT.displayCreative = (theDocument, bidID) => {
//   util.log(`In displayCreative for: ${bidID}`);
//   if (isPrebidPubMaticAnalyticsEnabled) {
//     window[CONSTANTS.COMMON.PREBID_NAMESPACE].renderAd(theDocument, bidID);
//   } else {
//     // removeIf(removeLegacyAnalyticsRelatedCode)
//     bidManager.displayCreative(theDocument, bidID);
//     // endRemoveIf(removeLegacyAnalyticsRelatedCode)
//   }
// };

// window.PWT.displayPMPCreative = (theDocument, values, priorityArray) => {
//   util.log(`In displayPMPCreative for: ${values}`);
//   const bidID = util.getBididForPMP(values, priorityArray);
//   if (bidID) {
//     if (isPrebidPubMaticAnalyticsEnabled) {
//       window[CONSTANTS.COMMON.PREBID_NAMESPACE].renderAd(theDocument, bidID);
//     } else {
//       // removeIf(removeLegacyAnalyticsRelatedCode)
//       bidManager.displayCreative(theDocument, bidID);
//       // endRemoveIf(removeLegacyAnalyticsRelatedCode)
//     }
//   }
// };

// window.PWT.sfDisplayPMPCreative = function(theDocument, values, priorityArray) {
//   util.log(`In sfDisplayPMPCreative for: ${values}`);
//   this.isSafeFrame = true;
//   const bidID = util.getBididForPMP(values, priorityArray);
//   if (bidID) {
//     if (CONFIG.isPrebidPubMaticAnalyticsEnabled()) {
//       // ucTag.renderAd(theDocument, {adId: bidID, pubUrl: document.referrer});
//     } else {
//       window.parent.postMessage(
//         JSON.stringify({
//           pwt_type: '1',
//           pwt_bidID: bidID,
//           pwt_origin: CONSTANTS.COMMON.PROTOCOL + window.location.hostname
//         }),
//         '*'
//       );
//     }
//   }
// };

// // removeIf(removeNativeRelatedCode)
// window.PWT.initNativeTrackers = (theDocument, bidID) => {
//   util.log(`In startTrackers for: ${bidID}`);
//   util.addEventListenerForClass(window, 'click', CONSTANTS.COMMON.OW_CLICK_NATIVE, bidManager.loadTrackers);
//   bidManager.executeTracker(bidID);
// };
// // endRemoveIf(removeNativeRelatedCode)

// window.PWT.getUserIds = () => {
//   return util.getUserIds();
// };

// window.OWT = {
//   notifyCount: 0, // To maintain the id which should be return after externalBidder registered
//   externalBidderStatuses: {}
// };

// window.OWT.registerExternalBidders = divIds => {
//   window.OWT.notifyCount++;

//   util.forEachOnArray(divIds, (key, divId) => {
//     util.log(`registerExternalBidders: ${divId}`);
//     window.OWT.externalBidderStatuses[divId] = {
//       id: window.OWT.notifyCount,
//       status: false
//     };
//   });

//   return window.OWT.notifyCount;
// };

// window.OWT.notifyExternalBiddingComplete = notifyId => {
//   util.forEachOnObject(window.OWT.externalBidderStatuses, (key, obj) => {
//     if (obj && (obj.id === notifyId)) {
//       util.log(`notify externalBidding complete: ${key}`);
//       window.OWT.externalBidderStatuses[key] = {
//         id: obj.id,
//         status: true
//       };
//     }
//   });
// };

// // removeIf(removeLegacyAnalyticsRelatedCode)
// window.PWT.UpdateVastWithTracker = (bid, vast) => {
//   return util.UpdateVastWithTracker(bid, vast);
// };
// // endRemoveIf(removeLegacyAnalyticsRelatedCode)

// // removeIf(removeInStreamRelatedCode)
// window.PWT.generateDFPURL = (adUnit, cust_params) => {
//   let dfpurl = '';
//   if (!adUnit || !util.isObject(adUnit)) {
//     util.logError('An AdUnit should be an Object', adUnit);
//   }
//   if (adUnit.bidData && adUnit.bidData.wb && adUnit.bidData.kvp) {
//     adUnit.bid = adUnit.bidData.wb;
//     adUnit.bid['adserverTargeting'] = adUnit.bidData.kvp;
//   } else {
//     util.logWarning('No bid found for given adUnit');
//   }
//   const params = {
//     adUnit,
//     params: {
//       iu: adUnit.adUnitId,
//       cust_params,
//       output: 'vast'
//     }
//   };
//   if (adUnit.bid) {
//     params['bid'] = adUnit.bid;
//   }
//   dfpurl = window.owpbjs.adServers.dfp.buildVideoUrl(params);
//   return dfpurl;
// };
// // endRemoveIf(removeInStreamRelatedCode)

// // removeIf(removeInStreamRelatedCode)
// window.PWT.getCustomParamsForDFPVideo = (customParams, bid) => {
//   return util.getCustomParamsForDFPVideo(customParams, bid);
// };
// // endRemoveIf(removeInStreamRelatedCode)

// window.PWT.setAuctionTimeout = timeout => {
//   if (!isNaN(timeout)) {
//     util.log(`updating aution timeout from: ${conf.pwt.t} to: ${timeout}`);
//     conf.pwt.t = timeout;
//   }
// }

// window.PWT.versionDetails = util.getOWConfig();

// window.PWT.getAdapterNameForAlias = CONFIG.getAdapterNameForAlias;

// window.PWT.browserMapping = bidManager.getBrowser();

// controller.init(window);


// import * as owt from './owt.js';
// import * as config from './conf.js';

// var controller = null;
// switch (config.pwt.adserver) {
//   case "DFP":
//     controller = require('./controllers/gpt.js');
//     break;
//   case "CUSTOM":
//     controller = require('./controllers/custom.js');
//     break;
//   case "IDHUB":
//     controller = require('./controllers/idhub.js');
//     break;
//   default:
//       console.log("Please provide the AdServer values one of (DFP, CUSTOM, IDHUB)");
//     break;
// }

// owt.init();
// controller.init(window);

import * as owt from './owt.js';

import * as CONFIG from './config.js';
import * as CONSTANTS from './constants.js';
import * as util from './util.js';
import * as bidManager from './bidManager.js';
import * as SLOT from './slot.js';
import * as prebid from './adapters/prebid.js';
import * as IdHub from './controllers/idhub.js';

import { isPlainObject, logError } from '../../src/utils.js';

const sharedMethods = {
  "owtInit": owt.init,
  "CONFIG": CONFIG,
  "CONSTANTS": CONSTANTS,
  "util": util,
  "bidManager": bidManager,
  "SLOT": SLOT,
  "prebid": prebid,
  "IdHub": IdHub
}

Object.freeze(sharedMethods);

module('openWrap', function shareOwUtilities(...args) {
  if (!isPlainObject(args[0])) {
    logError('OW module needs plain object to share methods with submodule');
    return;
  }
  function addMethods(object, func) {
    for (let name in func) {
      object[name] = func[name];
    }
  }
  addMethods(args[0], sharedMethods);
});
