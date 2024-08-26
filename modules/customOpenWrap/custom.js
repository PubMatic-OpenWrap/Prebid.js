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

function displayAllCreativesWithoutAdServer(adUnitsArray){
	if(util.isArray(adUnitsArray)){
		util.forEachOnArray(adUnitsArray,function(index,au){
			displayCreativeWithoutAdServer(au);
		});
	}
	else{
		util.logWarning(CONSTANTS.MESSAGES.M33 + " " + adUnitsArray);
	}
}

/* start-test-block */
export { displayAllCreativesWithoutAdServer };
/* end-test-block */

function displayCreativeWithoutAdServer(adUnit){
	var adDiv = document.getElementById(adUnit.divId);
	if(adDiv){
		if(adUnit.bidData.kvp.pwtsid){
			var oldIframe = document.getElementById("prebid_ads_iframe_" + adUnit.divId);
			if(oldIframe){
				oldIframe.remove();
			}
			var iframe = document.createElement("iframe");
			iframe.scrolling = "no";
			iframe.frameBorder = "0";
			iframe.marginHeight = "0";
			iframe.marginHeight = "0";
			iframe.name = "prebid_ads_iframe_" + adUnit.divId;
			iframe.id = "prebid_ads_iframe_" + adUnit.divId;
			iframe.title = "3rd party ad content";
			iframe.sandbox.add(
				"allow-forms",
				"allow-popups",
				"allow-popups-to-escape-sandbox",
				"allow-same-origin",
				"allow-scripts",
				"allow-top-navigation-by-user-activation"
			);
			iframe.setAttribute("aria-label", "Advertisment");
			iframe.style.setProperty("border", "0");
			iframe.style.setProperty("margin", "0");
			iframe.style.setProperty("overflow", "hidden");
			adDiv.appendChild(iframe);
			if(iframe.contentWindow && iframe.contentWindow.document){
				var iframeDoc = iframe.contentWindow.document;
				owpbjs.renderAd(iframeDoc,adUnit.bidData.kvp.pwtsid);

				var normalizeCss = "/*! normalize.css v8.0.1 | MIT License | github.com/necolas/normalize.css */button,hr,input{overflow:visible}progress,sub,sup{vertical-align:baseline}[type=checkbox],[type=radio],legend{box-sizing:border-box;padding:0}html{line-height:1.15;-webkit-text-size-adjust:100%}body{margin:0}details,main{display:block}h1{font-size:2em;margin:.67em 0}hr{box-sizing:content-box;height:0}code,kbd,pre,samp{font-family:monospace,monospace;font-size:1em}a{background-color:transparent}abbr[title]{border-bottom:none;text-decoration:underline;text-decoration:underline dotted}b,strong{font-weight:bolder}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}img{border-style:none}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;line-height:1.15;margin:0}button,select{text-transform:none}[type=button],[type=reset],[type=submit],button{-webkit-appearance:button}[type=button]::-moz-focus-inner,[type=reset]::-moz-focus-inner,[type=submit]::-moz-focus-inner,button::-moz-focus-inner{border-style:none;padding:0}[type=button]:-moz-focusring,[type=reset]:-moz-focusring,[type=submit]:-moz-focusring,button:-moz-focusring{outline:ButtonText dotted 1px}fieldset{padding:.35em .75em .625em}legend{color:inherit;display:table;max-width:100%;white-space:normal}textarea{overflow:auto}[type=number]::-webkit-inner-spin-button,[type=number]::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}[type=search]::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}[hidden],template{display:none}";
				var iframeStyle = iframeDoc.createElement("style");
				iframeStyle.appendChild(iframeDoc.createTextNode(normalizeCss));
				iframeDoc.head.appendChild(iframeStyle);
			}
		}
		else{
			util.logError(CONSTANTS.MESSAGES.M35 + " " + adUnit.divId);
		}
	}
	else{
		util.logWarning(CONSTANTS.MESSAGES.M34 + " " + adDiv);
	}
}

/* start-test-block */
export { displayCreativeWithoutAdServer };
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
		let floorConfig = util.getAdUnitConfig(sizes, googleSlot).floors;
		if(floorConfig) {
			gptConfArray[gptConfArray.length - 1]["floors"] = floorConfig;
		}
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
				util.forEachOnObject(util.getCDSTargetingData(), (key, value) => {
					window.googletag &&
					window.googletag.pubads().setTargeting(key, value);
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
		if(util.isFunction(currentGoogleSlot.clearTargeting) && CONFIG.shouldClearTargeting()){
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
    win.PWT.displayAllCreativesWithoutAdServer = displayAllCreativesWithoutAdServer;
		win.PWT.displayCreativeWithoutAdServer = displayCreativeWithoutAdServer;
    wrapperTargetingKeys = defineWrapperTargetingKeys(CONSTANTS.WRAPPER_TARGETING_KEYS);
    return true;
  } else {
    return false;
  }
}
