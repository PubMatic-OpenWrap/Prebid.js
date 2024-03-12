/* eslint-disable prebid/validate-imports */
// import * as CONFIG from '../config.js';
// import * as CONSTANTS from '../constants.js';
// import * as util from '../util.js';
// import * as bidManager from '../bidManager.js';
// import * as SLOT from '../slot.js';
// import * as prebid from '../adapters/prebid.js';
// import * as IdHub from './idhub.js';

let CONFIG = {};
let CONSTANTS = {};
let util = {};
let bidManager = {};
let SLOT = {};
let prebid = {};
let IdHub = {};
var usePrebidKeys = {};
var isPrebidPubMaticAnalyticsEnabled = {};

export function initializeModule(gptUtils, idhubUtils){
  CONFIG = gptUtils.OW.CONFIG;
  CONSTANTS = gptUtils.OW.CONSTANTS;
  util = gptUtils.OW.util;
  bidManager = gptUtils.OW.bidManager;
  SLOT = gptUtils.OW.SLOT;
  prebid = gptUtils.OW.prebid;
  IdHub = idhubUtils.IdHub;

  usePrebidKeys = CONFIG.isUsePrebidKeysEnabled();
  isPrebidPubMaticAnalyticsEnabled = CONFIG.isPrebidPubMaticAnalyticsEnabled();
  init(window);
}



var displayHookIsAdded = false;

/* start-test-block */
export { displayHookIsAdded };

/* end-test-block */
let disableInitialLoadIsSet = false;
const sendTargetingInfoIsSet = true;

// todo: combine these maps
var wrapperTargetingKeys = {}; // key is div id

/* start-test-block */
export { wrapperTargetingKeys };

/* end-test-block */
const slotsMap = {}; // key is div id, stores the mapping of divID ==> googletag.slot

/* start-test-block */
export { slotsMap };

/* end-test-block */

const gptTargetingMap = {};
let windowReference = null;

// const refThis = this;

function setWindowReference(win) { // TDD, i/o: done
  if (util.isObject(win)) {
    windowReference = win;
  }
}

/* start-test-block */
export { setWindowReference };

/* end-test-block */

function getWindowReference() { // TDD, i/o: done
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

export { getAdUnitIndex };

function getAdSlotSizesArray(divID, currentGoogleSlot) { // TDD, i/o : doness
  const adslotSizesArray = [];
  /* istanbul ignore else  */
  if (util.isFunction(currentGoogleSlot.getSizes)) {
    // googleSlot.getSizes() returns applicable sizes as per sizemapping if we pass current available view-port width and height
    util.forEachOnArray(currentGoogleSlot.getSizes(window.innerWidth, window.innerHeight), (index, sizeObj) => {
      /* istanbul ignore else  */
      if (util.isFunction(sizeObj.getWidth) && util.isFunction(sizeObj.getHeight)) {
        adslotSizesArray.push([sizeObj.getWidth(), sizeObj.getHeight()]);
      } else {
        util.logWarning(`${divID}, size object does not have getWidth and getHeight method. Ignoring: `);
        util.logWarning(sizeObj);
      }
    });
  }

  return adslotSizesArray;
}

/* start-test-block */
export { getAdSlotSizesArray };

/* end-test-block */

function setDisplayFunctionCalledIfRequired(slot, arg) { // TDD, i/o : done
  /* istanbul ignore else */
  if (util.isObject(slot) && util.isFunction(slot.getDivID)) {
    /* istanbul ignore else */
    if (util.isArray(arg) && arg[0] && arg[0] == slot.getDivID()) {
      slot.setDisplayFunctionCalled(true);
      slot.setArguments(arg);
    }
  }
}

/* start-test-block */
export { setDisplayFunctionCalledIfRequired };

/* end-test-block */

function storeInSlotsMap(dmSlotName, currentGoogleSlot, isDisplayFlow) { // TDD, i/o : done
  // note: here dmSlotName is actually the DivID
  if (!util.isOwnProperty(slotsMap, dmSlotName)) {
    const slot = SLOT.createSlot(dmSlotName);
    slot.setDivID(dmSlotName);
    slot.setPubAdServerObject(currentGoogleSlot);
    slot.setAdUnitID(currentGoogleSlot.getAdUnitPath());
    slot.setAdUnitIndex(getAdUnitIndex(currentGoogleSlot));
    slot.setSizes(getAdSlotSizesArray(dmSlotName, currentGoogleSlot));
    slot.setStatus(CONSTANTS.SLOT_STATUS.CREATED);
    // todo: find and set position
    /* istanbul ignore else */
    if (sendTargetingInfoIsSet && util.isObject(JSON) && util.isFunction(JSON.stringify)) {
      util.forEachOnArray(currentGoogleSlot.getTargetingKeys(), (index, value) => {
        slot.setKeyValue(value, currentGoogleSlot.getTargeting(value));
      });
    }

    slotsMap[dmSlotName] = slot;
    // googleSlot.getSizes() returns applicable sizes as per sizemapping if we pass current available view-port width and height
    util.createVLogInfoPanel(dmSlotName, slot.getSizes(window.innerWidth, window.innerHeight));
  } else {
    /* istanbul ignore else */
    if (!isDisplayFlow) {
      slotsMap[dmSlotName].setSizes(getAdSlotSizesArray(dmSlotName, currentGoogleSlot));
    }
  }
}

/* start-test-block */
export { storeInSlotsMap };

/* end-test-block */

function generateSlotName(googleSlot) { // TDD, i/o : done
  if (util.isObject(googleSlot) && util.isFunction(googleSlot.getSlotId)) {
    const slotID = googleSlot.getSlotId();
    /* istanbul ignore else */
    if (slotID && util.isFunction(slotID.getDomId)) {
      return slotID.getDomId();
    }
  }
  return '';
}

/* start-test-block */
export { generateSlotName };

/* end-test-block */

function updateSlotsMapFromGoogleSlots(googleSlotsArray, argumentsFromCallingFunction, isDisplayFlow) { // TDD, i/o : done
  util.log('Generating slotsMap');

  util.forEachOnArray(googleSlotsArray, (index, currentGoogleSlot) => {
    const dmSlotName = generateSlotName(currentGoogleSlot);
    storeInSlotsMap(dmSlotName, currentGoogleSlot, isDisplayFlow);
    if (isDisplayFlow && util.isOwnProperty(slotsMap, dmSlotName)) {
      setDisplayFunctionCalledIfRequired(slotsMap[dmSlotName], argumentsFromCallingFunction);
    }
  });

  window.PWT.adUnits = window.PWT.adUnits || {};
  Object.keys(slotsMap).forEach(key => {
    const activeSlot = slotsMap[key];
    window.PWT.adUnits[activeSlot.divID] = {
      divID: activeSlot.divID,
      adUnitId: activeSlot.adUnitID,
      mediaTypes: util.getAdUnitConfig(activeSlot.sizes, activeSlot).mediaTypeObject
    }
  });

  util.log(slotsMap);
}

/* start-test-block */
export { updateSlotsMapFromGoogleSlots };

/* end-test-block */

// todo: pass slotsMap in every function that uses it
function getStatusOfSlotForDivId(divID) { // TDD, i/o : done
  if (typeof divID == 'object' && typeof (divID.getSlotId) == 'function') {
    if (typeof (divID.getSlotId().getDomId) == 'function') {
      divID = divID.getSlotId().getDomId();
    }
  }
  /* istanbul ignore else */
  if (util.isOwnProperty(slotsMap, divID)) {
    return slotsMap[divID].getStatus();
  }
  return CONSTANTS.SLOT_STATUS.DISPLAYED;
}

/* start-test-block */
export { getStatusOfSlotForDivId };

/* end-test-block */

function updateStatusAfterRendering(divID, isRefreshCall) { // TDD, i/o : done
  /* istanbul ignore else */
  if (util.isOwnProperty(slotsMap, divID)) {
    slotsMap[divID].updateStatusAfterRendering(isRefreshCall);
  }
}

/* start-test-block */
export { updateStatusAfterRendering };

/* end-test-block */

function getSlotNamesByStatus(statusObject) { // TDD, i/o : done
  const slots = [];
  util.forEachOnObject(slotsMap, (key, slot) => {
    /* istanbul ignore else */
    if (util.isOwnProperty(statusObject, slot.getStatus())) {
      slots.push(key);
    }
  });
  return slots;
}

/* start-test-block */
export { getSlotNamesByStatus };

/* end-test-block */

function removeDMTargetingFromSlot(key) { // TDD, i/o : done
  let currentGoogleSlot;
  const targetingMap = {};
  /* istanbul ignore else */
  if (util.isOwnProperty(slotsMap, key)) {
    currentGoogleSlot = slotsMap[key].getPubAdServerObject();
    util.forEachOnArray(currentGoogleSlot.getTargetingKeys(), (index, key) => {
      targetingMap[key] = currentGoogleSlot.getTargeting(key);
    });
    // now clear all targetings
    currentGoogleSlot.clearTargeting();
    // now set all settings from backup
    util.forEachOnObject(targetingMap, (key, value) => {
      if (!util.isOwnProperty(wrapperTargetingKeys, key)) {
        currentGoogleSlot.setTargeting(key, value);
      }
    });
  }
}

/* start-test-block */
export { removeDMTargetingFromSlot };

/* end-test-block */

function updateStatusOfQualifyingSlotsBeforeCallingAdapters(slotNames, argumentsFromCallingFunction, isRefreshCall) { // TDD : done
  util.forEachOnArray(slotNames, (index, slotName) => {
    /* istanbul ignore else */
    if (util.isOwnProperty(slotsMap, slotName)) {
      const slot = slotsMap[slotName];
      slot.setStatus(CONSTANTS.SLOT_STATUS.PARTNERS_CALLED);
      /* istanbul ignore else */
      if (isRefreshCall) {
        removeDMTargetingFromSlot(slotName);
        slot.setRefreshFunctionCalled(true);
        slot.setArguments(argumentsFromCallingFunction);
      }
    }
  });
}

/* start-test-block */
export { updateStatusOfQualifyingSlotsBeforeCallingAdapters };

/* end-test-block */

function arrayOfSelectedSlots(slotNames) { // TDD, i/o : done
  const output = [];
  util.forEachOnArray(slotNames, (index, slotName) => {
    output.push(slotsMap[slotName]);
  });
  return output;
}

/* start-test-block */
export { arrayOfSelectedSlots };

/* end-test-block */

function defineWrapperTargetingKeys(object) { // TDD, i/o : done
  const output = {};
  util.forEachOnObject(object, (key, value) => {
    output[value] = '';
  });
  return output;
}

/* start-test-block */
export { defineWrapperTargetingKeys };

/* end-test-block */

function findWinningBidAndApplyTargeting(divID) { // TDD, i/o : done
  let data;
  if (isPrebidPubMaticAnalyticsEnabled) {
    data = prebid.getBid(divID);
  } else {
    data = bidManager.getBid(divID);
  }
  const winningBid = data.wb || null;
  const keyValuePairs = data.kvp || {};
  const googleDefinedSlot = slotsMap[divID].getPubAdServerObject();
  const ignoreTheseKeys = !usePrebidKeys ? CONSTANTS.IGNORE_PREBID_KEYS : {};

  util.log(`DIV: ${divID} winningBid: `);
  util.log(winningBid);

  /* istanbul ignore else */
  if (isPrebidPubMaticAnalyticsEnabled === false && winningBid && winningBid.getNetEcpm() > 0) {
    slotsMap[divID].setStatus(CONSTANTS.SLOT_STATUS.TARGETING_ADDED);
    bidManager.setStandardKeys(winningBid, keyValuePairs);
  };

  // Hook to modify key-value-pairs generated, google-slot object is passed so that consumer can get details about the AdSlot
  // this hook is not needed in custom controller
  util.handleHook(CONSTANTS.HOOKS.POST_AUCTION_KEY_VALUES, [keyValuePairs, googleDefinedSlot]);
  // attaching keyValuePairs from adapters
  util.forEachOnObject(keyValuePairs, (key, value) => {
    if (!CONFIG.getSendAllBidsStatus() && winningBid && winningBid.adapterID !== 'pubmatic' && util.isOwnProperty({ 'hb_buyid_pubmatic': 1, 'pwtbuyid_pubmatic': 1 }, key)) {
      delete keyValuePairs[key];
    // eslint-disable-next-line brace-style
    }
    /* istanbul ignore else */
    else if (!util.isOwnProperty(ignoreTheseKeys, key) && !util.isOwnProperty({ 'pwtpb': 1 }, key)) {
      googleDefinedSlot.setTargeting(key, value);
      // adding key in wrapperTargetingKeys as every key added by OpenWrap should be removed before calling refresh on slot
      defineWrapperTargetingKey(key);
    }
  });
}

/* start-test-block */
export { findWinningBidAndApplyTargeting };

/* end-test-block */

function defineWrapperTargetingKey(key) { // TDD, i/o : done
  /* istanbul ignore else */
  if (!util.isObject(wrapperTargetingKeys)) {
    wrapperTargetingKeys = {};
  }
  wrapperTargetingKeys[key] = '';
}

/* start-test-block */
export { defineWrapperTargetingKey };

/* end-test-block */

// Hooks related functions

function newDisableInitialLoadFunction(theObject, originalFunction) { // TDD, i/o : done
  if (util.isObject(theObject) && util.isFunction(originalFunction)) {
    return (...args) => {
      /* istanbul ignore next */
      disableInitialLoadIsSet = true;
      /* istanbul ignore next */
      util.log('Disable Initial Load is called');
      if (CONFIG.isIdentityOnly()) {
        util.log(CONSTANTS.MESSAGES.IDENTITY.M5, ' DisableInitial Load function');
        return originalFunction.apply(theObject, args);
      }
      /* istanbul ignore next */
      return originalFunction.apply(theObject, args);
    };
  } else {
    util.logError('disableInitialLoad: originalFunction is not a function');
    return null;
  }
}

/* start-test-block */
export { newDisableInitialLoadFunction };

/* end-test-block */

function newEnableSingleRequestFunction(theObject, originalFunction) { // TDD, i/o : done
  if (util.isObject(theObject) && util.isFunction(originalFunction)) {
    return (...args) => {
      /* istanbul ignore next */
      util.log('enableSingleRequest is called');
      // addHookOnGoogletagDisplay();// todo
      /* istanbul ignore next */
      return originalFunction.apply(theObject, args);
    };
  } else {
    util.log('enableSingleRequest: originalFunction is not a function');
    return null;
  }
}

/* start-test-block */
export { newEnableSingleRequestFunction };

/* end-test-block */

/*
    setTargeting is implemented by
        googletag.pubads().setTargeting(key, value);
            we are only intresetd in this one
    googletag.PassbackSlot.setTargeting(key, value);
        we do not care about it
    slot.setTargeting(key, value);
        we do not care, as it has a get method
*/
function newSetTargetingFunction(theObject, originalFunction) { // TDD, i/o : done
  if (util.isObject(theObject) && util.isFunction(originalFunction)) {
    if (CONFIG.isIdentityOnly()) {
      util.log(CONSTANTS.MESSAGES.IDENTITY.M5, ' Original Set Targeting function');
      return (...args) => {
        return originalFunction.apply(theObject, args);
      };
    } else {
      return (...args) => {
        /* istanbul ignore next */
        const arg = args;
        const key = arg[0] ? arg[0] : null;
        // addHookOnGoogletagDisplay();//todo
        /* istanbul ignore if */
        if (key != null) {
          /* istanbul ignore if */
          if (!util.isOwnProperty(gptTargetingMap, key)) {
            gptTargetingMap[key] = [];
          }
          /* istanbul ignore next */
          gptTargetingMap[key] = gptTargetingMap[key].concat(arg[1]);
        }
        /* istanbul ignore next */
        return originalFunction.apply(theObject, args);
      };
    }
  } else {
    util.log('setTargeting: originalFunction is not a function');
    return null;
  }
}

/* start-test-block */
export { newSetTargetingFunction };

/* end-test-block */

function newDestroySlotsFunction(theObject, originalFunction) { // TDD, i/o : done
  if (util.isObject(theObject) && util.isFunction(originalFunction)) {
    return (...args) => {
      const slots = args[0] || window.googletag.pubads().getSlots();
      /* istanbul ignore next */
      util.forEachOnArray(slots, (index, slot) => {
        delete slotsMap[generateSlotName(slot)];
      });
      /* istanbul ignore next */
      return originalFunction.apply(theObject, args);
    };
  } else {
    util.log('destroySlots: originalFunction is not a function');
    return null;
  }
}

/* start-test-block */
export { newDestroySlotsFunction };

/* end-test-block */

function newAddAdUnitFunction(theObject, originalFunction) { // TDD, i/o : done
  if (util.isObject(theObject) && util.isFunction(originalFunction)) {
    return (...args) => {
      const adUnits = args[0];
      util.updateAdUnits(adUnits);
      return originalFunction.apply(theObject, args);
    };
  } else {
    util.log('newAddAunitfunction: originalFunction is not a function');
    return null;
  }
}

/* start-test-block */
export { newAddAdUnitFunction };

/* end-test-block */

function updateStatusAndCallOriginalFunctionDisplay(message, theObject, originalFunction, arg) { // TDD, i/o : done
  util.log(message);
  util.log(arg);
  updateStatusAfterRendering(arg[0], false);
  originalFunction.apply(theObject, arg);
}

/* start-test-block */
export { updateStatusAndCallOriginalFunctionDisplay };

/* end-test-block */

function findWinningBidIfRequiredDisplay(key, slot) { // TDD, i/o : done
  const status = slot.getStatus();
  if (status != CONSTANTS.SLOT_STATUS.DISPLAYED && status != CONSTANTS.SLOT_STATUS.TARGETING_ADDED) {
    findWinningBidAndApplyTargeting(key);
  }
}

/* start-test-block */
export { findWinningBidIfRequiredDisplay };

/* end-test-block */

function processDisplayCalledSlot(theObject, originalFunction, arg) {
  if (getStatusOfSlotForDivId(arg[0]) != CONSTANTS.SLOT_STATUS.DISPLAYED) {
    // findWinningBidAndApplyTargeting(arg[0]);
    updateStatusAndCallOriginalFunctionDisplay(
      'Calling original display function after timeout with arguments, ',
      theObject,
      originalFunction,
      arg
    );
  } else {
    util.log('AdSlot already rendered');
  }
}

/* start-test-block */
export { processDisplayCalledSlot };

/* end-test-block */

function executeDisplay(timeout, divIds, callback) {
  let timeoutTicker = 0; // here we will calculate time elapsed
  const timeoutIncrementer = 10; // in ms
  const intervalId = window.setInterval(() => {
    if ((util.getExternalBidderStatus(divIds) && bidManager.getAllPartnersBidStatuses(window.PWT.bidMap, divIds)) || timeoutTicker >= timeout) {
      window.clearInterval(intervalId);
      util.resetExternalBidderStatus(divIds); // Quick fix to reset flag so that the notification flow happens only once per page load
      callback();
    }
    timeoutTicker += timeoutIncrementer;
  }, timeoutIncrementer);
}

/* start-test-block */
export { executeDisplay };

/* end-test-block */

function displayFunctionStatusHandler(oldStatus, theObject, originalFunction, arg) { // TDD, i/o : done
  switch (oldStatus) {
    // display method was called for this slot
    /* istanbul ignore next */
    case CONSTANTS.SLOT_STATUS.CREATED:
    // dm flow is already intiated for this slot
    // just intitate the CONFIG.getTimeout() now
    // eslint-disable-line no-fallthrough
    /* istanbul ignore next */
    // eslint-disable-next-line no-fallthrough
    case CONSTANTS.SLOT_STATUS.PARTNERS_CALLED:
      executeDisplay(CONFIG.getTimeout(), Object.keys(slotsMap), () => {
        util.forEachOnObject(slotsMap, (key, slot) => {
          findWinningBidIfRequiredDisplay(key, slot);
        });
        processDisplayCalledSlot(theObject, originalFunction, arg);
      });
      break;
    // call the original function now
    case CONSTANTS.SLOT_STATUS.TARGETING_ADDED:
      updateStatusAndCallOriginalFunctionDisplay(
        'As DM processing is already done, Calling original display function with arguments',
        theObject,
        originalFunction,
        arg
      );
      break;

    case CONSTANTS.SLOT_STATUS.DISPLAYED:
      updateStatusAndCallOriginalFunctionDisplay(
        'As slot is already displayed, Calling original display function with arguments',
        theObject,
        originalFunction,
        arg
      );
      break;
  }
}

/* start-test-block */
export { displayFunctionStatusHandler };

/* end-test-block */

function forQualifyingSlotNamesCallAdapters(qualifyingSlotNames, arg, isRefreshCall) { // TDD, i/o : done
  if (qualifyingSlotNames.length > 0) {
    updateStatusOfQualifyingSlotsBeforeCallingAdapters(qualifyingSlotNames, arg, isRefreshCall);
    const qualifyingSlots = arrayOfSelectedSlots(qualifyingSlotNames);
    // new approach without adapter-manager
    prebid.fetchBids(qualifyingSlots);
  }
}

/* start-test-block */
export { forQualifyingSlotNamesCallAdapters };

/* end-test-block */

function newDisplayFunction(theObject, originalFunction) { // TDD, i/o : done
  // Initiating getUserConsentDataFromCMP method to get the updated consentData
  // GDPR.getUserConsentDataFromCMP();

  if (util.isObject(theObject) && util.isFunction(originalFunction)) {
    if (CONFIG.isIdentityOnly()) {
      util.log(CONSTANTS.MESSAGES.IDENTITY.M5, ' Original Display function');
      return (...args) => {
        return originalFunction.apply(theObject, args);
      };
    } else {
      // Todo : change structure to take out the anonymous function for better unit test cases
      return (...args) => {
        /* istanbul ignore next */
        util.log('In display function, with arguments: ');

        /* istanbul ignore next */
        util.log(args);
        /* istanbul ignore next */
        /* istanbul ignore if */
        if (disableInitialLoadIsSet) {
          util.log('DisableInitialLoad was called, Nothing to do');
          return originalFunction.apply(theObject, args);
        }
        /* istanbul ignore next */
        updateSlotsMapFromGoogleSlots(theObject.pubads().getSlots(), args, true);

        /* istanbul ignore next */
        displayFunctionStatusHandler(getStatusOfSlotForDivId(args[0]), theObject, originalFunction, args);
        const statusObj = {};
        statusObj[CONSTANTS.SLOT_STATUS.CREATED] = '';
        /* istanbul ignore next */
        // Todo: need to add reThis whilwe calling getSlotNamesByStatus
        forQualifyingSlotNamesCallAdapters(getSlotNamesByStatus(statusObj), args, false);
        /* istanbul ignore next */
        const divID = args[0];
        /* istanbul ignore next */
        setTimeout(() => {
          util.realignVLogInfoPanel(divID);
          bidManager.executeAnalyticsPixel();
        }, 2000 + CONFIG.getTimeout());

        // return originalFunction.apply(theObject, arguments);
      };
    }
  } else {
    util.log('display: originalFunction is not a function');
    return null;
  }
}

/* start-test-block */
export { newDisplayFunction };

/* end-test-block */

/*
    there are many types of display methods
        1. googletag.display('div-1');
            this one is only covered

        // following approach can be re-written as 1st
        2. googletag.pubads().display('/1234567/sports', [728, 90], 'div-1');
            we can not support this as, above methode will generate adslot object internally and then displays,
            btw it does not supports single reqest approach
            also slot level targeting can not be set on it
            https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_display

        3. googletag.pubads().definePassback('/1234567/sports', [468, 60]).display();
            we are not going to support this one as well as third-party partners use this and they wont have setup required to render our bids
*/

function newAddHookOnGoogletagDisplay(localGoogletag) { // TDD, i/o : done
  if (displayHookIsAdded) {
    return;
  }
  displayHookIsAdded = true;
  util.log('Adding hook on googletag.display.');
  util.addHookOnFunction(localGoogletag, false, 'display', newDisplayFunction);
}

/* start-test-block */
export { newAddHookOnGoogletagDisplay };

/* end-test-block */

function findWinningBidIfRequiredRefresh(slotName, divID, currentFlagValue) { // TDD, i/o : done
  if (util.isOwnProperty(slotsMap, slotName) && slotsMap[slotName].isRefreshFunctionCalled() === true && slotsMap[slotName].getStatus() !== CONSTANTS.SLOT_STATUS.DISPLAYED) {
    findWinningBidAndApplyTargeting(divID);
    updateStatusAfterRendering(divID, true);
    return true;
  }
  return currentFlagValue;
}

/* start-test-block */
export { findWinningBidIfRequiredRefresh };

/* end-test-block */

function postRederingChores(divID, dmSlot) {
  // googleSlot.getSizes() returns applicable sizes as per sizemapping if we pass current available view-port width and height
  util.createVLogInfoPanel(divID, slotsMap[dmSlot].getSizes(window.innerWidth, window.innerHeight));
  util.realignVLogInfoPanel(divID);
  bidManager.executeAnalyticsPixel();
}

/* start-test-block */
export { postRederingChores };

/* end-test-block */

function postTimeoutRefreshExecution(qualifyingSlotNames, theObject, originalFunction, arg) { // TDD, i/o : done
  util.log('Executing post timeout events, arguments: ');
  util.log(arg);
  let yesCallRefreshFunction = false;
  util.forEachOnArray(qualifyingSlotNames, (index, dmSlot) => {
    const divID = slotsMap[dmSlot].getDivID();
    yesCallRefreshFunction = findWinningBidIfRequiredRefresh(dmSlot, divID, yesCallRefreshFunction);
    window.setTimeout(() => {
      postRederingChores(divID, dmSlot);
    }, 2000);
  });
  callOriginalRefeshFunction(yesCallRefreshFunction, theObject, originalFunction, arg);
}

/* start-test-block */
export { postTimeoutRefreshExecution };

/* end-test-block */

function callOriginalRefeshFunction(flag, theObject, originalFunction, arg) { // TDD, i/o : done
  if (flag === true) {
    util.log('Calling original refresh function post timeout');
    originalFunction.apply(theObject, arg);
  } else {
    util.log('AdSlot already rendered');
  }
}

/* start-test-block */
export { callOriginalRefeshFunction };

/* end-test-block */

function getQualifyingSlotNamesForRefresh(arg, theObject) { // TDD, i/o : done
  let qualifyingSlotNames = [];
  let slotsToConsider = [];
  // handeling case googletag.pubads().refresh(null, {changeCorrelator: false});
  slotsToConsider = arg.length == 0 || arg[0] == null ? theObject.getSlots() : arg[0];
  util.forEachOnArray(slotsToConsider, (index, slot) => {
    const slotName = generateSlotName(slot);
    if (slotName.length > 0) {
      qualifyingSlotNames = qualifyingSlotNames.concat(slotName);
    }
  });
  return qualifyingSlotNames;
}

/* start-test-block */
export { getQualifyingSlotNamesForRefresh };

/* end-test-block */

/*
    there are many ways of calling refresh
        1. googletag.pubads().refresh([slot1]);
        2. googletag.pubads().refresh([slot1, slot2]);
        3. googletag.pubads().refresh();
        4. googletag.pubads().refresh(null, {changeCorrelator: false});
*/
function newRefreshFuncton(theObject, originalFunction) { // TDD, i/o : done // Note : not covering the function currying atm , if need be will add istanbul ignore
  // Initiating getUserConsentDataFromCMP method to get the updated consentData
  // GDPR.getUserConsentDataFromCMP();

  if (util.isObject(theObject) && util.isFunction(originalFunction)) {
    if (CONFIG.isIdentityOnly()) {
      util.log('Identity Only Enabled. No Process Need. Calling Original Display function');
      return (...args) => {
        return originalFunction.apply(theObject, args);
      };
    } else {
      // var refThis = this;
      return (...args) => {
        /* istanbul ignore next */
        util.log('In Refresh function');

        /* istanbul ignore next */
        updateSlotsMapFromGoogleSlots(theObject.getSlots(), args, false);
        /* istanbul ignore next */
        const qualifyingSlotNames = getQualifyingSlotNamesForRefresh(args, theObject);
        /* istanbul ignore next */
        forQualifyingSlotNamesCallAdapters(qualifyingSlotNames, args, true);
        /* istanbul ignore next */
        util.log(`Intiating Call to original refresh function with Timeout: ${CONFIG.getTimeout()} ms`);

        const arg = args;
        executeDisplay(CONFIG.getTimeout(), qualifyingSlotNames, () => {
          postTimeoutRefreshExecution(qualifyingSlotNames, theObject, originalFunction, arg);
        });
      };
    }
  } else {
    util.log('refresh: originalFunction is not a function');
    return null;
  }
}

/* start-test-block */
export { newRefreshFuncton };

/* end-test-block */

function addHooks(win) { // TDD, i/o : done
  if (util.isObject(win) && util.isObject(win.googletag) && util.isFunction(win.googletag.pubads)) {
    const localGoogletag = win.googletag;

    const localPubAdsObj = localGoogletag.pubads();

    if (!util.isObject(localPubAdsObj)) {
      return false;
    }

    util.addHookOnFunction(localPubAdsObj, false, 'disableInitialLoad', newDisableInitialLoadFunction);
    util.addHookOnFunction(localPubAdsObj, false, 'enableSingleRequest', newEnableSingleRequestFunction);
    newAddHookOnGoogletagDisplay(localGoogletag);
    util.addHookOnFunction(localPubAdsObj, false, 'refresh', newRefreshFuncton);
    util.addHookOnFunction(localPubAdsObj, false, 'setTargeting', newSetTargetingFunction);
    util.addHookOnFunction(localGoogletag, false, 'destroySlots', newDestroySlotsFunction);
    return true;
  } else {
    return false;
  }
}

/* start-test-block */
export { addHooks };

/* end-test-block */

function defineGPTVariables(win) { // TDD, i/o : done
  // define the command array if not already defined
  if (util.isObject(win)) {
    win.googletag = win.googletag || {};
    win.googletag.cmd = win.googletag.cmd || [];
    return true;
  }
  return false;
}

/* start-test-block */
export { defineGPTVariables };

/* end-test-block */

function addHooksIfPossible(win) { // TDD, i/o : done
  if (CONFIG.isIdentityOnly()) {
    return false;
  }
  if (util.isObject(win.googletag) && !win.googletag.apiReady && util.isArray(win.googletag.cmd) && util.isFunction(win.googletag.cmd.unshift)) {
    util.log('Succeeded to load before GPT');// todo
    // const refThis = this; // TODO : check whether the global refThis works here
    win.googletag.cmd.unshift(() => {
      /* istanbul ignore next */
      util.log('OpenWrap initialization started');
      /* istanbul ignore next */
      addHooks(win);
      /* istanbul ignore next */
      util.log('OpenWrap initialization completed');
    });
    return true;
  } else {
    util.logError('Failed to load before GPT');
    return false;
  }
}

/* start-test-block */
export { addHooksIfPossible };

/* end-test-block */

function initSafeFrameListener(theWindow) { // TDD, i/o : done
  if (!theWindow.PWT.safeFrameMessageListenerAdded) {
    util.addMessageEventListenerForSafeFrame(theWindow);
    theWindow.PWT.safeFrameMessageListenerAdded = true;
  }
}

/* start-test-block */
export { initSafeFrameListener };

/* end-test-block */

export function init(win) { // TDD, i/o : done
  CONFIG.initConfig();
  if (util.isObject(win)) {
    setWindowReference(win);
    initSafeFrameListener(win);
    prebid.initPbjsConfig();
    wrapperTargetingKeys = defineWrapperTargetingKeys(CONSTANTS.WRAPPER_TARGETING_KEYS);
    defineGPTVariables(win);
    addHooksIfPossible(win);
    IdHub.initIdHub(win);
    return true;
  } else {
    return false;
  }
}
