let CONFIG = {};
let CONSTANTS = {};
let util = {};
let bidManager = {};
let SLOT = {};
let prebid = {};

//var usePrebidKeys = {};
//var isPrebidPubMaticAnalyticsEnabled = {};

export function initializeModule(customUtils){
  CONFIG = customUtils.CONFIG;
  CONSTANTS = customUtils.CONSTANTS;
  util = customUtils.util;
  bidManager = customUtils.bidManager;
  SLOT = customUtils.SLOT;
  prebid = customUtils.prebid;

  //usePrebidKeys = CONFIG.isUsePrebidKeysEnabled();
  // isPrebidPubMaticAnalyticsEnabled = CONFIG.isPrebidPubMaticAnalyticsEnabled();
  init(window);
}


// ToDo: add a functionality / API to remove extra added wrpper keys
var wrapperTargetingKeys = {}; // key is div id

/* start-test-block */
export { wrapperTargetingKeys };

/* end-test-block */

// ToDo: is this required in first phase?
const slotSizeMapping = {}; // key is div id

/* start-test-block */
export { slotSizeMapping };

/* end-test-block */

let windowReference = null;
// const refThis = this;

function setWindowReference(win) {
  if (util.isObject(win)) {
    windowReference = win;
  }
}

/* start-test-block */
export { setWindowReference };

/* end-test-block */

function getWindowReference() {
  return windowReference;
}

/* start-test-block */
export { getWindowReference };

/* end-test-block */

function getAdUnitIndex(currentGoogleSlot) { // TDD, i/o : done
  let index = 0;
  try {
    const adUnitIndexString = currentGoogleSlot.getSlotId().getId().split('_');
    index = parseInt(adUnitIndexString[adUnitIndexString.length - 1]);
  } catch (ex) { } // eslint-disable-line no-empty
  return index;
}

/* start-test-block */
export { getAdUnitIndex };

/* end-test-block */

// ToDo: this function may not be needed
function defineWrapperTargetingKey(key) {
  /* istanbul ignore else */
  if (!util.isObject(wrapperTargetingKeys)) {
    wrapperTargetingKeys = {};
  }
  wrapperTargetingKeys[key] = '';
}

/* start-test-block */
export { defineWrapperTargetingKey };

/* end-test-block */

function defineWrapperTargetingKeys(object) {
  const output = {};
  util.forEachOnObject(object, (key, value) => {
    output[value] = '';
  });
  return output;
}

/* start-test-block */
export { defineWrapperTargetingKeys };

/* end-test-block */

// removeIf(removeLegacyAnalyticsRelatedCode)
function initSafeFrameListener(theWindow) {
  if (!theWindow.PWT.safeFrameMessageListenerAdded) {
    util.addMessageEventListenerForSafeFrame(theWindow);
    theWindow.PWT.safeFrameMessageListenerAdded = true;
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
/* start-test-block */
export { initSafeFrameListener };

/* end-test-block */
// endRemoveIf(removeLegacyAnalyticsRelatedCode)

function validateAdUnitObject(anAdUnitObject) {
  if (!util.isObject(anAdUnitObject)) {
    util.logError('An AdUnitObject should be an object', anAdUnitObject);
    return false;
  }

  if (!util.isString(anAdUnitObject.code)) {
    util.logError('An AdUnitObject should have a property named code and it should be a string', anAdUnitObject);
    return false;
  }

  if (!util.isString(anAdUnitObject.divId)) {
    util.logError('An AdUnitObject should have a property named divId and it should be a string', anAdUnitObject);
    return false;
  }

  if (!util.isString(anAdUnitObject.adUnitId)) {
    util.logError('An AdUnitObject should have a property named adUnitId and it should be a string', anAdUnitObject);
    return false;
  }

  if (!util.isString(anAdUnitObject.adUnitIndex)) {
    util.logError('An AdUnitObject should have a property named adUnitIndex and it should be a string', anAdUnitObject);
    return false;
  }

  if (!util.isObject(anAdUnitObject.mediaTypes)) {
    util.logError('An AdUnitObject should have a property named mediaTypes and it should be an object', anAdUnitObject);
    return false;
  }

  if (!util.isObject(anAdUnitObject.mediaTypes.banner) && !util.isObject(anAdUnitObject.mediaTypes.native) && !util.isObject(anAdUnitObject.mediaTypes.video)) {
    util.logError('An anAdUnitObject.mediaTypes should atleast have a property named banner or native or video and it should be an object', anAdUnitObject);
    return false;
  }

  if (util.isObject(anAdUnitObject.mediaTypes.banner) && !util.isArray(anAdUnitObject.mediaTypes.banner.sizes)) {
    util.logError('An anAdUnitObject.mediaTypes.banner should have a property named sizes and it should be an array', anAdUnitObject);
    return false;
  }

  return true;
}

/* start-test-block */
export { validateAdUnitObject };

/* end-test-block */

function getAdSlotSizesArray(anAdUnitObject) {
  // ToDo: need to habdle fluid sizes
  // ToDo: for now supporting only banner sizes, need to support native as well
  if (anAdUnitObject && anAdUnitObject.mediaTypes) {
    if (anAdUnitObject.mediaTypes.banner && util.isArray(anAdUnitObject.mediaTypes.banner.sizes)) {
      return anAdUnitObject.mediaTypes.banner.sizes;
    }
    // TODO : Confirm about the below configuration and correct if needed
    // Commenting below code to remove custom handling of sizes and will be handled using adSlot.sizes
    // Uncommenting and making behaviour same as to have player size or w and h as mandatory.
    if (anAdUnitObject.mediaTypes.video) {
      if (!util.isArray(anAdUnitObject.mediaTypes.video.playerSize) && !(anAdUnitObject.mediaTypes.video.w && anAdUnitObject.mediaTypes.video.h)) {
        util.logError(`For slot video playersize or w,h is not defined and may not request bids from SSP for this slot. ${JSON.stringify(anAdUnitObject)}`);
        return [];
      }
    }
    if (anAdUnitObject.mediaTypes.native || anAdUnitObject.mediaTypes.video) {
      return anAdUnitObject.sizes;
    }
    // TODO : Also handle native only configuration
  }
  return [];
}

/* start-test-block */
export { getAdSlotSizesArray };

/* end-test-block */

function findWinningBidAndGenerateTargeting(divId) {
  let data;
  if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === true) {
    data = prebid.getBid(divId);
    // todo: we might need to change some proprty names in wb (from PBJS)
  } else {
    // removeIf(removeLegacyAnalyticsRelatedCode)
    data = bidManager.getBid(divId);
    // endRemoveIf(removeLegacyAnalyticsRelatedCode)
  }
  const winningBid = data.wb || null;
  const keyValuePairs = data.kvp || null;
  const ignoreTheseKeys = !CONFIG.isUsePrebidKeysEnabled() ? CONSTANTS.IGNORE_PREBID_KEYS : {};

  // removeIf(removeLegacyAnalyticsRelatedCode)
  /* istanbul ignore else */
  if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === false && winningBid && winningBid.getNetEcpm() > 0) {
    bidManager.setStandardKeys(winningBid, keyValuePairs);
  }
  // endRemoveIf(removeLegacyAnalyticsRelatedCode)

  // attaching keyValuePairs from adapters
  util.forEachOnObject(keyValuePairs, key => {
    // if winning bid is not pubmatic then remove buyId targeting key. Ref : UOE-5277
    /* istanbul ignore else */
    if (util.isOwnProperty(ignoreTheseKeys, key) || util.isOwnProperty({ 'pwtpb': 1 }, key) || (winningBid && winningBid.adapterID !== 'pubmatic' && util.isOwnProperty({ 'hb_buyid_pubmatic': 1, 'pwtbuyid_pubmatic': 1 }, key))) {
      delete keyValuePairs[key];
    } else {
      defineWrapperTargetingKey(key);
    }
  });

  let wb = null;
  if (winningBid) {
    wb = {};
    wb.adHtml = winningBid.adHtml;
    wb.adapterID = winningBid.adapterID;
    wb.grossEcpm = winningBid.grossEcpm;
    wb.netEcpm = winningBid.netEcpm;
    wb.height = winningBid.height;
    wb.width = winningBid.width;
  }

  return {
    wb,
    kvp: keyValuePairs
  };
}

/* start-test-block */
export { findWinningBidAndGenerateTargeting };

/* end-test-block */

function origCustomServerExposedAPI(arrayOfAdUnits, callbackFunction) {
  // GDPR.getUserConsentDataFromCMP(); // Commenting this as GDPR will be handled by Prebid and we won't be seding GDPR info to tracker and logger

  if (!util.isArray(arrayOfAdUnits)) {
    util.error('First argument to PWT.requestBids API, arrayOfAdUnits is mandatory and it should be an array.');
    callbackFunction(arrayOfAdUnits);
    return;
  }

  if (!util.isFunction(callbackFunction)) {
    util.error('Second argument to PWT.requestBids API, callBackFunction is mandatory and it should be a function.');
    return;
  }

  const qualifyingSlots = [];
  const mapOfDivToCode = {};
  const qualifyingSlotDivIds = [];
  util.forEachOnArray(arrayOfAdUnits, (index, anAdUnitObject) => {
    if (validateAdUnitObject(anAdUnitObject)) { // returns true for valid adUnit
      const dmSlotName = anAdUnitObject.code;
      const slot = SLOT.createSlot(dmSlotName);
      window.PWT.adUnits = window.PWT.adUnits || {};
      window.PWT.adUnits[dmSlotName] = anAdUnitObject;
      // IMPORTANT:: bidManager stores all data at divId level but in custom controller, divId is not mandatory.
      // so we woll set value of code to divId if divId is not present
      // also we will pass array of divId to the bidManager.getAllPartnersBidStatuses API
      slot.setDivID(anAdUnitObject.divId || dmSlotName);
      slot.setPubAdServerObject(anAdUnitObject);
      slot.setAdUnitID(anAdUnitObject.adUnitId || '');
      slot.setAdUnitIndex(anAdUnitObject.adUnitIndex || 0);
      slot.setSizes(getAdSlotSizesArray(anAdUnitObject));
      qualifyingSlots.push(slot);
      mapOfDivToCode[slot.getDivID()] = slot.getName();
      qualifyingSlotDivIds.push(slot.getDivID());
      util.createVLogInfoPanel(slot.getDivID(), slot.getSizes());
    }
  });

  if (qualifyingSlots.length == 0) {
    util.error('There are no qualifyingSlots, so not calling bidders.');
    callbackFunction(arrayOfAdUnits);
    return;
  }

  // new approach without adapter-managers
  prebid.fetchBids(qualifyingSlots);

  const posTimeoutTime = Date.now() + CONFIG.getTimeout(); // post timeout condition
  const intervalId = window.setInterval(() => {
    // todo: can we move this code to a function?
    if (bidManager.getAllPartnersBidStatuses(window.PWT.bidMap, qualifyingSlotDivIds) || Date.now() >= posTimeoutTime) {
      clearInterval(intervalId);
      // removeIf(removeLegacyAnalyticsRelatedCode)
      if (CONFIG.isPrebidPubMaticAnalyticsEnabled() === false) {
        // after some time call fire the analytics pixel
        setTimeout(() => {
          bidManager.executeAnalyticsPixel();
        }, 2000);
      }
      // endRemoveIf(removeLegacyAnalyticsRelatedCode)

      const winningBids = {}; // object:: { code : response bid or just key value pairs }
      // we should loop on qualifyingSlotDivIds to avoid confusion if two parallel calls are fired to our PWT.requestBids
      util.forEachOnArray(qualifyingSlotDivIds, (index, divId) => {
        const code = mapOfDivToCode[divId];
        winningBids[code] = findWinningBidAndGenerateTargeting(divId);
        // we need to delay the realignment as we need to do it post creative rendering :)
        // delaying by 1000ms as creative rendering may tke time
        setTimeout(util.realignVLogInfoPanel, 1000, divId);
      });

      // for each adUnit in arrayOfAdUnits find the winningBids, we need to return this updated arrayOfAdUnits
      util.forEachOnArray(arrayOfAdUnits, (index, anAdUnitObject) => {
        if (winningBids.hasOwnProperty(anAdUnitObject.code)) {
          anAdUnitObject.bidData = winningBids[anAdUnitObject.code];
        }
      });

      callbackFunction(arrayOfAdUnits);
    }
  }, 10); // check every 10 milliseconds if we have all bids or timeout has been happened.
}

/* start-test-block */
export { origCustomServerExposedAPI };

/* end-test-block */

/*
  Input:
    arrayOfAdUnits
      [
        anAdUnitObject
        {
          code: "some-pub-friendly-unique-name", // mandatory
          divId: "div-id-where-slot-will-render", // mandatory
          adUnitId: "ad_unit-id-from-DFP", // mandatory
          adUnitIndex: "ad-unit-index", // necessary in case of PubMatic, can be derrived by our code by simply incrementing used adUnitIds
          mediaTypes: { // mandatory
            banner: { // mandatory in first phase? or atleast one type of mediaTypes should be present
              sizes: [ [300, 250], [300, 300] ] // array of sizes
            }
          }
        }
      ]
    callbackFunction
      a function that accepts response
*/
function customServerExposedAPI(arrayOfAdUnits, callbackFunction) {
  if (window.PWT.isSyncAuction) {
    origCustomServerExposedAPI(arrayOfAdUnits, callbackFunction);
  } else {
    setTimeout(() => {
      origCustomServerExposedAPI(arrayOfAdUnits, callbackFunction)
    }, 0);
  }
}

/* start-test-block */
export { customServerExposedAPI };

/* end-test-block */

/*
  this function will generate the required config for our APIs
  Input:
    Expects an array of GoogleTagSlots
  Output:
    array of object in required format
*/
function generateConfForGPT(arrayOfGPTSlots) {
  const gptConfArray = [];

  if (!util.isArray(arrayOfGPTSlots)) {
    util.error('first argument to generateConfForGPT should be an array');
    return gptConfArray;
  }

  util.forEachOnArray(arrayOfGPTSlots, (index, googleSlot) => {
    let adUnitId = '';
    let adUnitIndex = '';
    let divId = '';
    const sizes = [];
    let code = '';

    if (util.isObject(googleSlot)) {
      if (util.isFunction(googleSlot.getAdUnitPath)) {
        adUnitId = googleSlot.getAdUnitPath();
      }

      if (util.isFunction(googleSlot.getSlotId)) {
        const slotID = googleSlot.getSlotId();
        adUnitIndex = `${getAdUnitIndex(googleSlot)}`;

        // TODO: move to GPT specific code to small functions
        /* istanbul ignore else */
        if (slotID && util.isFunction(slotID.getDomId)) {
          divId = slotID.getDomId();
          code = divId;
        }
      }

      if (util.isFunction(googleSlot.getSizes)) {
        /*
          The DFP API, googleSlot.getSizes(window.innerWidth, window.innerHeight) upon passing the two arguments, returns applied sizes as per size-mapping.
         */
        util.forEachOnArray(googleSlot.getSizes(window.innerWidth, window.innerHeight), (index, sizeObj) => {
          /* istanbul ignore else  */
          if (util.isFunction(sizeObj.getWidth) && util.isFunction(sizeObj.getHeight)) {
            sizes.push([sizeObj.getWidth(), sizeObj.getHeight()]);
          } else {
            util.log(`${divId}, size object does not have getWidth and getHeight method. Ignoring: `);
            util.log(sizeObj);
          }
        });
      }
    }

    gptConfArray.push({
      code,
      divId,
      adUnitId,
      adUnitIndex,
      mediaTypes: util.getAdUnitConfig(sizes, googleSlot).mediaTypeObject,
      sizes
    });
  });

  return gptConfArray;
}

/* start-test-block */
export { generateConfForGPT };

/* end-test-block */

function addKeyValuePairsToGPTSlots(arrayOfAdUnits) {
  if (!util.isArray(arrayOfAdUnits)) {
    util.error('array is expected');
  }

  let arrayOfGPTSlots = [];
  if (util.isObject(window.googletag) && util.isFunction(window.googletag.pubads)) {
    arrayOfGPTSlots = window.googletag.pubads().getSlots();
  }

  const mapOfDivIdToGoogleSlot = {};
  util.forEachOnArray(arrayOfGPTSlots, (index, googleSlot) => {
    if (util.isFunction(googleSlot.getSlotId)) {
      const slotID = googleSlot.getSlotId();
      if (slotID && util.isFunction(slotID.getDomId)) {
        mapOfDivIdToGoogleSlot[slotID.getDomId()] = googleSlot;
      } else {
        util.error('slotID.getDomId is not a function');
      }
    } else {
      util.error('googleSlot.getSlotId is not a function');
    }
  });

  util.forEachOnArray(arrayOfAdUnits, (index, adUnit) => {
    if (util.isOwnProperty(mapOfDivIdToGoogleSlot, adUnit.divId)) {
      const googleSlot = mapOfDivIdToGoogleSlot[adUnit.divId];
      if (util.isObject(adUnit) && util.isObject(adUnit.bidData) && util.isObject(adUnit.bidData.kvp)) {
        util.forEachOnObject(adUnit.bidData.kvp, (key, value) => {
          googleSlot.setTargeting(key, [value]);
        });
      }
    } else {
      util.error(`GPT-Slot not found for divId: ${adUnit.divId}`);
    }
  });
}

/* start-test-block */
export { addKeyValuePairsToGPTSlots };

/* end-test-block */

function removeKeyValuePairsFromGPTSlots(arrayOfGPTSlots) {
  // ToDo: need some fail-safe validations/checks
  /* istanbul ignore else */
  util.forEachOnArray(arrayOfGPTSlots, (index, currentGoogleSlot) => {
    const targetingMap = {};
    if (util.isFunction(currentGoogleSlot.getTargetingKeys)) {
      util.forEachOnArray(currentGoogleSlot.getTargetingKeys(), (index, key) => {
        targetingMap[key] = currentGoogleSlot.getTargeting(key);
      });
    }
    // now clear all targetings
    if (util.isFunction(currentGoogleSlot.clearTargeting)) {
      currentGoogleSlot.clearTargeting();
    }
    // now set all settings from backup
    util.forEachOnObject(targetingMap, (key, value) => {
      if (!util.isOwnProperty(wrapperTargetingKeys, key)) {
        if (util.isFunction(currentGoogleSlot.setTargeting)) {
          currentGoogleSlot.setTargeting(key, value);
        }
      }
    });
  });
}

/* start-test-block */
export { removeKeyValuePairsFromGPTSlots };

/* end-test-block */

export function init(win) {
  CONFIG.initConfig();
  if (util.isObject(win)) {
    setWindowReference(win);

    // removeIf(removeLegacyAnalyticsRelatedCode)
    initSafeFrameListener(win);
    // endRemoveIf(removeLegacyAnalyticsRelatedCode)
    prebid.initPbjsConfig();
    win.PWT.requestBids = customServerExposedAPI;
    win.PWT.generateConfForGPT = generateConfForGPT;
    win.PWT.addKeyValuePairsToGPTSlots = addKeyValuePairsToGPTSlots;
    win.PWT.removeKeyValuePairsFromGPTSlots = removeKeyValuePairsFromGPTSlots;
    wrapperTargetingKeys = defineWrapperTargetingKeys(CONSTANTS.WRAPPER_TARGETING_KEYS);
    return true;
  } else {
    return false;
  }
}
