import * as CONFIG from './config.js';
import * as CONSTANTS from './constants.js';
import * as util from './util.js';
// import * as  GDPR from "./gdpr.js");
import * as bmEntry from './bmEntry.js';

const refThis = this;
let storedObject;
let frequencyDepth;
const PREFIX = 'PROFILE_AUCTION_INFO_';

const TRACKER_METHODS = {
  img: 1,
  js: 2,
  1: 'img',
  2: 'js'
}

const TRACKER_EVENTS = {
  impression: 1,
  'viewable-mrc50': 2,
  'viewable-mrc100': 3,
  'viewable-video50': 4,
}

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
  refThis.createBidEntry(divID);
  window.PWT.bidMap[divID].setSizes(slotSizes);
}

export function setCallInitTime(divID, adapterID) { // TDD, i/o : done
  refThis.createBidEntry(divID);
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

  refThis.createBidEntry(divID);

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
        refThis.storeBidInBidMap(divID, bidderID, bidDetails, latency);
      } else {
        util.log(CONSTANTS.MESSAGES.M12 + lastBid.getNetEcpm() + CONSTANTS.MESSAGES.M15 + bidDetails.getNetEcpm() + CONSTANTS.MESSAGES.M16 + bidderID);
      }
    } else {
      util.log(CONSTANTS.MESSAGES.M17);
    }
  } else {
    util.log(CONSTANTS.MESSAGES.M18 + bidderID);
    refThis.storeBidInBidMap(divID, bidderID, bidDetails, latency);
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
  refThis.createBidEntry(divID);
  window.PWT.bidMap[divID].setImpressionID(impressionID);
}

/* start-test-block */
export { resetBid };

/* end-test-block */

// removeIf(removeLegacyAnalyticsRelatedCode)
function createMetaDataKey(pattern, { adapters }, keyValuePairs) {
  let output = '';
  let validBidCount = 0;
  let partnerCount = 0;
  const macros = CONSTANTS.METADATA_MACROS;
  const macroRegexFlag = 'g';

  util.forEachOnObject(adapters, (adapterID, adapterEntry) => {
    if (adapterEntry.getLastBidID() != '') {
      // If pubmaticServerBidAdapter then don't increase partnerCount
      (adapterID !== 'pubmaticServer') && partnerCount++;
      util.forEachOnObject(adapterEntry.bids, (bidID, theBid) => {
        // Description-> adapterID == "pubmatic" && theBid.netEcpm == 0 this check is put because from pubmaticBidAdapter in prebid we are
        // passing zero bid when there are no bid under timout for latency reports and this caused issue to have zero bids in pwtm key
        // so put this check which will not log zero bids for pubmatic. Note : From prebid 1.x onwards we do not get zero bids in case of no bids.
        if (theBid.getDefaultBidStatus() == 1 || theBid.getPostTimeoutStatus() == 1 || theBid.getGrossEcpm() == 0) {
          return;
        }
        validBidCount++;
        output += replaceMetaDataMacros(pattern, theBid);
      });
    }
  });

  if (output.length == 0) {
    output = pattern;
  }
  output = output.replace(new RegExp(macros.BID_COUNT, macroRegexFlag), validBidCount);
  output = output.replace(new RegExp(macros.PARTNER_COUNT, macroRegexFlag), partnerCount);
  keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.META_DATA] = encodeURIComponent(output);
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { createMetaDataKey };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function replaceMetaDataMacros(pattern, theBid) {
  const macros = CONSTANTS.METADATA_MACROS;
  const macroRegexFlag = 'g';
  return pattern
    .replace(new RegExp(macros.PARTNER, macroRegexFlag), theBid.getAdapterID())
    .replace(new RegExp(macros.WIDTH, macroRegexFlag), theBid.getWidth())
    .replace(new RegExp(macros.HEIGHT, macroRegexFlag), theBid.getHeight())
    .replace(new RegExp(macros.GROSS_ECPM, macroRegexFlag), theBid.getGrossEcpm())
    .replace(new RegExp(macros.NET_ECPM, macroRegexFlag), theBid.getNetEcpm());
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { replaceMetaDataMacros };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function auctionBids(bmEntry) { // TDD, i/o : done
  let winningBid = null;
  let keyValuePairs = {};

  util.forEachOnObject(bmEntry.adapters, (adapterID, adapterEntry) => {
    const obj = refThis.auctionBidsCallBack(adapterID, adapterEntry, keyValuePairs, winningBid);
    winningBid = obj.winningBid;
    keyValuePairs = obj.keyValuePairs;
  });

  // removeIf(removeLegacyAnalyticsRelatedCode)
  if (CONFIG.getMataDataPattern() !== null) {
    createMetaDataKey(CONFIG.getMataDataPattern(), bmEntry, keyValuePairs);
  }
  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  return {
    wb: winningBid,
    kvp: keyValuePairs
  };
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { auctionBids };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

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

/* end-test-block */
// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function auctionBidsCallBack(adapterID, adapterEntry, keyValuePairs, winningBid) { // TDD, i/o : done
  const refThis = this;
  if (adapterEntry.getLastBidID() != '') {
    util.forEachOnObject(adapterEntry.bids, (bidID, theBid) => {
      // do not consider post-timeout bids
      /* istanbul ignore else */
      if (theBid.getPostTimeoutStatus() === true) {
        return { winningBid, keyValuePairs };
      }

      /* istanbul ignore else */
      if (theBid.getDefaultBidStatus() !== 1 && CONFIG.getSendAllBidsStatus() == 1) {
        theBid.setSendAllBidsKeys();
      }

      if (winningBid !== null) {
        if (winningBid.getNetEcpm() < theBid.getNetEcpm()) {
          // i.e. the current bid is the winning bid, so remove the native keys from keyValuePairs
          // removeIf(removeNativeRelatedCode)
          refThis.updateNativeTargtingKeys(keyValuePairs);
          // endRemoveIf(removeNativeRelatedCode)
        } else {
          // i.e. the current bid is not the winning bid, so remove the native keys from theBid.keyValuePairs
          const bidKeyValuePairs = theBid.getKeyValuePairs();
          // removeIf(removeNativeRelatedCode)
          refThis.updateNativeTargtingKeys(bidKeyValuePairs);
          // endRemoveIf(removeNativeRelatedCode)
          theBid.keyValuePairs = bidKeyValuePairs;
        }
      }
      util.copyKeyValueObject(keyValuePairs, theBid.getKeyValuePairs());

      /* istanbul ignore else */
      if (CONFIG.getBidPassThroughStatus(adapterID) !== 0) {
        return { winningBid, keyValuePairs };
      }

      if (winningBid == null) {
        winningBid = theBid;
      } else if (winningBid.getNetEcpm() < theBid.getNetEcpm()) {
        winningBid = theBid;
      }
    });
    return { winningBid, keyValuePairs };
  } else {
    return { winningBid, keyValuePairs };
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { auctionBidsCallBack };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function getBid(divID) { // TDD, i/o : done
  let winningBid = null;
  let keyValuePairs = null;
  /* istanbul ignore else */
  if (util.isOwnProperty(window.PWT.bidMap, divID)) {
    const data = refThis.auctionBids(window.PWT.bidMap[divID]);
    winningBid = data.wb;
    keyValuePairs = data.kvp;

    window.PWT.bidMap[divID].setAnalyticEnabled();// Analytics Enabled

    if (winningBid && winningBid.getNetEcpm() > 0) {
      winningBid.setStatus(1);
      winningBid.setWinningBidStatus();
      util.vLogInfo(divID, {
        type: 'win-bid',
        bidDetails: winningBid,
        adServerCurrency: util.getCurrencyToDisplay()
      });
    } else {
      util.vLogInfo(divID, {
        type: 'win-bid-fail',
      });
    }
  }

  return { wb: winningBid, kvp: keyValuePairs };
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function getBidById(bidID) { // TDD, i/o : done
  /* istanbul ignore else */
  if (!util.isOwnProperty(window.PWT.bidIdMap, bidID)) {
    util.log(CONSTANTS.MESSAGES.M25 + bidID);
    return null;
  }

  const divID = window.PWT.bidIdMap[bidID].s;
  const adapterID = window.PWT.bidIdMap[bidID].a;

  /* istanbul ignore else */
  if (util.isOwnProperty(window.PWT.bidMap, divID)) {
    util.log(`BidID: ${bidID}, DivID: ${divID}${CONSTANTS.MESSAGES.M19}${adapterID}`);
    const theBid = window.PWT.bidMap[divID].getBid(adapterID, bidID);
    /* istanbul ignore else */
    if (theBid == null) {
      return null;
    }

    return {
      bid: theBid,
      slotid: divID
    };
  }

  util.log(CONSTANTS.MESSAGES.M25 + bidID);
  return null;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function displayCreative(theDocument, bidID) { // TDD, i/o : done
  storedObject = localStorage.getItem(PREFIX + window.location.hostname);
  const bidDetails = refThis.getBidById(bidID);
  /* istanbul ignore else */
  if (bidDetails) {
    const theBid = bidDetails.bid;
    const divID = bidDetails.slotid;
    util.displayCreative(theDocument, theBid);
    util.vLogInfo(divID, { type: 'disp', adapter: theBid.getAdapterID() });
    refThis.executeMonetizationPixel(divID, theBid);
    // Check if browsers local storage has auction related data and update impression served count accordingly.
    const frequencyDepth = JSON.parse(localStorage.getItem(PREFIX + window.location.hostname)) || {};
    if (frequencyDepth !== null && frequencyDepth.slotLevelFrquencyDepth) {
      frequencyDepth.slotLevelFrquencyDepth[frequencyDepth.codeAdUnitMap[divID]].impressionServed = frequencyDepth.slotLevelFrquencyDepth[frequencyDepth.codeAdUnitMap[divID]].impressionServed + 1;
      frequencyDepth.impressionServed = frequencyDepth.impressionServed + 1;
    }
    localStorage.setItem(PREFIX + window.location.hostname, JSON.stringify(frequencyDepth));
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function executeAnalyticsPixel() { // TDD, i/o : done
  storedObject = localStorage.getItem(PREFIX + window.location.hostname);
  frequencyDepth = storedObject !== null ? JSON.parse(storedObject) : {};
  const outputObj = {
    s: []
  };
  const pubId = CONFIG.getPublisherId();
  // gdprData = GDPR.getUserConsentDataFromLS(),
  // consentString = "",
  let pixelURL = CONFIG.getAnalyticsPixelURL();
  const // impID => slots[]
    impressionIDMap = {};
  /* istanbul ignore else */
  if (!pixelURL) {
    return;
  }

  pixelURL = `${CONSTANTS.COMMON.PROTOCOL + pixelURL}pubid=${pubId}`;

  outputObj[CONSTANTS.CONFIG.PUBLISHER_ID] = CONFIG.getPublisherId();
  outputObj[CONSTANTS.LOGGER_PIXEL_PARAMS.TIMEOUT] = `${CONFIG.getTimeout()}`;
  outputObj[CONSTANTS.LOGGER_PIXEL_PARAMS.PAGE_URL] = window.decodeURIComponent(util.metaInfo.pageURL);
  outputObj[CONSTANTS.LOGGER_PIXEL_PARAMS.PAGE_DOMAIN] = util.metaInfo.pageDomain;
  outputObj[CONSTANTS.LOGGER_PIXEL_PARAMS.TIMESTAMP] = util.getCurrentTimestamp();
  outputObj[CONSTANTS.CONFIG.PROFILE_ID] = CONFIG.getProfileID();
  outputObj[CONSTANTS.CONFIG.PROFILE_VERSION_ID] = CONFIG.getProfileDisplayVersionID();
  outputObj['ih'] = CONFIG.isUserIdModuleEnabled() ? 1 : 0;
  outputObj['bm'] = refThis.getBrowser();
  outputObj['tgid'] = util.getTgid();

  if (Object.keys(frequencyDepth).length) {
    outputObj['tpv'] = frequencyDepth.pageView;
    outputObj['trc'] = frequencyDepth.slotCnt;
    outputObj['tbs'] = frequencyDepth.bidServed;
    outputObj['tis'] = frequencyDepth.impressionServed;
    outputObj['lip'] = frequencyDepth.lip;
  }

  // As discussed we won't be seding gdpr data to logger
  // if (CONFIG.getGdpr()) {
  //  consentString = gdprData && gdprData.c ? encodeURIComponent(gdprData.c) : "";

  //  outputObj[CONSTANTS.CONFIG.GDPR_CONSENT] = gdprData && gdprData.g;
  //  outputObj[CONSTANTS.CONFIG.CONSENT_STRING] = consentString;

  //  pixelURL += "&gdEn=" + (CONFIG.getGdpr() ? 1 : 0);
  // }

  util.forEachOnObject(window.PWT.bidMap, (slotID, bmEntry) => {
    refThis.analyticalPixelCallback(slotID, bmEntry, impressionIDMap);
  });
  util.forEachOnObject(impressionIDMap, (impressionID, slots) => { /* istanbul ignore next */
    /* istanbul ignore else */
    if (slots.length > 0) {
      outputObj.s = slots;
      outputObj[CONSTANTS.COMMON.IMPRESSION_ID] = window.encodeURIComponent(impressionID);
      if (CONFIG.isFloorPriceModuleEnabled()) {
        const _floorData = window.PWT.floorData[outputObj[CONSTANTS.COMMON.IMPRESSION_ID]];
        outputObj['fmv'] = _floorData.floorRequestData ? _floorData.floorRequestData.modelVersion || undefined : undefined;
        outputObj['ft'] = _floorData.floorResponseData ? (_floorData.floorResponseData.enforcements.enforceJS == false ? 0 : 1) : undefined;
      }
      outputObj.psl = slots.psl;
      outputObj.dvc = { 'plt': util.getDevicePlatform() }
      // (new window.Image()).src = pixelURL + "&json=" + window.encodeURIComponent(JSON.stringify(outputObj));
      util.ajaxRequest(pixelURL, () => { }, `json=${window.encodeURIComponent(JSON.stringify(outputObj))}`, {
        contentType: 'application/x-www-form-urlencoded', // as per https://inside.pubmatic.com:8443/confluence/pages/viewpage.action?spaceKey=Products&title=POST+support+for+logger+in+Wrapper-tracker
        withCredentials: true
      });
    }
  });
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function executeMonetizationPixel(slotID, theBid) { // TDD, i/o : done
  const pixelURL = util.generateMonetizationPixel(slotID, theBid);
  if (!pixelURL) {
    return;
  }
  refThis.setImageSrcToPixelURL(pixelURL);
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function getAdUnitSizes(bmEntry) {
  const _adapter = Object.keys(bmEntry.adapters).filter(adapter => {
    if (Object.keys(bmEntry.adapters[adapter].bids).filter(bid => {
      if (!!bmEntry.adapters[adapter].bids[bid].isWinningBid && bmEntry.adapters[adapter].bids[bid].adFormat === 'native') { return bmEntry.adapters[adapter].bids[bid]; }
    }).length == 1) { return adapter; }
  });
  if (_adapter.length) {
    return ['1x1'];
  }
  return bmEntry.getSizes();
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { getAdUnitSizes };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function getAdUnitInfo(slotId) {
  return window.PWT.adUnits[slotId] || slotId;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { getAdUnitInfo };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function getAdUnitAdFormats(mediaTypes) {
  const af = mediaTypes ? Object.keys(mediaTypes).map(mediatype => {
    return CONSTANTS.MEDIATYPE[mediatype.toUpperCase()];
  }).filter(mtype => {
    return mtype != null
  }) : [];
  return af || [];
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { getAdUnitAdFormats };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

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

// removeIf(removeLegacyAnalyticsRelatedCode)
function analyticalPixelCallback(slotID, bmEntry, impressionIDMap) { // TDD, i/o : done
  storedObject = localStorage.getItem(PREFIX + window.location.hostname);
  const frequencyDepth = storedObject !== null ? JSON.parse(storedObject) : {};
  const usePBSAdapter = CONFIG.usePBSAdapter();
  const startTime = bmEntry.getCreationTime() || 0;
  let pslTime = (usePBSAdapter && window.pbsLatency) ? 0 : undefined;
  const impressionID = bmEntry.getImpressionID();
  const adUnitInfo = refThis.getAdUnitInfo(slotID);
  let latencyValue = {};
  const isAnalytics = true; // this flag is required to get grossCpm and netCpm in dollars instead of adserver currency
  /* istanbul ignore else */
  if (bmEntry.getAnalyticEnabledStatus() && !bmEntry.getExpiredStatus()) {
    const slotObject = {
      'sn': slotID,
      'sz': refThis.getAdUnitSizes(bmEntry),
      'au': adUnitInfo.adUnitId || slotID,
      'fskp': window.PWT.floorData ? (window.PWT.floorData[impressionID] ? (window.PWT.floorData[impressionID].floorRequestData ? (window.PWT.floorData[impressionID].floorRequestData.skipped == false ? 0 : 1) : undefined) : undefined) : undefined,
      'mt': refThis.getAdUnitAdFormats(adUnitInfo.mediaTypes),
      'ps': [],
      'bs': refThis.getSlotLevelFrequencyDepth(frequencyDepth, 'bidServed', adUnitInfo.adUnitId),
      'is': refThis.getSlotLevelFrequencyDepth(frequencyDepth, 'impressionServed', adUnitInfo.adUnitId),
      'rc': refThis.getSlotLevelFrequencyDepth(frequencyDepth, 'slotCnt', adUnitInfo.adUnitId),
      'vw': frequencyDepth && frequencyDepth.viewedSlot && frequencyDepth.viewedSlot[adUnitInfo.adUnitId],
      'rf': window.PWT.newAdUnits ? (window.PWT.newAdUnits[impressionID] ? (window.PWT.newAdUnits[impressionID][slotID] ? (window.PWT.newAdUnits[impressionID][slotID]['pubmaticAutoRefresh'] ? (window.PWT.newAdUnits[impressionID][slotID]['pubmaticAutoRefresh']['isRefreshed'] ? 1 : 0) : 0) : 0) : 0) : 0,
    };
    bmEntry.setExpired();
    impressionIDMap[impressionID] = impressionIDMap[impressionID] || [];

    util.forEachOnObject(bmEntry.adapters, (adapterID, { bids }) => {
      /* istanbul ignore else */
      if (CONFIG.getBidPassThroughStatus(adapterID) == 1) {
        return;
      }

      util.forEachOnObject(bids, (bidID, theBid) => {
        if (usePBSAdapter) {
          // In PrebidServerBidAdapater we are capturing start and end time of request
          // fetching these values here to calculate psl time for logger call
          latencyValue = window.pbsLatency && window.pbsLatency[impressionID];
          if (latencyValue && latencyValue['endTime'] && latencyValue['startTime']) {
            pslTime = latencyValue['endTime'] - latencyValue['startTime'];
          }
          // When we use PrebidServerBidAdapter we do not get seatbid for zero bid / no bid partners
          // as we need to log PubMatic partner in logger will be changing db = 0.
          if ((adapterID === 'pubmatic' || adapterID === 'pubmatic2') && (util.isOwnProperty(window.partnersWithoutErrorAndBids, impressionID) && window.partnersWithoutErrorAndBids[impressionID].includes(adapterID))) {
            theBid.defaultBid = 0;
          } else if (util.isOwnProperty(window.partnersWithoutErrorAndBids, impressionID) &&
            window.partnersWithoutErrorAndBids[impressionID].includes(adapterID) &&
            CONFIG.getAdapterNameForAlias(adapterID).includes('pubmatic')) {
            theBid.defaultBid = 0;
          }
        }

        const endTime = theBid.getReceivedTime();
        if (adapterID === 'pubmaticServer') {
          if ((util.isOwnProperty(window.PWT.owLatency, impressionID)) &&
            (util.isOwnProperty(window.PWT.owLatency[impressionID], 'startTime')) &&
            (util.isOwnProperty(window.PWT.owLatency[impressionID], 'endTime'))) {
            pslTime = (window.PWT.owLatency[impressionID].endTime - window.PWT.owLatency[impressionID].startTime);
          } else {
            pslTime = 0;
            util.log(`Logging pubmaticServer latency as 0 for impressionID: ${impressionID}`);
          }
          util.log(`PSL logging: time logged for id ${impressionID} is ${pslTime}`);
          return;
        }

        if (CONFIG.getAdapterMaskBidsStatus(adapterID) == 1) {
          if (theBid.getWinningBidStatus() === false) {
            return;
          }
        }
        /* if serverside adapter and
                     db == 0 and
                     getServerSideResponseTime returns -1, it means that server responded with error code 1/2/6
                     hence do not add entry in logger.
                     keeping the check for responseTime on -1 since there could be a case where:
            ss status = 1, db status = 0, and responseTime is 0, but error code is 4, i,e. no bid. And for error code 4,
            we want to log the data not skip it.
                  */
        if (theBid.getServerSideStatus()) {
          if (theBid.getDefaultBidStatus() === -1 &&
            theBid.getServerSideResponseTime() === -1) {
            return;
          }
        }
        // Logic : if adapter is pubmatic and bid falls under two condition :
        /**
         *  1.timeout zero bids
         *  2.no response from translator
         * Then we don't log it for pubmatic
         * Reason : Logging timeout zero bids causing reports to show more zero in comparision to other bidders
         * Originally we started logging this for latency purposes.
         * Future Scope : Remove below check to log with appt. value(s)
        */
        /* istanbul ignore else */
        if ((adapterID === 'pubmatic' || adapterID === 'pubmatic2') && (theBid.getDefaultBidStatus() || (theBid.getPostTimeoutStatus() && theBid.getGrossEcpm(isAnalytics) == 0))) {
          return;
        }
        const pbbid = theBid.getPbBid();

        // todo: take all these key names from constants
        slotObject['ps'].push({
          'pn': CONFIG.getAdapterNameForAlias(adapterID),
          'bc': adapterID,
          'bidid': (pbbid && pbbid.prebidBidId) ? pbbid.prebidBidId : bidID,
          'origbidid': bidID,
          'db': theBid.getDefaultBidStatus(),
          'kgpv': theBid.getKGPV(),
          'kgpsv': theBid.getKGPV(true),
          'psz': `${theBid.getWidth()}x${theBid.getHeight()}`,
          'eg': theBid.getGrossEcpm(isAnalytics),
          'en': theBid.getNetEcpm(isAnalytics),
          'di': theBid.getDealID(),
          'dc': theBid.getDealChannel(),
          'l1': theBid.getServerSideStatus() ? theBid.getServerSideResponseTime() : (endTime - startTime),
          'l2': 0,
          'adv': pbbid ? util.getAdDomain(pbbid) || undefined : undefined,
          'ss': theBid.getServerSideStatus(),
          't': theBid.getPostTimeoutStatus() === false ? 0 : 1,
          'wb': theBid.getWinningBidStatus() === true ? 1 : 0,
          'mi': theBid.getServerSideStatus() ? theBid.getMi(adapterID) : undefined,
          'af': theBid.getAdFormat(),
          'ocpm': CONFIG.getAdServerCurrency() ? theBid.getOriginalCpm() : theBid.getGrossEcpm(),
          'ocry': CONFIG.getAdServerCurrency() ? theBid.getOriginalCurrency() : CONSTANTS.COMMON.ANALYTICS_CURRENCY,
          'piid': theBid.getsspID(),
          'frv': theBid.getServerSideStatus() ? undefined : (pbbid ? (pbbid.floorData ? pbbid.floorData.floorRuleValue : undefined) : undefined),
          'md': pbbid ? refThis.getMetadata(pbbid.meta) : undefined,
        });
      })
    });

    impressionIDMap[impressionID].push(slotObject);
    // special handling when all media types are disabled for adunit and
    // if we are using PrebidServerBidAdapter with
    if (usePBSAdapter && CONFIG.getServerEnabledAdaptars().length && pslTime == undefined && !window.pbsLatency) {
      pslTime = 0;
    }
    if (pslTime !== undefined) {
      impressionIDMap[impressionID].psl = pslTime;
    }
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { analyticalPixelCallback };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
// todo: using removeLegacyAnalyticsRelatedCode will make this function unavailable with PBJS analytics,
//  i assume we will not be using this function for Native when PBJS analytics is enabled
/**
 * function which takes url and creates an image and executes them
 * used to execute trackers
 * @param {*} pixelURL
 * @param {*} useProtocol
 * @returns
 */
export function setImageSrcToPixelURL(pixelURL, useProtocol) { // TDD, i/o : done
  const img = new window.Image();
  if (useProtocol != undefined && !useProtocol) {
    img.src = pixelURL;
    return;
  }
  if (String(pixelURL).trim().substring(0, 8) != CONSTANTS.COMMON.PROTOCOL) {
    pixelURL = CONSTANTS.COMMON.PROTOCOL + pixelURL;
  }
  img.src = pixelURL;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

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
/**
 * This function is used to execute trackers on event
 * in case of native. On click of native create element
 * @param {*} event
 */
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

// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeNativeRelatedCode)
/**
 * based on action it executes either the clickTrackers or
 * impressionTrackers and javascriptTrackers.
 * Javascript trackers is a valid html, urls already wrapped in script tagsand its guidelines can be found at
 * iab spec document.
 * @param {*} bidDetails
 * @param {*} action
 */
export function fireTracker(bidDetails, action) {
  let trackers;

  if (action === 'click') {
    trackers = bidDetails['native'] && bidDetails['native'].ortb &&
      bidDetails['native'].ortb.link && bidDetails['native'].ortb.link.clickTrackers;
  } else if (action === 'imptrackers') {
    const nativeResponse = bidDetails.native.ortb || bidDetails.native;

    const impTrackers = (nativeResponse.eventtrackers || [])
      .filter(({ event }) => event === TRACKER_EVENTS.impression);

    const tally = { img: [], js: [] };
    impTrackers.forEach(({ method, url }) => {
      if (TRACKER_METHODS.hasOwnProperty(method)) {
        tally[TRACKER_METHODS[method]].push(url);
      }
    });

    if (tally.img.length == 0 && nativeResponse.imptrackers) {
      tally.img = tally.img.concat(nativeResponse.imptrackers);
    }
    trackers = tally.img;

    if (tally.js.length == 0 && nativeResponse.jstracker) {
      // jstracker is already HTML markup
      tally.js = tally.js.concat([nativeResponse.jstracker]);
    }
    if (tally.js.length) {
      util.insertHtmlIntoIframe(tally.js.join('\n'));
    }
  }

  (trackers || []).forEach(url => { refThis.setImageSrcToPixelURL(url, false); });
}

// endRemoveIf(removeNativeRelatedCode)

// this function generates all satndard key-value pairs for a given bid and setup, set these key-value pairs in an object
// todo: write unit test cases
// removeIf(removeLegacyAnalyticsRelatedCode)
export function setStandardKeys(winningBid, keyValuePairs) {
  if (winningBid) {
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.BID_ID] = winningBid.getBidID();
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.BID_STATUS] = winningBid.getStatus();
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.BID_ECPM] = winningBid.getNetEcpm().toFixed(CONSTANTS.COMMON.BID_PRECISION);
    const dealID = winningBid.getDealID();
    if (dealID) {
      keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.BID_DEAL_ID] = dealID;
    }
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.BID_ADAPTER_ID] = winningBid.getAdapterID();
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.PUBLISHER_ID] = CONFIG.getPublisherId();
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.PROFILE_ID] = CONFIG.getProfileID();
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.PROFILE_VERSION_ID] = CONFIG.getProfileDisplayVersionID();
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.BID_SIZE] = `${winningBid.width}x${winningBid.height}`;
    keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.PLATFORM_KEY] = (winningBid.getAdFormat() == CONSTANTS.FORMAT_VALUES.VIDEO && winningBid.getcacheUUID()) ? CONSTANTS.PLATFORM_VALUES.VIDEO : (winningBid.getNative() ? CONSTANTS.PLATFORM_VALUES.NATIVE : CONSTANTS.PLATFORM_VALUES.DISPLAY);
    if (winningBid.getAdFormat() == CONSTANTS.FORMAT_VALUES.VIDEO && winningBid.getcacheUUID()) {
      keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.CACHE_PATH] = CONSTANTS.CONFIG.CACHE_PATH;
      keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.CACHE_URL] = CONSTANTS.CONFIG.CACHE_URL;
      keyValuePairs[CONSTANTS.WRAPPER_TARGETING_KEYS.CACHE_ID] = winningBid.getcacheUUID();
    }
  } else {
    util.logWarning('Not generating key-value pairs as invalid winningBid object passed. WinningBid: ');
    util.logWarning(winningBid);
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function getBrowser() {
  const regExBrowsers = CONSTANTS.REGEX_BROWSERS;
  const browserMapping = CONSTANTS.BROWSER_MAPPING;

  const userAgent = navigator.userAgent;
  let browserName = userAgent == null ? -1 : 0;
  if (userAgent) {
    for (let i = 0; i < regExBrowsers.length; i++) {
      if (userAgent.match(regExBrowsers[i])) {
        browserName = browserMapping[i];
        break;
      }
    }
  }
  return browserName;
}
// endRemoveIf(removeLegacyAnalyticsRelatedCode)
