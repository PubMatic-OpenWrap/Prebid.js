/* eslint-disable prebid/validate-imports */
/*
  Note:
    Whenever we support a new PB adapter, we need to check if it needs actual sizes to be passed,
    if so we will need to add special handling
    PreBid does not do mandatory parameters checking
*/
import * as CONFIG from '../config.js';
import * as CONSTANTS from '../constants.js';
import * as BID from '../bid.js';
import * as util from '../util.js';
import * as bidManager from '../bidManager.js';
import * as CONF from '../conf.js';
import * as COMMON_CONFIG from '../common.config.js';

const parentAdapterID = CONSTANTS.COMMON.PARENT_ADAPTER_PREBID;

const pbNameSpace = /* CONFIG.isIdentityOnly() ? CONSTANTS.COMMON.IH_NAMESPACE : */ CONSTANTS.COMMON.PREBID_NAMESPACE;

/* start-test-block */
export {parentAdapterID};

/* end-test-block */
const kgpvMap = {};

/* start-test-block */
export {kgpvMap};

/* end-test-block */

// const refThis = this;
let onEventAdded = false;
let onAuctionEndEventAdded = false;
//const isPrebidPubMaticAnalyticsEnabled = CONFIG.isPrebidPubMaticAnalyticsEnabled();
const isSingleImpressionSettingEnabled = CONFIG.isSingleImpressionSettingEnabled();
const defaultAliases = CONSTANTS.DEFAULT_ALIASES;

/* start-test-block */
export {isSingleImpressionSettingEnabled};

/* end-test-block */

// removeIf(removeLegacyAnalyticsRelatedCode)
function transformPBBidToOWBid(bid, kgpv, regexPattern) {
  const rxPattern = regexPattern || bid.regexPattern || undefined;
  const theBid = BID.createBid(bid.bidderCode, kgpv);
  const pubmaticServerErrorCode = parseInt(bid.pubmaticServerErrorCode);
  if (CONFIG.getAdServerCurrency()) {
    // if a bidder has same currency as of pbConf.currency.adServerCurrency then Prebid does not set pbBid.originalCurrency and pbBid.originalCurrency value
    // thus we need special handling
    if (!util.isOwnProperty(bid, 'originalCpm')) {
      bid.originalCpm = bid.cpm;
    }
    if (!util.isOwnProperty(bid, 'originalCurrency')) {
      bid.originalCurrency = util.getCurrencyToDisplay();
    }
  }
  if (bid.status == CONSTANTS.BID_STATUS.BID_REJECTED) {
    theBid.setGrossEcpm(bid.originalCpm, bid.originalCurrency, util.getCurrencyToDisplay(), bid.status);
  } else {
    theBid.setGrossEcpm(bid.cpm);
  }
  theBid.setDealID(bid.dealId);
  theBid.setDealChannel(bid.dealChannel);
  theBid.setAdHtml(bid.ad || '');
  theBid.setAdUrl(bid.adUrl || '');
  theBid.setWidth(bid.width);
  theBid.setHeight(bid.height);
  theBid.setMi(bid.mi);
  if (bid.videoCacheKey) {
    theBid.setVastCache(bid.videoCacheKey);
  }
  if (bid.vastUrl) {
    theBid.setVastUrl(bid.vastUrl);
  }
  if (bid.vastXml) {
    theBid.setVastUrl(bid.vastUrl);
  }
  if (bid.renderer) {
    theBid.setRenderer(bid.renderer);
  }
  if (bid.native) {
    theBid.setNative(bid.native);
  }
  if (rxPattern) {
    theBid.setRegexPattern(rxPattern);
  }
  if (bid.mediaType == CONSTANTS.FORMAT_VALUES.VIDEO) {
    if (bid.videoCacheKey) {
      theBid.setcacheUUID(bid.videoCacheKey);
    }
    theBid.updateBidId(bid.adUnitCode);
  }
  if (bid.mediaType && (parseFloat(bid.cpm) > 0 || bid.status == CONSTANTS.BID_STATUS.BID_REJECTED)) {
    theBid.setAdFormat(bid.adHtml, bid.mediaType);
  }
  if (bid.sspID) {
    theBid.setsspID(bid.sspID);
  }
  theBid.setReceivedTime(bid.responseTimestamp);
  theBid.setServerSideResponseTime(bid.serverSideResponseTime);
  // Check if currency conversion is enabled or not
  /* istanbul ignore else */
  if (CONFIG.getAdServerCurrency()) {
    theBid.setOriginalCpm(window.parseFloat(bid.originalCpm));
    theBid.setOriginalCurrency(bid.originalCurrency);
    if (util.isFunction(bid.getCpmInNewCurrency)) {
      theBid.setAnalyticsCpm(window.parseFloat(bid.getCpmInNewCurrency(CONSTANTS.COMMON.ANALYTICS_CURRENCY)), bid.status);
    } else {
      theBid.setAnalyticsCpm(theBid.getGrossEcpm(), bid.status);
    }
  }
  /*
    errorCodes meaning:
    1 = UNMAPPED_SLOT_ERROR
    2 = MISSING_CONF_ERROR
    3 = TIMEOUT_ERROR
    4 = NO_BID_PREBID_ERROR
    5 = PARTNER_TIMEDOUT_ERROR
    6 = INVALID_CONFIGURATION_ERROR
    7 = NO_GDPR_CONSENT_ERROR
    11 = ALL_PARTNER_THROTTLED
    12 = PARTNER_THROTTLED
    500 = API_RESPONSE_ERROR
  */
  if (pubmaticServerErrorCode === 1 || pubmaticServerErrorCode === 2 || pubmaticServerErrorCode === 6 || pubmaticServerErrorCode === 11 || pubmaticServerErrorCode === 12) {
    theBid.setDefaultBidStatus(-1);
    theBid.setWidth(0);
    theBid.setHeight(0);
  } else if (pubmaticServerErrorCode === 3 || pubmaticServerErrorCode === 4 || pubmaticServerErrorCode === 5) {
    theBid.setDefaultBidStatus(0);
    /* istanbul ignore else */
    if (theBid.isServerSide === 0) {
      theBid.setPostTimeoutStatus();
    }
  } else {
    pubmaticServerErrorCode && theBid.setDefaultBidStatus(1);
  }

  util.forEachOnObject(bid.adserverTargeting, (key, value) => {
    if (key !== 'hb_format' && key !== 'hb_source') {
      theBid.setKeyValuePair(key, value);
    }
  });
  theBid.setPbBid(bid);
  return theBid;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export {transformPBBidToOWBid};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
// This function is used to check size for the winning kgpv and if size is different then winning then modify it
// to have same code for logging and tracking
function checkAndModifySizeOfKGPVIfRequired(bid, {kgpvs}) {
  const responseObject = {
    'responseKGPV': '',
    'responseRegex': ''
  };

  // Logic to find out KGPV for partner for which the bid is recieved.
  // Need to check for No Bid Case.
  kgpvs.length > 0 && kgpvs.forEach(ele => {
    /* istanbul ignore else */
    if (bid.bidderCode == ele.adapterID) {
      responseObject.responseKGPV = ele.kgpv;
      responseObject.responseRegex = ele.regexPattern;
    }
  });
  const responseIdArray = responseObject.responseKGPV.split('@');
  let sizeIndex = 1;
  let isRegex = false;
  /* istanbul ignore else */
  if (responseIdArray && (responseIdArray.length == 2 || ((responseIdArray.length == 3) && (sizeIndex = 2) && (isRegex = true))) && bid.mediaType != 'video') {
    let responseIdSize = responseIdArray[sizeIndex];
    let responseIndex = null;
    // Below check if ad unit index is present then ignore it
    // TODO: Confirm it needs to be ignored or not
    /* istanbul ignore else */
    if (responseIdArray[sizeIndex].indexOf(':') > 0) {
      responseIdSize = responseIdArray[sizeIndex].split(':')[0];
      responseIndex = responseIdArray[sizeIndex].split(':')[1];
    }
    /* istanbul ignore else */
    if (bid.getSize() && bid.getSize() != responseIdSize && (bid.getSize().toUpperCase() != '0X0')) {
      // Below check is for size level mapping
      // ex. 300x250@300X250 is KGPV generated for first size but the winning size is 728x90
      // then new KGPV will be replaced to 728x90@728X90
      /* istanbul ignore else */
      if (responseIdArray[0].toUpperCase() == responseIdSize.toUpperCase()) {
        responseIdArray[0] = bid.getSize().toLowerCase();
      }
      if (isRegex) {
        responseObject.responseKGPV = `${responseIdArray[0]}@${responseIdArray[1]}@${bid.getSize()}`;
      } else {
        responseObject.responseKGPV = `${responseIdArray[0]}@${bid.getSize()}`;
      }
      // Below check is to make consistent behaviour with ad unit index
      // it again appends index if it was originally present
      if (responseIndex) {
        responseObject.responseKGPV = `${responseObject.responseKGPV}:${responseIndex}`;
      }
    }
  }
  return responseObject;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export {checkAndModifySizeOfKGPVIfRequired};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function pbBidStreamHandler(pbBid) {
  let responseID = pbBid.adUnitCode || '';

  // NEW APPROACH
  // todo: unit-test cases pending
  /* istanbul ignore else */
  if (util.isOwnProperty(kgpvMap, responseID)) {
    if (pbBid.floorData) {
      window.PWT.floorData[window.PWT.bidMap[pbBid.adUnitCode].impressionID]['floorResponseData'] = pbBid.floorData
    }
    /** Special Hack for pubmaticServer for tracker/logger kgpv */
    /* istanbul ignore else */
    if (pbBid.bidderCode === 'pubmaticServer') {
      pbBid.bidderCode = pbBid.originalBidder;
    }

    // If Single impression is turned on then check and modify kgpv as per bid response size
    /* istanbul ignore else */
    if (CONFIG.isSingleImpressionSettingEnabled()) {
      // Assinging kbpv after modifying and will be used for logger and tracker purposes
      // this field will be replaced everytime a bid is received with single impression feature on
      const kgpvAndRegexOfBid = checkAndModifySizeOfKGPVIfRequired(pbBid, kgpvMap[responseID]);
      kgpvMap[responseID].kgpv = kgpvAndRegexOfBid.responseKGPV;
      kgpvMap[responseID].regexPattern = kgpvAndRegexOfBid.responseRegex;
      // : Put a field Regex Pattern in KGPVMAP so that it can be passed on to the bid and to the logger
      // Something like this kgpvMap[responseID].regexPattern = pbBid.kgpvMap[responseID].regexPattern;
    }

    /*
      - special handling for serverSideEnabled
      - get the actual divId = kgpvMap[ pbBid.adUnitCode ].divID
      - now check if divID @ pbBid.bidderCode @ pbBid.width X pbBid.height exists in kgpvMap
        if yes this is new responseID
      - else check if divID @ pbBid.bidderCode exists in kgpvMap
        if yes this is new responseID
      - else do nothing, log failure

      Pros:
        no need of divid and kgpv to be returned in bid from prebid
        no need to add custom keys in Prebid bid object, they might standerdize it in future
    */

    /* istanbul ignore else */
    if (pbBid.bidderCode && CONFIG.isServerSideAdapter(pbBid.bidderCode)) {
      const divID = kgpvMap[responseID].divID;
      if (!CONFIG.isSingleImpressionSettingEnabled()) {
        const temp1 = getPBCodeWithWidthAndHeight(divID, pbBid.bidderCode, pbBid.width, pbBid.height);
        const temp2 = getPBCodeWithoutWidthAndHeight(divID, pbBid.bidderCode);

        if (util.isOwnProperty(kgpvMap, temp1)) {
          responseID = temp1;
        } else if (util.isOwnProperty(kgpvMap, temp2)) {
          responseID = temp2;
        } else {
          util.logWarning(`Failed to find kgpv details for S2S-adapter:${pbBid.bidderCode}`);
          return;
        }
      }
      pbBid.ss = CONFIG.isServerSideAdapter(pbBid.bidderCode) ? 1 : 0;
    }

    /* istanbul ignore else */
    if (pbBid.bidderCode) {
      // Adding a hook for publishers to modify the bid we have to store
      // we should NOT call the hook for defaultbids and post-timeout bids
      //  default bids handled here
      // timeoutForPrebid check is added to avoid Hook call for post-timeout bids
      // Here slotID, adapterID, and latency are read-only and theBid can be modified
      if (pbBid.timeToRespond < (CONFIG.getTimeout() - CONSTANTS.CONFIG.TIMEOUT_ADJUSTMENT)) {
        util.handleHook(CONSTANTS.HOOKS.BID_RECEIVED, [kgpvMap[responseID].divID, pbBid]);
      }
      bidManager.setBidFromBidder(
        kgpvMap[responseID].divID,
        transformPBBidToOWBid(pbBid, kgpvMap[responseID].kgpv, kgpvMap[responseID].regexPattern)
      );
    }
  } else {
    util.logWarning(`Failed to find pbBid.adUnitCode in kgpvMap, pbBid.adUnitCode:${pbBid.adUnitCode}`);
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export {pbBidStreamHandler};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function pbBidRequestHandler({bids}) {
  bids.forEach(({adUnitCode, floorData}) => {
    if (!window.PWT.floorData[window.PWT.bidMap[adUnitCode].impressionID]) {
      window.PWT.floorData[window.PWT.bidMap[adUnitCode].impressionID] = {}
    }
    window.PWT.floorData[window.PWT.bidMap[adUnitCode].impressionID]['floorRequestData'] = floorData
  });
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export {pbBidRequestHandler};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function pbAuctionEndHandler({adUnits}) {
  window.PWT.newAdUnits = window.PWT.newAdUnits || {};
  adUnits.forEach(({pubmaticAutoRefresh, code}) => {
    if (pubmaticAutoRefresh) {
      if (!window.PWT.newAdUnits[window.PWT.bidMap[code].impressionID]) {
        window.PWT.newAdUnits[window.PWT.bidMap[code].impressionID] = {};
      }
      if (!window.PWT.newAdUnits[window.PWT.bidMap[code].impressionID][code]) {
        window.PWT.newAdUnits[window.PWT.bidMap[code].impressionID][code] = {}
      }
      window.PWT.newAdUnits[window.PWT.bidMap[code].impressionID][code].pubmaticAutoRefresh = pubmaticAutoRefresh;
    }
  });
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export {pbAuctionEndHandler};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function getPBCodeWithWidthAndHeight(divID, adapterID, width, height) {
  return `${divID}@${adapterID}@${width}X${height}`;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export {getPBCodeWithWidthAndHeight};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function getPBCodeWithoutWidthAndHeight(divID, adapterID) {
  return `${divID}@${adapterID}`;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export {getPBCodeWithoutWidthAndHeight};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

function isAdUnitsCodeContainBidder(adUnits, code, adapterID) {
  let bidderPresent = false;
  if (util.isOwnProperty(adUnits, code)) {
    adUnits[code].bids.forEach(({bidder}) => {
      if (bidder == adapterID) {
        bidderPresent = true;
      }
    });
  }
  return bidderPresent;
}

/* start-test-block */
export {isAdUnitsCodeContainBidder};

/* end-test-block */

function generatedKeyCallbackForPbAnalytics(adapterID, adUnits, adapterConfig, impressionID, generatedKey, kgpConsistsWidthAndHeight, currentSlot, keyConfig, currentWidth, currentHeight, regexPattern) {
  let code;
  let sizes;
  let divID;
  let adUnitId;
  let mediaTypeConfig;
  let partnerConfig;

  // If we are using PubMaticServerBidAdapatar then serverSideEabled: do not add config into adUnits.
  // If we are using PrebidServerBidAdapatar then we need to add config into adUnits.
  if (CONFIG.isServerSideAdapter(adapterID) && CONFIG.usePBSAdapter() != true) {
    util.log(`Not calling adapter: ${adapterID}, for ${generatedKey}, as it is serverSideEnabled.`);
    return;
  }

  divID = currentSlot.getDivID();
  code = currentSlot.getDivID();
  sizes = currentSlot.getSizes();
  adUnitId = currentSlot.getAdUnitID();

  /* istanbul ignore else */
  const adUnitConfig = util.getAdUnitConfig(sizes, currentSlot);
  mediaTypeConfig = adUnitConfig.mediaTypeObject;
  if (mediaTypeConfig.partnerConfig) {
    partnerConfig = mediaTypeConfig.partnerConfig;
  }
  if (!util.isOwnProperty(adUnits, code)) {
    // TODO: Remove sizes from below as it will be deprecated soon in prebid
    // Need to check pubmaticServerBidAdapter in our fork after this change.
    adUnits[code] = {
      code,
      mediaTypes: {},
      sizes,
      adUnitId,
      bids: [],
      divID
    };
    // Assigning it individually since mediaTypes doesn't take any extra param apart from these.
    // And We are now also getting partnerConfig for different partners
    if (mediaTypeConfig.banner) {
      adUnits[code].mediaTypes['banner'] = mediaTypeConfig.banner;
    }
    if (mediaTypeConfig.native) {
      adUnits[code].mediaTypes['native'] = mediaTypeConfig.native;
    }
    if (mediaTypeConfig.video) {
      adUnits[code].mediaTypes['video'] = mediaTypeConfig.video;
    }
    if (adUnitConfig.renderer) {
      adUnits[code]['renderer'] = adUnitConfig.renderer;
    }
    window.PWT.adUnits = window.PWT.adUnits || {};
    window.PWT.adUnits[code] = adUnits[code];
  } else if (CONFIG.isSingleImpressionSettingEnabled()) {
    // following function call basically checks whether the adapter is already configured for the given code in adunits object
    if (isAdUnitsCodeContainBidder(adUnits, code, adapterID)) {
      return;
    }
  }

  pushAdapterParamsInAdunits(adapterID, generatedKey, impressionID, keyConfig, adapterConfig, currentSlot, code, adUnits, partnerConfig, regexPattern);
}

export {generatedKeyCallbackForPbAnalytics};

// removeIf(removeLegacyAnalyticsRelatedCode)
function generatedKeyCallback(adapterID, adUnits, adapterConfig, impressionID, generatedKey, kgpConsistsWidthAndHeight, currentSlot, keyConfig, currentWidth, currentHeight, regexPattern) {
  let code; let sizes; const divID = currentSlot.getDivID();
  const adUnitId = currentSlot.getAdUnitID();
  let mediaTypeConfig;
  let partnerConfig;

  if (!CONFIG.isSingleImpressionSettingEnabled()) {
    if (kgpConsistsWidthAndHeight) {
      code = getPBCodeWithWidthAndHeight(divID, adapterID, currentWidth, currentHeight);
      sizes = [[currentWidth, currentHeight]];
    } else {
      code = getPBCodeWithoutWidthAndHeight(divID, adapterID);
      sizes = currentSlot.getSizes();
    }
    kgpvMap[ code ] = {
      kgpv: generatedKey,
      divID,
      regexPattern
    };
  } else {
    /* This will be executed in case single impression feature is enabled.
    Below statements assign code as div and sizes as all sizes of ad slot
    it generates kgpvmap consisting of kgpvs as property
    if in kgpv map code exists and kgpv exists then
      if a adapter with a single kgpv exists in kgpvs then it ignores and returns from this function
      if a adapter does not exist for the code then a entry is being pushed in kgpvs with adapterid and kgpv for the bidder
    if code does not consists in kgpv object then a entry is made with adapter first calling it. */
    code = currentSlot.getDivID();
    sizes = currentSlot.getSizes();
    let adapterAlreadyExsistsInKGPVS = false;
    if (kgpvMap[code] && kgpvMap[code].kgpvs && kgpvMap[code].kgpvs.length > 0) {
      util.forEachOnArray(kgpvMap[code].kgpvs, (idx, kgpv) => {
        // We want to have one adapter entry for one bidder and one code/adSlot
        /* istanbul ignore else */
        if (kgpv.adapterID == adapterID) {
          adapterAlreadyExsistsInKGPVS = true;
        }
      });
      /* istanbul ignore else */
      if (adapterAlreadyExsistsInKGPVS && isAdUnitsCodeContainBidder(adUnits, code, adapterID)) {
        return;
      }
    } else {
      kgpvMap[code] = {
        kgpvs: [],
        divID
      };
    }
    if (!adapterAlreadyExsistsInKGPVS) {
      const kgpv = {
        adapterID,
        kgpv: generatedKey,
        regexPattern
      };
      kgpvMap[code].kgpvs.push(kgpv);
    }
  }

  // If we are using PubMaticServerBidAdapatar then serverSideEabled: do not add config into adUnits.
  // If we are using PrebidServerBidAdapatar then we need to add config into adUnits.
  if (CONFIG.isServerSideAdapter(adapterID) && CONFIG.usePBSAdapter() != true) {
    util.log(`Not calling adapter: ${adapterID}, for ${generatedKey}, as it is serverSideEnabled.`);
    return;
  }

  /* istanbul ignore else */
  const adUnitConfig = util.getAdUnitConfig(sizes, currentSlot);
  mediaTypeConfig = adUnitConfig.mediaTypeObject;
  if (mediaTypeConfig.partnerConfig) {
    partnerConfig = mediaTypeConfig.partnerConfig;
  }
  if (!util.isOwnProperty(adUnits, code)) {
    // TODO: Remove sizes from below as it will be deprecated soon in prebid
    // Need to check pubmaticServerBidAdapter in our fork after this change.
    adUnits[code] = {
      code,
      mediaTypes: {},
      sizes,
      adUnitId,
      bids: [],
      divID
    };
    // Assigning it individually since mediaTypes doesn't take any extra param apart from these.
    // And We are now also getting partnerConfig for different partners
    if (mediaTypeConfig.banner) {
      adUnits[code].mediaTypes['banner'] = mediaTypeConfig.banner;
    }
    if (mediaTypeConfig.native) {
      adUnits[code].mediaTypes['native'] = mediaTypeConfig.native;
    }
    if (mediaTypeConfig.video) {
      adUnits[code].mediaTypes['video'] = mediaTypeConfig.video;
    }
    if (adUnitConfig.renderer) {
      adUnits[code]['renderer'] = adUnitConfig.renderer;
    }
    window.PWT.adUnits = window.PWT.adUnits || {};
    window.PWT.adUnits[code] = adUnits[code];
  } else if (CONFIG.isSingleImpressionSettingEnabled()) {
    if (isAdUnitsCodeContainBidder(adUnits, code, adapterID)) {
      return;
    }
  }

  // todo: is this block required? isn't it covered in above if block?
  // in case there are multiple bidders ,we don't generate the config again but utilize the existing mediatype.
  if (util.isOwnProperty(adUnits, code)) {
    mediaTypeConfig = adUnits[code].mediaTypes;
  }

  pushAdapterParamsInAdunits(adapterID, generatedKey, impressionID, keyConfig, adapterConfig, currentSlot, code, adUnits, partnerConfig, regexPattern);
}

/* start-test-block */
export {generatedKeyCallback};

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

function pushAdapterParamsInAdunits(adapterID, generatedKey, impressionID, keyConfig, adapterConfig, currentSlot, code, adUnits, partnerConfig, regexPattern) {
  const slotParams = {};
  const mediaTypeConfig = adUnits[code].mediaTypes;
  const sizes = adUnits[code].sizes;
  let isWiidRequired = false;
  if (mediaTypeConfig && util.isOwnProperty(mediaTypeConfig, 'video') && adapterID != 'telaria') {
    slotParams['video'] = mediaTypeConfig.video;
  }
  util.forEachOnObject(keyConfig, (key, value) => {
    /* istanbul ignore next */
    slotParams[key] = value;
  });

  if (CONFIG.isPrebidPubMaticAnalyticsEnabled()) {
    slotParams['kgpv'] = generatedKey; // TODO : Update this in case of video, change the size to 0x0
    slotParams['regexPattern'] = regexPattern;
  }

  if (partnerConfig && Object.keys(partnerConfig).length > 0) {
    util.forEachOnObject(partnerConfig, (key, value) => {
      if (key == adapterID) {
        util.forEachOnObject(value, (key, value) => {
          /* istanbul ignore next */
          slotParams[key] = value;
        });
      }
    });
  }

  // Logic : If for slot config for partner video parameter is present then use that
  // else take it from mediaType.video
  if (mediaTypeConfig && util.isOwnProperty(mediaTypeConfig, 'video') && adapterID != 'telaria') {
    if (util.isOwnProperty(slotParams, 'video') && util.isObject(slotParams.video)) {
      util.forEachOnObject(mediaTypeConfig.video, (key, value) => {
        if (!util.isOwnProperty(slotParams['video'], key)) {
          slotParams['video'][key] = value;
        }
      });
    } else {
      slotParams['video'] = mediaTypeConfig.video;
    }
  }
  // for pubmaticServer partner we used to pass wiid when isPrebidPubMaticAnalyticsEnabled is false but now we do not
  // get pubmaticServer partner when usePBSAdapter flag is true so we will be adding wiid conditionally.
  if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === false && CONFIG.usePBSAdapter()) {
    slotParams['wiid'] = impressionID;
    isWiidRequired = true;
  }

  const adapterName = CONFIG.getAdapterNameForAlias(adapterID) || adapterID;

  // processing for each partner
  switch (adapterName) {
    // todo: unit-test cases pending
    case 'pubmaticServer':
      slotParams['publisherId'] = adapterConfig['publisherId'];
      slotParams['adUnitIndex'] = `${currentSlot.getAdUnitIndex()}`;
      slotParams['adUnitId'] = currentSlot.getAdUnitID();
      slotParams['divId'] = currentSlot.getDivID();
      slotParams['adSlot'] = generatedKey;
      if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === false) {
        slotParams['wiid'] = impressionID;
      }
      slotParams['profId'] = CONFIG.getProfileID();
      /* istanbul ignore else */
      if (window.PWT.udpv) {
        slotParams['verId'] = CONFIG.getProfileDisplayVersionID();
      }
      adUnits[ code ].bids.push({ bidder: adapterID, params: slotParams });
      break;

    case 'pubmatic':
    case 'pubmatic2':
      slotParams['publisherId'] = adapterConfig['publisherId'];
      slotParams['adSlot'] = slotParams['slotName'] || generatedKey;
      if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === false) {
        slotParams['wiid'] = impressionID;
      }
      slotParams['profId'] = (adapterID == 'pubmatic2') || (adapterName == 'pubmatic2') ? adapterConfig['profileId'] : CONFIG.getProfileID();
      /* istanbul ignore else */
      if ((adapterID != 'pubmatic2' && adapterName != 'pubmatic2') && window.PWT.udpv) {
        slotParams['verId'] = CONFIG.getProfileDisplayVersionID();
      }

      // If we will be using PrebidServerBidAdaptar add wrapper object with profile and version
      if (CONFIG.usePBSAdapter() == true && CONFIG.isServerSideAdapter(adapterID)) {
        slotParams['wrapper'] = {
          profile: parseInt(CONF.pwt.pid),
          version: parseInt(CONF.pwt.pdvid)
        };
        // If mapping is regex then we should pass hashedKey to adSlot params earlier it was handled on s2s side.
        if (slotParams['hashedKey']) {
          slotParams['adSlot'] = slotParams['hashedKey'];
        }
      }

      // We are removing mimes because it merges with the existing adUnit mimes
      // if(slotParams["video"] && slotParams["video"]["mimes"]){
      // delete slotParams["video"]["mimes"];
      // }
      adUnits[ code ].bids.push({ bidder: adapterID, params: slotParams });
      break;
    case 'pulsepoint':
      util.forEachOnArray(sizes, (index, size) => {
        const slotParams = {};
        util.forEachOnObject(keyConfig, (key, value) => {
          /* istanbul ignore next */
          slotParams[key] = value;
        });
        slotParams['cf'] = `${size[0]}x${size[1]}`;
        if (isWiidRequired) {
          slotParams['wiid'] = impressionID;
        }
        adUnits[ code ].bids.push({ bidder: adapterID, params: slotParams });
      });
      break;

    case 'adg':
      util.forEachOnArray(sizes, (index, size) => {
        const slotParams = {};
        util.forEachOnObject(keyConfig, (key, value) => {
          /* istanbul ignore next */
          slotParams[key] = value;
        });
        slotParams['width'] = size[0];
        slotParams['height'] = size[1];
        if (isWiidRequired) {
          slotParams['wiid'] = impressionID;
        }
        if (!(CONFIG.isSingleImpressionSettingEnabled() && isAdUnitsCodeContainBidder(adUnits, code, adapterID))) {
          adUnits[ code ].bids.push({ bidder: adapterID, params: slotParams });
        }
      });
      break;

    case 'yieldlab':
      util.forEachOnArray(sizes, (index, size) => {
        const slotParams = {};
        util.forEachOnObject(keyConfig, (key, value) => {
          /* istanbul ignore next */
          slotParams[key] = value;
        });
        slotParams['adSize'] = `${size[0]}x${size[1]}`;
        if (isWiidRequired) {
          slotParams['wiid'] = impressionID;
        }
        if (!(CONFIG.isSingleImpressionSettingEnabled() && isAdUnitsCodeContainBidder(adUnits, code, adapterID))) {
          adUnits[ code ].bids.push({ bidder: adapterID, params: slotParams });
        }
      });
      break;
    case 'ix':
    case 'indexExchange':
      /** Added case ix cause indexExchange bidder has changed its bidder code in server side
       * this will have impact in codegen to change its adapter code from indexexchange to ix
       * so added a case for the same.
      */

      if (slotParams['siteID']) {
        slotParams['siteId'] = slotParams['siteID'];
        delete slotParams['siteID'];
      }
      if (isWiidRequired) {
        slotParams['wiid'] = impressionID;
      }
      adUnits[code].bids.push({bidder: adapterID, params: slotParams});
      break;
    default:
      adUnits[code].bids.push({ bidder: adapterID, params: slotParams });
      break;
  }
}

export {pushAdapterParamsInAdunits};

function generatePbConf(adapterID, adapterConfig, activeSlots, adUnits, impressionID) {
  util.log(adapterID + CONSTANTS.MESSAGES.M1);

  /* istanbul ignore else */
  if (!adapterConfig) {
    return;
  }

  util.forEachGeneratedKey(
    adapterID,
    adUnits,
    adapterConfig,
    impressionID,
    [],
    activeSlots,
    CONFIG.isPrebidPubMaticAnalyticsEnabled() ? generatedKeyCallbackForPbAnalytics : generatedKeyCallback,
    // generatedKeyCallback,
    // serverSideEabled: do not set default bids as we do not want to throttle them at client-side
    true // !CONFIG.isServerSideAdapter(adapterID)
  );
}

/* start-test-block */
export {generatePbConf};

/* end-test-block */

function assignSingleRequestConfigForBidders(prebidConfig) {
  // todo: use forEachAdapter
  util.forEachOnObject(CONSTANTS.SRA_ENABLED_BIDDERS, adapterName => {
    if (util.isOwnProperty(CONF.adapters, adapterName)) {
      prebidConfig[adapterName] = {
        singleRequest: true
      };
    }
  });
}

export {assignSingleRequestConfigForBidders};

function assignUserSyncConfig(prebidConfig) {
  prebidConfig['userSync'] = {
    enableOverride: true,
    syncsPerBidder: 0,
    iframeEnabled: true,
    pixelEnabled: true,
    filterSettings: {
      iframe: {
        bidders: '*', // '*' means all bidders
        filter: 'include'
      }
    },
    enabledBidders: (() => {
      const arr = [];
      CONFIG.forEachAdapter(adapterID => {
        const adapterName = CONFIG.getAdapterNameForAlias(adapterID) || adapterID;
        if (!arr.includes(adapterName)) {
          arr.push(adapterName);
        }
      });
      return arr;
    })(),
    syncDelay: 2000, // todo: default is 3000 write image pixels 5 seconds after the auction
    aliasSyncEnabled: true
  };

  // removeIf(removeUserIdRelatedCode)
  if (CONFIG.isUserIdModuleEnabled()) {
    prebidConfig['userSync']['userIds'] = util.getUserIdConfiguration();
  }
  // endRemoveIf(removeUserIdRelatedCode)
}

export {assignUserSyncConfig};

function assignGdprConfigIfRequired(prebidConfig) {
  if (CONFIG.getGdpr()) {
    if (!prebidConfig['consentManagement']) {
      prebidConfig['consentManagement'] = {};
    }
    prebidConfig['consentManagement']['gdpr'] = {
      cmpApi: CONFIG.getCmpApi(),
      timeout: CONFIG.getGdprTimeout(),
      allowAuctionWithoutConsent: CONFIG.getAwc(), // Auction without consent
      defaultGdprScope: true
    };
    const gdprActionTimeout = COMMON_CONFIG.getGdprActionTimeout();
    if (gdprActionTimeout) {
      util.log(`GDPR IS ENABLED, TIMEOUT: ${prebidConfig['consentManagement']['gdpr']['timeout']}, ACTION TIMEOUT: ${gdprActionTimeout}`);
      prebidConfig['consentManagement']['gdpr']['actionTimeout'] = gdprActionTimeout;
    }
  }
}

export {assignGdprConfigIfRequired};

function assignCcpaConfigIfRequired(prebidConfig) {
  if (CONFIG.getCCPA()) {
    if (!prebidConfig['consentManagement']) {
      prebidConfig['consentManagement'] = {};
    }
    prebidConfig['consentManagement']['usp'] = {
      cmpApi: CONFIG.getCCPACmpApi(),
      timeout: CONFIG.getCCPATimeout(),
    };
  }
}

export {assignCcpaConfigIfRequired};

function assignCurrencyConfigIfRequired(prebidConfig) {
  if (CONFIG.getAdServerCurrency()) {
    // get AdServer currency from Config
    // Log in console
    util.log(CONSTANTS.MESSAGES.M26 + CONFIG.getAdServerCurrency());
    prebidConfig['currency'] = {
      'adServerCurrency': CONFIG.getAdServerCurrency(),
      'granularityMultiplier': CONFIG.getGranularityMultiplier(),
    };
  }
}

export {assignCurrencyConfigIfRequired};

function assignSchainConfigIfRequired(prebidConfig) {
  if (CONFIG.isSchainEnabled()) {
    prebidConfig['schain'] = CONFIG.getSchainObject();
  }
}

export {assignSchainConfigIfRequired};

function configureBidderAliasesIfAvailable() {
  if (util.isFunction(window[pbNameSpace].aliasBidder)) {
    CONFIG.forEachBidderAlias(alias => {
      window[pbNameSpace].aliasBidder(CONF.alias[alias], alias);
    })
  } else {
    util.logWarning('PreBid js aliasBidder method is not available');
  }
}

export {configureBidderAliasesIfAvailable};
function enablePrebidPubMaticAnalyticIfRequired() {
  if (CONFIG.isPrebidPubMaticAnalyticsEnabled() && util.isFunction(window[pbNameSpace].enableAnalytics)) {
    window[pbNameSpace].enableAnalytics({
      provider: 'pubmatic',
      options: {
        publisherId: CONFIG.getPublisherId(),
        profileId: CONFIG.getProfileID(),
        profileVersionId: CONFIG.getProfileDisplayVersionID(),
        identityOnly: (CONFIG.isUserIdModuleEnabled() ? 1 : 0)
      }
    });
  }
}

export {enablePrebidPubMaticAnalyticIfRequired};

function throttleAdapter(randomNumber, adapterID) {
  return !(randomNumber >= CONFIG.getAdapterThrottle(adapterID));
}

export {throttleAdapter};

function generateAdUnitsArray(activeSlots, impressionID) {
  const adUnits = {};// create ad-units for prebid
  const randomNumberBelow100 = util.getRandomNumberBelow100();

  CONFIG.forEachAdapter((adapterID, adapterConfig) => {
    // Assumption: all partners are running through PreBid,
    //  if we add any new parent-adapter, then code changes will be required
    /* istanbul ignore else */
    if (adapterID !== parentAdapterID) {
      // If we will be using PrebidServerBidAdapatar then we need to check throttling for
      // serverEnabled partners at client-side
      /* istanbul ignore if */
      if (CONFIG.usePBSAdapter() == true && CONFIG.isServerSideAdapter(adapterID)) {
        if (throttleAdapter(randomNumberBelow100, adapterID) == false) {
          generateConfig(adapterID, adapterConfig, activeSlots, adUnits, impressionID);
        } else {
          util.log(adapterID + CONSTANTS.MESSAGES.M2);
        }
      } else {
        // serverSideEabled: we do not want to throttle them at client-side
        /* istanbul ignore if */
        if (CONFIG.isServerSideAdapter(adapterID) || throttleAdapter(randomNumberBelow100, adapterID) == false) {
          generateConfig(adapterID, adapterConfig, activeSlots, adUnits, impressionID);
        } else {
          util.log(adapterID + CONSTANTS.MESSAGES.M2);
        }
      }
    }
  });

  // adUnits is object create array from it
  const adUnitsArray = [];
  for (const code in adUnits) {
    /* istanbul ignore else */
    if (util.isOwnProperty(adUnits, code)) {
      adUnitsArray.push(adUnits[code]);
    }
  }

  return adUnitsArray;
}

export {generateAdUnitsArray};

function generateConfig(adapterID, adapterConfig, activeSlots, adUnits, impressionID) {
  util.forEachOnObject(activeSlots, (j, slot) => {
    bidManager.setCallInitTime(slot.getDivID(), adapterID);
  });
  generatePbConf(adapterID, adapterConfig, activeSlots, adUnits, impressionID);
}
export {generateConfig};

// removeIf(removeLegacyAnalyticsRelatedCode)
function addOnBidResponseHandler() {
  if (util.isFunction(window[pbNameSpace].onEvent)) {
    if (!onEventAdded) {
      window[pbNameSpace].onEvent('bidResponse', pbBidStreamHandler);
      onEventAdded = true;
    }
  } else {
    util.logWarning('PreBid js onEvent method is not available');
  }
}
export {addOnBidResponseHandler};
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function addOnAuctionEndHandler() {
  if (util.isFunction(window[pbNameSpace].onEvent)) {
    if (!onAuctionEndEventAdded) {
      window[pbNameSpace].onEvent('auctionEnd', pbAuctionEndHandler);
      onAuctionEndEventAdded = true;
    }
  } else {
    util.logWarning('PreBid js onEvent method is not available');
  }
}
export {addOnAuctionEndHandler};
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
function addOnBidRequestHandler() {
  if (util.isFunction(window[pbNameSpace].onEvent)) {
    window[pbNameSpace].onEvent('bidRequested', pbBidRequestHandler);
  } else {
    util.logWarning('PreBid js onEvent method is not available');
  }
}
export {addOnBidRequestHandler};
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

function setPrebidConfig() {
  if (util.isFunction(window[pbNameSpace].setConfig) || typeof window[pbNameSpace].setConfig == 'function') {
    const prebidConfig = {
      debug: util.isDebugLogEnabled(),
      cache: {
        url: CONSTANTS.CONFIG.CACHE_URL + CONSTANTS.CONFIG.CACHE_PATH,
        ignoreBidderCacheKey: true
      },
      bidderSequence: 'random',
      disableAjaxTimeout: CONFIG.getDisableAjaxTimeout(),
      enableSendAllBids: CONFIG.getSendAllBidsStatus(),
      targetingControls: {
        alwaysIncludeDeals: true
      },
      testGroupId: parseInt(window.PWT.testGroupId || 0)
    };
    if (CONFIG.getPriceGranularity()) {
      prebidConfig['priceGranularity'] = CONFIG.getPriceGranularity();
    }

    if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === true) {
      prebidConfig['instreamTracking'] = {
        enabled: true
      }
    }

    window.PWT.ssoEnabled = CONFIG.isSSOEnabled() || false;

    getFloorsConfiguration(prebidConfig)

    assignUserSyncConfig(prebidConfig);
    assignGdprConfigIfRequired(prebidConfig);
    assignCcpaConfigIfRequired(prebidConfig);
    assignCurrencyConfigIfRequired(prebidConfig);
    assignSchainConfigIfRequired(prebidConfig);
    assignSingleRequestConfigForBidders(prebidConfig);
    assignPackagingInventoryConfig(prebidConfig);
    // if usePBSAdapter is 1 then add s2sConfig
    if (CONFIG.usePBSAdapter()) {
      gets2sConfig(prebidConfig);
    }
    // Check for yahoossp bidder and add property {mode: 'all'} to setConfig
    checkForYahooSSPBidder(prebidConfig);
    // Adding a hook for publishers to modify the Prebid Config we have generated
    util.handleHook(CONSTANTS.HOOKS.PREBID_SET_CONFIG, [ prebidConfig ]);
    // todo: stop supporting this hook let pubs use pbjs.requestBids hook
    // do not set any config below this line as we are executing the hook above

    window[pbNameSpace].setConfig(prebidConfig);
  } else {
    util.logWarning('PreBidJS setConfig method is not available');
  }
}

export {setPrebidConfig};

function realignPubmaticAdapters() {
  if (CONF.adapters && CONF.adapters['pubmatic']) {
    const pubmaticAdpater = {'pubmatic': CONF.adapters['pubmatic']};
    CONF.adapters = Object.assign(pubmaticAdpater, CONF.adapters);
  }
}

export {realignPubmaticAdapters};

function gets2sConfig(prebidConfig) {
  const bidderParams = {};
  const s2sBidders = CONFIG.getServerEnabledAdaptars();
  for (const key in CONF.alias) {
    defaultAliases[key] = CONF.alias[key];
  }
  const pubmaticAndAliases = CONFIG.getPubMaticAndAlias(s2sBidders);
  if (pubmaticAndAliases.length) {
    pubmaticAndAliases.forEach(bidder => {
      bidderParams[bidder] = {};
    })
  }

  prebidConfig['s2sConfig'] = {
    accountId: CONFIG.getPublisherId(),
    adapter: CONSTANTS.PBSPARAMS.adapter,
    enabled: true,
    bidders: s2sBidders,
    endpoint: CONSTANTS.PBSPARAMS.endpoint,
    syncEndpoint: CONSTANTS.PBSPARAMS.syncEndpoint,
    timeout: CONFIG.getTimeoutForPBSRequest(),
    secure: 1, // request needs secure assets pass 1
    extPrebid: {
      aliases: defaultAliases,
      bidderparams: bidderParams,
      targeting: {
        pricegranularity: CONFIG.getPriceGranularity()
      },
      isPrebidPubMaticAnalyticsEnabled: CONFIG.isPrebidPubMaticAnalyticsEnabled(),
      isUsePrebidKeysEnabled: CONFIG.isUsePrebidKeysEnabled(),
      macros: CONFIG.createMacros()
    }
  }
  // adding support for marketplace
  if (CONFIG.getMarketplaceBidders()) {
    prebidConfig['s2sConfig']['allowUnknownBidderCodes'] = true;
    prebidConfig['s2sConfig']['extPrebid']['alternatebiddercodes'] = {
      enabled: true,
      bidders: {
        pubmatic: {
          enabled: true,
          allowedbiddercodes: CONFIG.getMarketplaceBidders()
        }
      }
    }
  }
}

export {gets2sConfig};

function getFloorsConfiguration(prebidConfig) {
  if (CONFIG.isFloorPriceModuleEnabled() == true && CONFIG.getFloorSource() !== CONSTANTS.COMMON.EXTERNAL_FLOOR_WO_CONFIG) {
    prebidConfig['floors'] = {
      enforcement: {
        enforceJS: CONFIG.getFloorType()
      },
      auctionDelay: CONFIG.getFloorAuctionDelay(),
      endpoint: {
        url: CONFIG.getFloorJsonUrl()
      },
      additionalSchemaFields: {
        browser: util.getBrowserDetails,
        platform_id: util.getPltForFloor
      }
    }
  }
}

export {getFloorsConfiguration};

function checkForYahooSSPBidder(prebidConfig) {
  let isYahooAlias = false;
  const isYahooSSP = CONF.adapters.hasOwnProperty(CONSTANTS.YAHOOSSP);

  if (!isYahooSSP) {
    for (const bidder in CONF.alias) {
      if (CONFIG.getAdapterNameForAlias(bidder) == CONSTANTS.YAHOOSSP) {
        isYahooAlias = true;
      }
    }
  }
  if (isYahooSSP || isYahooAlias) {
    prebidConfig[CONSTANTS.YAHOOSSP] = {
      mode: 'all'
    }
  }
}

export {checkForYahooSSPBidder};

function assignPackagingInventoryConfig(prebidConfig) {
  prebidConfig['viewabilityScoreGeneration'] = {
    enabled: true
  }
}

export {assignPackagingInventoryConfig};

function getPbjsAdServerTargetingConfig() {
  // Todo: Handle send-all bids feature enabled case
  //  we will need to add bidder specific keys?? do we?
  // todo: refer constants for key names
  /*
    Todo:
      what if we do not add a handler for some keys? do we need to add handler to all if we want to add for one?
      does custom keys do not get used in send-all-bids?
      do we always need to update the prebid targeting keys config in?
      what keys in prebid can be re-used?
  */
  return [
    // todo: what abt hb_deal, hb_uuid(video?), hb_cache_id(video?), hb_cache_host(video?) ?
    {
      key: 'pwtpid', // hb_bidder
      val({bidderCode}) {
        return bidderCode;
      }
    }, {
      key: 'pwtsid', // hb_adid
      val({adId}) {
        return adId;
      }
    }, {
      key: 'pwtecp', // hb_pb
      val({cpm}) {
        // return bidResponse.pbMg;
        return (cpm || 0).toFixed(CONSTANTS.COMMON.BID_PRECISION);
      }
    }, {
      key: 'pwtsz', // hb_size
      val({size}) {
        return size;
      }
    }, {
      key: 'hb_source', // hb_source // we do not want it, so send empty, suppressEmptyKeys feature will prevent it being passed
      // do not change it in prebid.js project constants file
      val(bidResponse) {
        // return bidResponse.source;
        return '';
      }
    }, {
      key: 'pwtplt', // hb_format
      val({mediaType, videoCacheKey, native}) {
        // return bidResponse.mediaType;
        return (mediaType == 'video' && videoCacheKey) ? CONSTANTS.PLATFORM_VALUES.VIDEO : (native ? CONSTANTS.PLATFORM_VALUES.NATIVE : CONSTANTS.PLATFORM_VALUES.DISPLAY);
      }
    },
    {
      key: 'pwtdid', // hb_deal
      val({dealId}) { // todo: do we want to concat dealchannel as well?
        return dealId || '';
      }
    },
    {
      key: 'pwtdeal', // hb_deal
      val(bidResponse) { // todo: do we want to concat dealchannel as well?
        if (bidResponse.dealId) {
          bidResponse.dealChannel = bidResponse.dealChannel || 'PMP';
          return bidResponse.dealChannel + CONSTANTS.COMMON.DEAL_KEY_VALUE_SEPARATOR + bidResponse.dealId + CONSTANTS.COMMON.DEAL_KEY_VALUE_SEPARATOR + bidResponse.adId;
        }
        return '';
      }
    },
    {
      key: 'pwtbst', // our custom
      val(bidResponse) {
        return 1;
      }
    },
    {
      key: 'pwtpubid', // custom
      val(bidResponse) {
        return CONFIG.getPublisherId();
      }
    },
    {
      key: 'pwtprofid', // custom
      val(bidResponse) {
        return CONFIG.getProfileID();
      }
    },
    {
      key: 'pwtverid', // custom
      val(bidResponse) { // todo: empty value?
        return CONFIG.getProfileDisplayVersionID();
      }
    },
    {
      key: 'pwtcid', // custom
      val({mediaType, videoCacheKey}) { // todo: empty value?
        return (mediaType == 'video' && videoCacheKey) ? videoCacheKey : '';
      }
    }, {
      key: 'pwtcurl', // custom
      val({mediaType, videoCacheKey}) { // todo: empty value?
        return (mediaType == 'video' && videoCacheKey) ? CONSTANTS.CONFIG.CACHE_URL : '';
      }
    }, {
      key: 'pwtcpath', // custom
      val({mediaType, videoCacheKey}) { // todo: empty value?
        return (mediaType == 'video' && videoCacheKey) ? CONSTANTS.CONFIG.CACHE_PATH : '';
      }
    }, {
      key: 'pwtuuid', // custom
      val(bidResponse) { // todo: empty value?
        return '';
      }
    }
  ];
}

export {getPbjsAdServerTargetingConfig};

function setPbjsBidderSettingsIfRequired() {
  if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === false) {
    return;
  }

  window[pbNameSpace].bidderSettings = {
    'standard': {
      'suppressEmptyKeys': true // this boolean flag can be used to avoid sending those empty values to the ad server.
    }
  };

  if (CONFIG.isUsePrebidKeysEnabled() === false) {
    window[pbNameSpace].bidderSettings['standard']['adserverTargeting'] = getPbjsAdServerTargetingConfig();
  }

  // adding bidder level settings
  CONFIG.forEachAdapter(adapterID => {
    if (window[pbNameSpace].bidderSettings.hasOwnProperty(adapterID) === false) {
      window[pbNameSpace].bidderSettings[adapterID] = {};
      // adding marketplace params
      if (adapterID === 'pubmatic' && !!CONFIG.getMarketplaceBidders()) {
        window[pbNameSpace].bidderSettings[adapterID]['allowAlternateBidderCodes'] = true;
        window[pbNameSpace].bidderSettings[adapterID]['allowedAlternateBidderCodes'] = CONFIG.getMarketplaceBidders();
      }
      // adding bidCpmAdjustment
      window[pbNameSpace].bidderSettings[adapterID]['bidCpmAdjustment'] = (bidCpm, bid) => {
        return window.parseFloat((bidCpm * CONFIG.getAdapterRevShare(adapterID)).toFixed(CONSTANTS.COMMON.BID_PRECISION));
      }
    }
  });
}

export {setPbjsBidderSettingsIfRequired};

function pbjsBidsBackHandler(bidResponses, activeSlots) {
  util.log('In PreBid bidsBackHandler with bidResponses: ');
  util.log(bidResponses);
  setTimeout(window[pbNameSpace].triggerUserSyncs, 10);
  // TODO: this blockk is used only for analytics enabled thus it should be covered in callback function?
  //  callback function behaviour will be different for different controllers?
  //  diff behaviour can be managed in respective controller code
  //  making the callback related code changes will be good to manage respective code
  // we may not request bids for all slots from Prebid if we do not find mapping for a slot thus looping on activeSlots
  function setPossibleBidRecieved() {
    util.forEachOnArray(activeSlots, (i, activeSlot) => {
      bidManager.setAllPossibleBidsReceived(activeSlot.getDivID());
    });
  }
  if (CONFIG.getAdServerCurrency()) {
    // Added timeout for issue in GPT should execute dfp as soon as all bids are available
    setTimeout(setPossibleBidRecieved, 300);
  } else {
    setPossibleBidRecieved();
  }
}

export {pbjsBidsBackHandler};

// this function will be called by controllers,
// will take care of setting the config as it is configured thru UI
function initPbjsConfig() {
  if (!window[pbNameSpace]) { // todo: move this code owt.js
    util.logError('PreBid js is not loaded');
    return;
  }
  window[pbNameSpace].logging = util.isDebugLogEnabled();
  realignPubmaticAdapters();
  setPrebidConfig();
  configureBidderAliasesIfAvailable();
  enablePrebidPubMaticAnalyticIfRequired();
  setPbjsBidderSettingsIfRequired();
}
export {initPbjsConfig};

function fetchBids(activeSlots) {
  const impressionID = util.generateUUID();
  // todo:
  //  Accept a call back function, pass it from controllers only if pbjs-analytics is enabled
  //  if possible try to use the callback for all cases
  //  TRY not make many changes in GPT controller

  /* istanbul ignore else */
  if (!window[pbNameSpace]) { // todo: move this code owt.js
    util.logError('PreBid js is not loaded');
    return;
  }

  // calling some bid-manager functions to reset, and set new sizes
  // todo: can be moved to a function
  util.forEachOnArray(activeSlots, (key, slot) => {
    const divID = slot.getDivID();
    bidManager.resetBid(divID, impressionID);
    bidManager.setSizes(divID, util.generateSlotNamesFromPattern(slot, '_W_x_H_'));
  });

  // todo: this is the function that basically puts bidder params in all adUnits, expose it separately
  const adUnitsArray = generateAdUnitsArray(activeSlots, impressionID);

  /* istanbul ignore else */
  if (adUnitsArray.length > 0 && window[pbNameSpace]) {
    try {
      /* With prebid 2.0.0 it has started using FunHooks library which provides
         proxy object instead of wrapper function by default so in case of safari and IE
          below check of util gives us Object instead of function hence return false and does
        not work on safari and ie. Introduced one more check of typeof to check for function.
        This if code is just safe check and may be removed in near future.
      */
      /* istanbul ignore else */

      if (util.isFunction(window[pbNameSpace].requestBids) || typeof window[pbNameSpace].requestBids == 'function') {
        // Adding a hook for publishers to modify the adUnits we are passing to Prebid
        util.handleHook(CONSTANTS.HOOKS.PREBID_REQUEST_BIDS, [ adUnitsArray ]);

        // removeIf(removeLegacyAnalyticsRelatedCode)
        if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === false) {
          // we do not want this call when we have PrebidAnalytics enabled
          addOnBidResponseHandler();
          addOnBidRequestHandler();
          addOnAuctionEndHandler();
        }
        // endRemoveIf(removeLegacyAnalyticsRelatedCode)

        window[pbNameSpace].removeAdUnit();
        window[pbNameSpace].addAdUnits(adUnitsArray);
        window[pbNameSpace].requestBids({
          bidsBackHandler(bidResponses) {
            pbjsBidsBackHandler(bidResponses, activeSlots);
          },
          timeout: CONFIG.getTimeout() - CONSTANTS.CONFIG.TIMEOUT_ADJUSTMENT
        });
      } else {
        util.log('PreBid js requestBids function is not available');
        return;
      }
    } catch (e) {
      util.logError('Error occured in calling PreBid.');
      util.logError(e);
    }
  }
}

/* start-test-block */
export {fetchBids};

/* end-test-block */

// returns the highest bid and its key value pairs
function getBid(divID) {
  const wb = window[pbNameSpace].getHighestCpmBids([divID])[0] || null;
  if (wb) {
    wb.adHtml = wb.ad;
    wb.adapterID = wb.bidder;
    wb.netEcpm = wb.cpm;
    wb.grossEcpm = wb.originalCpm;
  }

  const outputObj = {
    wb,
    kvp: window[pbNameSpace].getAdserverTargetingForAdUnitCode([divID]) || null
  };
  if (CONFIG.isPrebidPubMaticAnalyticsEnabled() && outputObj.kvp['pwtdeal']) {
    delete outputObj.kvp['pwtdeal'];// Check for null object && usePrebidAnalyticsAdapter
  }
  return outputObj;
}

export {getBid};
