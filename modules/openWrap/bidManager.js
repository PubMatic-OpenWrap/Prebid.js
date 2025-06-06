import * as CONFIG from './config.js';
import * as CONSTANTS from './constants.js';
import * as util from './util.js';
// import * as  GDPR from "./gdpr.js");
import * as bmEntry from './bmEntry.js';

// const refThis = this;
// let storedObject;
// let frequencyDepth;
// const PREFIX = 'PROFILE_AUCTION_INFO_';

// const TRACKER_METHODS = {
//   img: 1,
//   js: 2,
//   1: 'img',
//   2: 'js'
// }

// const TRACKER_EVENTS = {
//   impression: 1,
//   'viewable-mrc50': 2,
//   'viewable-mrc100': 3,
//   'viewable-video50': 4,
// }

function createBidEntry(divID) { // TDD, i/o : done
  /* istanbul ignore else */
  if (!util.isOwnProperty(window.PWT.bidMap, divID)) {
    window.PWT.bidMap[divID] = bmEntry.createBMEntry(divID);
  }
}

/* start-test-block */
export { createBidEntry };

/* end-test-block */

export function setSizes(divID, slotSizes) { // TDD, i/o : done
  createBidEntry(divID);
  window.PWT.bidMap[divID].setSizes(slotSizes);
}

export function setCallInitTime(divID, adapterID) { // TDD, i/o : done
  createBidEntry(divID);
  window.PWT.bidMap[divID].setAdapterEntry(adapterID);
}

export function setAllPossibleBidsReceived(divID) {
  window.PWT.bidMap[divID].setAllPossibleBidsReceived();
}

export function setBidFromBidder(divID, bidDetails) { // TDD done
  const bidderID = bidDetails.getAdapterID();
  const bidMapEntry = window.PWT.bidMap[divID];
  /* istanbul ignore else */
  if (!util.isOwnProperty(window.PWT.bidMap, divID)) {
    util.logWarning(`BidManager is not expecting bid for ${divID}, from ${bidderID}`);
    return;
  }

  const isPostTimeout = (bidMapEntry.getCreationTime() + CONFIG.getTimeout()) < bidDetails.getReceivedTime();
  const latency = bidDetails.getReceivedTime() - bidMapEntry.getCreationTime();

  createBidEntry(divID);

  util.log(`BdManagerSetBid: divID: ${divID}, bidderID: ${bidderID}, ecpm: ${bidDetails.getGrossEcpm()}, size: ${bidDetails.getWidth()}x${bidDetails.getHeight()}, postTimeout: ${isPostTimeout}, defaultBid: ${bidDetails.getDefaultBidStatus()}`);
  /* istanbul ignore else */
  if (isPostTimeout === true /* && !bidDetails.isServerSide */) {
    bidDetails.setPostTimeoutStatus();
  }

  const lastBidID = bidMapEntry.getLastBidIDForAdapter(bidderID);
  if (lastBidID != '') {
    const lastBid = bidMapEntry.getBid(bidderID, lastBidID); // todo: what if the lastBid is null
    const lastBidWasDefaultBid = lastBid.getDefaultBidStatus() === 1;
    const lastBidWasErrorBid = lastBid.getDefaultBidStatus() === -1;

    if (lastBidWasDefaultBid || !isPostTimeout || lastBidWasErrorBid) {
      /* istanbul ignore else */
      if (lastBidWasDefaultBid) {
        util.log(CONSTANTS.MESSAGES.M23 + bidderID);
      }

      if (lastBidWasDefaultBid || lastBid.getNetEcpm() < bidDetails.getNetEcpm() || lastBidWasErrorBid) {
        util.log(CONSTANTS.MESSAGES.M12 + lastBid.getNetEcpm() + CONSTANTS.MESSAGES.M13 + bidDetails.getNetEcpm() + CONSTANTS.MESSAGES.M14 + bidderID);
        storeBidInBidMap(divID, bidderID, bidDetails, latency);
      } else {
        util.log(CONSTANTS.MESSAGES.M12 + lastBid.getNetEcpm() + CONSTANTS.MESSAGES.M15 + bidDetails.getNetEcpm() + CONSTANTS.MESSAGES.M16 + bidderID);
      }
    } else {
      util.log(CONSTANTS.MESSAGES.M17);
    }
  } else {
    util.log(CONSTANTS.MESSAGES.M18 + bidderID);
    storeBidInBidMap(divID, bidderID, bidDetails, latency);
  }
  if (isPostTimeout) {
    // explicitly trigger user syncs since its a post timeout bid
    setTimeout(window[CONSTANTS.COMMON.PREBID_NAMESPACE].triggerUserSyncs, 10);
  }
}

function storeBidInBidMap(slotID, adapterID, theBid, latency) { // TDD, i/o : done
  // Adding a hook for publishers to modify the bid we have to store
  // we should not call the hook for defaultbids and post-timeout bids
  // Here slotID, adapterID, and latency are read-only and theBid can be modified
  // if(theBid.getDefaultBidStatus() === 0 && theBid.getPostTimeoutStatus() === false){
  // util.handleHook(CONSTANTS.HOOKS.BID_RECEIVED, [slotID, adapterID, theBid, latency]);
  // }

  window.PWT.bidMap[slotID].setNewBid(adapterID, theBid);
  window.PWT.bidIdMap[theBid.getBidID()] = {
    s: slotID,
    a: adapterID
  };

  /* istanbul ignore else */
  if (theBid.getDefaultBidStatus() === 0 && theBid.adapterID !== 'pubmaticServer') {
    util.vLogInfo(slotID, {
      type: 'bid',
      bidder: adapterID + (CONFIG.getBidPassThroughStatus(adapterID) !== 0 ? '(Passthrough)' : ''),
      bidDetails: theBid,
      latency,
      s2s: CONFIG.isServerSideAdapter(adapterID),
      adServerCurrency: util.getCurrencyToDisplay()
    });
  }
}

/* start-test-block */
export { storeBidInBidMap };

/* end-test-block */

function resetBid(divID, impressionID) { // TDD, i/o : done
  util.vLogInfo(divID, { type: 'hr' });
  delete window.PWT.bidMap[divID];
  createBidEntry(divID);
  window.PWT.bidMap[divID].setImpressionID(impressionID);
}

/* start-test-block */
export { resetBid };

/* end-test-block */

// Returns property from localstorages slotlevel object
export function getSlotLevelFrequencyDepth(frequencyDepth, prop, adUnit) {
  let freqencyValue;
  if (Object.keys(frequencyDepth).length && frequencyDepth.slotLevelFrquencyDepth) {
    freqencyValue = frequencyDepth.slotLevelFrquencyDepth[adUnit] && frequencyDepth.slotLevelFrquencyDepth[adUnit][prop];
  }
  return freqencyValue;
}

/**
 * Prepare meta object to pass in logger call
 * @param {*} meta
 */
function getMetadata(meta) {
  if (!meta || util.isEmptyObject(meta)) return;
  const metaObj = {};
  if (meta.networkId) metaObj.nwid = meta.networkId;
  if (meta.advertiserId) metaObj.adid = meta.advertiserId;
  if (meta.networkName) metaObj.nwnm = meta.networkName;
  if (meta.primaryCatId) metaObj.pcid = meta.primaryCatId;
  if (meta.advertiserName) metaObj.adnm = meta.advertiserName;
  if (meta.agencyId) metaObj.agid = meta.agencyId;
  if (meta.agencyName) metaObj.agnm = meta.agencyName;
  if (meta.brandId) metaObj.brid = meta.brandId;
  if (meta.brandName) metaObj.brnm = meta.brandName;
  if (meta.dchain) metaObj.dc = meta.dchain;
  if (meta.demandSource) metaObj.ds = meta.demandSource;
  if (meta.secondaryCatIds) metaObj.scids = meta.secondaryCatIds;

  if (util.isEmptyObject(metaObj)) return;
  return metaObj;
}

export { getMetadata };

export function getAllPartnersBidStatuses(bidMaps, divIds) {
  let status = true;

  util.forEachOnArray(divIds, (key, divId) => {
    // OLD APPROACH: check if we have got bids per bidder for each slot
    // bidMaps[divId] && util.forEachOnObject(bidMaps[divId].adapters, function (adapterID, adapter) {
    //  util.forEachOnObject(adapter.bids, function (bidId, theBid) {
    //    status = status && (theBid.getDefaultBidStatus() === 0);
    //  });
    // });
    // NEW APPROACH: check allPossibleBidsReceived flag which is set when pbjs.requestBids->bidsBackHandler is executed
    if (bidMaps[divId]) {
      status = status && (bidMaps[divId].hasAllPossibleBidsReceived() === true);
    }
  });
  return status;
}

// removeIf(removeNativeRelatedCode)
function updateNativeTargtingKeys(keyValuePairs) {
  for (const key in keyValuePairs) {
    if (key.includes('native') && key.split('_').length === 3) {
      delete keyValuePairs[key];
    }
  }
}

// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeNativeRelatedCode)
/* start-test-block */
export { updateNativeTargtingKeys };
// endRemoveIf(removeNativeRelatedCode)

export const getBrowser = function() {
  const regExBrowsers = CONSTANTS.REGEX_BROWSERS;
  function matchBrowserPatterns(str) {
		if (!str) {
			return 0;
		}
		for (let i = 0; i < regExBrowsers.length; i++) {
			if (regExBrowsers[i].regex.test(str)) {
				return regExBrowsers[i].id;
      }
    }
    return 0;
  }
  return function getBrowser() {
		const nav = (typeof window !== 'undefined' && window.navigator) || {};
		const brands = nav.userAgentData && nav.userAgentData.brands;
		
		if (brands && brands.length) {
			const brandString = brands.reduce((a, b) => {
				return a + (b.brand || '').toLowerCase() + ' ';
			}, '').trim();
			const result = matchBrowserPatterns(brandString);
			if (result) return result;
		}

		const result = matchBrowserPatterns(nav.userAgent);
		return result;
	};
}();

// removeIf(removeNativeRelatedCode)
// this function generates all satndard key-value pairs for a given bid and setup, set these key-value pairs in an object
// todo: write unit test cases
export function loadTrackers(event) {
  const bidId = util.getBidFromEvent(event);
  window.parent.postMessage(
    JSON.stringify({
      pwt_type: '3',
      pwt_bidID: bidId,
      pwt_origin: CONSTANTS.COMMON.PROTOCOL + window.location.hostname,
      pwt_action: 'click'
    }),
    '*'
  );
}

// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeNativeRelatedCode)
/**
 * function takes bidID and post a message to parent pwt.js to execute monetization pixels.
 * @param {*} bidID
 */
export function executeTracker(bidID) {
  window.parent.postMessage(
    JSON.stringify({
      pwt_type: '3',
      pwt_bidID: bidID,
      pwt_origin: CONSTANTS.COMMON.PROTOCOL + window.location.hostname,
      pwt_action: 'imptrackers'
    }),
    '*'
  );
}
