// TODO : Need to remove below two eslint lines and make changes accordingly
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
// todo
//  pageURL refURL protocol related functions
// forEachOnArray
import * as CONFIG from './config.js';

import * as CONSTANTS from './constants.js';
import * as conf from './conf.js';
import * as BID from './bid.js';
import * as bidManager from './bidManager.js';

var debugLogIsEnabled = false;

/* start-test-block */
export { debugLogIsEnabled };

/* end-test-block */
var visualDebugLogIsEnabled = false;

/* start-test-block */
export { visualDebugLogIsEnabled };

/* end-test-block */
const typeArray = 'Array';
const typeString = 'String';
const typeFunction = 'Function';
const typeNumber = 'Number';
const toString = Object.prototype.toString;
// idsAppendedToAdUnits = false;
const mediaTypeConfigPerSlot = {};
var mediaTypeConfig = mediaTypeConfigPerSlot;
export { mediaTypeConfig };

const pbNameSpace = parseInt(conf[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.IDENTITY_ONLY] || CONSTANTS.CONFIG.DEFAULT_IDENTITY_ONLY) ? CONSTANTS.COMMON.IH_NAMESPACE : CONSTANTS.COMMON.PREBID_NAMESPACE;
export { pbNameSpace };
function isA(object, testForType) {
  return toString.call(object) === `[object ${testForType}]`;
}

/* start-test-block */
export { isA };

/* end-test-block */

export function isFunction(object) {
  return isA(object, typeFunction);
}

export function isString(object) {
  return isA(object, typeString);
}

export function isArray(object) {
  return isA(object, typeArray);
}

export function isNumber(object) {
  return isA(object, typeNumber);
}

export function isObject(object) {
  return typeof object === 'object' && object !== null;
}

export function isOwnProperty(theObject, proertyName) {
  /* istanbul ignore else */
  if (isObject(theObject) && theObject.hasOwnProperty) {
    return theObject.hasOwnProperty(proertyName);
  }
  return false;
}

export function isUndefined(object) {
  return typeof object === 'undefined';
}

export function enableDebugLog() {
  debugLogIsEnabled = true;
}

export function isDebugLogEnabled() {
  return debugLogIsEnabled;
}

export function enableVisualDebugLog() {
  debugLogIsEnabled = true;
  visualDebugLogIsEnabled = true;
}

export function isEmptyObject(object) {
  return isObject(object) && Object.keys(object).length === 0;
}

// todo: move...
const constDebugInConsolePrependWith = '[OpenWrap] : ';
const constErrorInConsolePrependWith = '[OpenWrap] : [Error]';

export function log(data) {
  if (debugLogIsEnabled && console && isFunction(console.log)) { // eslint-disable-line no-console
    if (isString(data)) {
      console.log(`${(new Date()).getTime()} : ${constDebugInConsolePrependWith}${data}`); // eslint-disable-line no-console
    } else {
      console.log(data); // eslint-disable-line no-console
    }
  }
}

export function logError(data) {
  if (debugLogIsEnabled && console && isFunction(console.log)) { // eslint-disable-line no-console
    if (isString(data)) {
      console.error(`${(new Date()).getTime()} : ${constDebugInConsolePrependWith}${data}`); // eslint-disable-line no-console
    } else {
      console.error(data); // eslint-disable-line no-console
    }
  }
}

export function logWarning(data) {
  if (debugLogIsEnabled && console && isFunction(console.log)) { // eslint-disable-line no-console
    if (isString(data)) {
      console.warn(`${(new Date()).getTime()} : ${constDebugInConsolePrependWith}${data}`); // eslint-disable-line no-console
    } else {
      console.warn(data); // eslint-disable-line no-console
    }
  }
}

export function error(data) {
  console.log(`${(new Date()).getTime()} : ${constErrorInConsolePrependWith}`, data); // eslint-disable-line no-console
}

export function getCurrentTimestampInMs() {
  const date = new window.Date();
  return date.getTime();
}

export function getCurrentTimestamp() {
  const date = new Date();
  return Math.round(date.getTime() / 1000);
}

const utilGetIncrementalInteger = (() => {
  let count = 0;
  return () => {
    count++;
    return count;
  };
})();

/* start-test-block */
export { utilGetIncrementalInteger };

/* end-test-block */

export function getUniqueIdentifierStr() {
  return utilGetIncrementalInteger() + window.Math.random().toString(16).substr(2);
}

// removeIf(removeLegacyAnalyticsRelatedCode)
export function copyKeyValueObject(copyTo, copyFrom) {
  /* istanbul ignore else */
  if (isObject(copyTo) && isObject(copyFrom)) {
    // const utilRef = this;
    forEachOnObject(copyFrom, function (key, value) {
      copyFrom[key] = isArray(value) ? value : [value];
      if (isOwnProperty(copyTo, key)) {
        // copyTo[key].push.apply(copyTo[key], value);
        if (!isArray(copyTo[key])) {
          const temp = copyTo[key];
          copyTo[key] = [temp];
        }
        copyTo[key].push(value);
      } else {
        copyTo[key] = [value];
      }
    });
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

export const getIncrementalInteger = (() => {
  let count = 0;
  return () => {
    count++;
    return count;
  };
})();

export function generateUUID() {
  let d = new window.Date().getTime();
  // todo: pageURL ???
  const url = window.decodeURIComponent(this.pageURL).toLowerCase().replace(/[^a-z,A-Z,0-9]/gi, '');
  const urlLength = url.length;

  // todo: uncomment it,  what abt performance
  // if(win.performance && isFunction(win.performance.now)){
  //    d += performance.now();
  // }

  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx-zzzzz'.replace(/[xyz]/g, c => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    let op;
    switch (c) {
      case 'x':
        op = r;
        break;
      case 'z':
        op = url[Math.floor(Math.random() * urlLength)];
        break;
      default:
        op = (r & 0x3 | 0x8);
    }

    return op.toString(16);
  });

  return uuid;
}

const macroRegexFlag = 'g';
const constCommonMacroForWidthRegExp = new RegExp(CONSTANTS.MACROS.WIDTH, macroRegexFlag);
const constCommonMacroForHeightRegExp = new RegExp(CONSTANTS.MACROS.HEIGHT, macroRegexFlag);
const constCommonMacroForAdUnitIDRegExp = new RegExp(CONSTANTS.MACROS.AD_UNIT_ID, macroRegexFlag);
const constCommonMacroForAdUnitIndexRegExp = new RegExp(CONSTANTS.MACROS.AD_UNIT_INDEX, macroRegexFlag);
const constCommonMacroForIntegerRegExp = new RegExp(CONSTANTS.MACROS.INTEGER, macroRegexFlag);
const constCommonMacroForDivRegExp = new RegExp(CONSTANTS.MACROS.DIV, macroRegexFlag);

export function generateSlotNamesFromPattern(activeSlot, pattern, shouldCheckMappingForVideo, videoSlotName) {
  const slotNames = [];
  let slotName;
  const slotNamesObj = {};
  let sizeArray;
  let sizeArrayLength;
  let i;
  /* istanbul ignore else */
  if (isObject(activeSlot) && isFunction(activeSlot.getSizes)) {
    sizeArray = activeSlot.getSizes();
    var divId = isFunction(activeSlot.getDivID) ? activeSlot.getDivID() : activeSlot.getSlotId().getDomId();
    if (shouldCheckMappingForVideo) {
      // TODO: remove below line and update above live for assigning sizeArray after remove phantom js and including chromeheadless
      // This adds an size 0x0 to sizes so that multiple kgpvs can be generated
      sizeArray = [].concat(activeSlot.getSizes());
      const config = mediaTypeConfig[divId];
      if (config && config.video) {
        sizeArray.unshift([0, 0]);
      }
    }
    sizeArrayLength = sizeArray.length;
    /* istanbul ignore else */
    if (sizeArrayLength > 0) {
      for (i = 0; i < sizeArrayLength; i++) {
        /* istanbul ignore else */
        if (((sizeArray[i].length == 2 && (sizeArray[i][0] && sizeArray[i][1])) || (sizeArray[i][0] == 0 && sizeArray[i][1] == 0)) || (isFunction(sizeArray[i].getWidth) && isFunction(sizeArray[i].getHeight))) {
          const adUnitId = isFunction(activeSlot.getAdUnitID) ? activeSlot.getAdUnitID() : activeSlot.getSlotId().getAdUnitPath();
          divId = isFunction(activeSlot.getDivID) ? activeSlot.getDivID() : activeSlot.getSlotId().getDomId();
          const adUnitIndex = isFunction(activeSlot.getAdUnitIndex) ? activeSlot.getAdUnitIndex() : activeSlot.getSlotId().getId().split('_')[1];
          const width = sizeArray[i][0] == 0 ? 0 : sizeArray[i][0] || sizeArray[i].getWidth();
          const height = sizeArray[i][1] == 0 ? 0 : sizeArray[i][1] || sizeArray[i].getHeight();
          slotName = pattern;
          slotName = slotName.replace(constCommonMacroForAdUnitIDRegExp, adUnitId)
            .replace(constCommonMacroForAdUnitIndexRegExp, adUnitIndex)
            .replace(constCommonMacroForIntegerRegExp, getIncrementalInteger())
            .replace(constCommonMacroForDivRegExp, divId)
            .replace(constCommonMacroForWidthRegExp, width)
            .replace(constCommonMacroForHeightRegExp, height);

          // if size is 0x0 then we don't want to add it in slotNames since it will be looped in another function
          // we just want to check the config for 0x0 mapping hence updating it in videoSlotName
          /* istanbul ignore else */
          if (width == 0 && height == 0) {
            videoSlotName[0] = slotName;
            /* istanbul ignore else */
          } else if (!isOwnProperty(slotNamesObj, slotName)) {
            slotNamesObj[slotName] = '';
            slotNames.push(slotName);
          }
        }
      }
    }
  }
  return slotNames;
}

/**
 * todo:
 *    if direct mapping is not found
 *    then look for regex mapping
 *      separate function to handle regex mapping
 *      kgp: "" // should be filled with whatever value
 *      klm: {} // should be filled with records if required else leave it as an empty object {}
 *      kgp_rx: "" // regex pattern
 *      klm_rx: [
 *        {
 *          rx: "ABC123*",
 *          rx_config: {} // here goes adapyter config
 *        },
 *
 *        {
 *          rx: "*",
 *          rx_config: {}
 *        }
 *      ]
 */

/**
  *  Algo for Regex and Normal Flow
  * 1. Check for kgp key
  *   a). If KGP is present for partner then proceed with old flow and no change in that
  *   b). If KGP is not present and kgp_rx is present it is regex flow and proceed with regex flow as below
  * 2. Regex Flow
  *   a. Generate KGPV's with kgp as _AU_@_DIV_@_W_x_H_
  *   b. Regex Match each KGPV with KLM_rx
  *   c. Get config for the partner
  *     d. Send the config to prebid and log the same kgpv in logger
  *
  * Special Case for Pubmatic
  *  1. In case of regex flow we will have hashed keys which will be sent to translator for matching
  *  2. These hashed keys could be same for multiple slot on the page and hence need to check how to send it to prebid for
  *     identification in prebid resposne.
  */

export function forEachGeneratedKey(
  adapterID,
  adUnits,
  adapterConfig,
  impressionID,
  slotConfigMandatoryParams,
  activeSlots,
  handlerFunction,
  addZeroBids
) {
  const activeSlotsLength = activeSlots.length;
  const keyGenerationPattern = adapterConfig[CONSTANTS.CONFIG.KEY_GENERATION_PATTERN] || adapterConfig[CONSTANTS.CONFIG.REGEX_KEY_GENERATION_PATTERN] || '';
  /* istanbul ignore else */
  if (activeSlotsLength > 0 && keyGenerationPattern.length > 3) {
    forEachOnArray(activeSlots, function (i, activeSlot) {
      const videoSlotName = [];
      // We are passing videoSlotName because we don't want to update the sizes and just check for 0x0 config if video and banner is both enabeld
      const generatedKeys = generateSlotNamesFromPattern(activeSlot, keyGenerationPattern, true, videoSlotName);
      if (generatedKeys.length > 0) {
        callHandlerFunctionForMapping(adapterID, adUnits, adapterConfig, impressionID, slotConfigMandatoryParams, generatedKeys, activeSlot, handlerFunction, addZeroBids, keyGenerationPattern, videoSlotName);
      }
    });
  }
}

// private
function callHandlerFunctionForMapping(adapterID, adUnits, adapterConfig, impressionID, slotConfigMandatoryParams, generatedKeys, activeSlot, handlerFunction, addZeroBids, keyGenerationPattern, videoSlotName) {
  const keyLookupMap = adapterConfig[CONSTANTS.CONFIG.KEY_LOOKUP_MAP] || adapterConfig[CONSTANTS.CONFIG.REGEX_KEY_LOOKUP_MAP] || null;
  const kgpConsistsWidthAndHeight = keyGenerationPattern.includes(CONSTANTS.MACROS.WIDTH) && keyGenerationPattern.includes(CONSTANTS.MACROS.HEIGHT);
  const isRegexMapping = !!adapterConfig[CONSTANTS.CONFIG.REGEX_KEY_LOOKUP_MAP];
  let regexPattern;
  const adapterNameForAlias = CONFIG.getAdapterNameForAlias(adapterID);
  const isPubMaticAlias = CONSTANTS.PUBMATIC_ALIASES.includes(adapterNameForAlias);
  let regExMappingWithNoConfig = false;
  forEachOnArray(generatedKeys, function (j, generatedKey) {
    let keyConfig = null;
    let callHandlerFunction = false;
    const sizeArray = activeSlot.getSizes();

    if (keyLookupMap == null) {
      // This block executes for pubmatic only where there are no KLM's
      // Adding this check for pubmatic only to send the correct tagId for Size Level mapping. UOE-6156
      if (videoSlotName && videoSlotName.length == 1) {
        generatedKey = videoSlotName[0];
      }
      callHandlerFunction = true;
    } else {
      if (isRegexMapping) {
        // eslint-disable-next-line no-console
        debugLogIsEnabled && log(console.time(`Time for regexMatching for key ${generatedKey}`));
        const config = getConfigFromRegex(keyLookupMap, generatedKey);
        // eslint-disable-next-line no-console
        debugLogIsEnabled && log(console.timeEnd(`Time for regexMatching for key ${generatedKey}`));

        if (config) {
          keyConfig = config.config;
          regexPattern = config.regexPattern;
        } else {
          // if klm_rx dosen't return any config and if partner is PubMatic alias we need to restrict call to handlerFunction
          // so adding flag regExMappingWithNoConfig below
          regExMappingWithNoConfig = !!isPubMaticAlias;
        }
      } else {
        // Added Below Check Because of UOE-5600
        if (videoSlotName && videoSlotName.length == 1) {
          // Commented out normal lookup and added below check to remove case sensitive check on videoSlotName[0].
          // keyConfig = keyLookupMap[videoSlotName[0]];
          // keyConfig = keyLookupMap[Object.keys(keyLookupMap).find(key => key.toLowerCase() === videoSlotName[0].toLowerCase())];
          keyConfig = keyLookupMap[Object.keys(keyLookupMap).filter(key => key.toLowerCase() === videoSlotName[0].toLowerCase())];
          // We are updating the generatedKey because we want to log kgpv as 0x0 in case of video
          if (keyConfig) {
            generatedKey = videoSlotName[0];
          }
        }
        if (!keyConfig) {
          // Commented out normal lookup and added below check to remove case sensitive check on generatedKey.
          // keyConfig = keyLookupMap[generatedKey];
          keyConfig = keyLookupMap[Object.keys(keyLookupMap).filter(key => key.toLowerCase() === generatedKey.toLowerCase())];
        }
      }
      // condition (!keyConfig && !isPubMaticAlias) will check if keyCofig is undefined and partner is not PubMatic alias then log message to console
      // with "adapterID+": "+generatedKey+ config not found"
      // regExMappingWithNoConfig will be true only if klm_rx dosen't return config and partner is PubMatic alias then log message to console
      // with "adapterID+": "+generatedKey+ config not found"
      if ((!keyConfig && !isPubMaticAlias) || regExMappingWithNoConfig) {
        log(`${adapterID}: ${generatedKey}${CONSTANTS.MESSAGES.M8}`);
      } else {
        callHandlerFunction = true;
      }
    }

    /* istanbul ignore else */
    if (callHandlerFunction) {
      /* istanbul ignore else */
      if (addZeroBids == true) {
        const bid = BID.createBid(adapterID, generatedKey);
        bid.setDefaultBidStatus(1).setReceivedTime(getCurrentTimestampInMs());
        bidManager.setBidFromBidder(activeSlot.getDivID(), bid);
        bid.setRegexPattern(regexPattern);
      }
      handlerFunction(
        adapterID,
        adUnits,
        adapterConfig,
        impressionID,
        generatedKey,
        kgpConsistsWidthAndHeight,
        activeSlot,
        getPartnerParams(keyConfig),
        sizeArray[j][0],
        sizeArray[j][1],
        regexPattern
      );
    }
  });
}

/* start-test-block */
export { callHandlerFunctionForMapping };

/* end-test-block */

// removeIf(removeLegacyAnalyticsRelatedCode)
export function resizeWindow({ defaultView }, width, height, divId) {
  /* istanbul ignore else */
  if (height && width) {
    try {
      let defaultViewFrame = defaultView.frameElement;
      const elementArray = [];
      if (divId) {
        const adSlot = document.getElementById(divId);
        const adSlotDiv = adSlot.querySelector('div');
        elementArray.push(adSlotDiv);
        elementArray.push(adSlotDiv.querySelector('iframe'));
        defaultViewFrame = adSlot.querySelector('iframe');
      }
      elementArray.push(defaultViewFrame);
      elementArray.forEach(ele => {
        if (ele) {
          ele.width = `${width}`;
          ele.height = `${height}`;
          ele.style.width = `${width}px`;
          ele.style.height = `${height}px`;
        }
      });
    } catch (e) {
      logError('Creative-Resize; Error in resizing creative');
    } // eslint-disable-line no-empty
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function writeIframe(theDocument, src, width, height, style) {
  theDocument.write(`<iframe frameborder="0" allowtransparency="true" marginheight="0" marginwidth="0" scrolling="no" width="${width}" hspace="0" vspace="0" height="${height}"${style ? ` style="${style}"` : ''} src="${src}"></iframe>`);
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function displayCreative(theDocument, bid) {
  if (bid && bid.pbbid && bid.pbbid.mediaType == 'video' && bid.renderer && isObject(bid.renderer)) {
    if (isFunction(bid.renderer.render)) {
      bid.renderer.render(bid.getPbBid());
    }
  } else {
    resizeWindow(theDocument, bid.width, bid.height);
    if (bid.adHtml) {
      bid.adHtml = replaceAuctionPrice(bid.adHtml, bid.getGrossEcpm());
      theDocument.write(bid.adHtml);
    } else if (bid.adUrl) {
      bid.adUrl = replaceAuctionPrice(bid.adUrl, bid.getGrossEcpm());
      writeIframe(theDocument, bid.adUrl, bid.width, bid.height, '');
    } else {
      logError('creative details are not found');
      logError(bid);
    }
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// todo: how about accepting array of arguments to be passed to callback function after key, value, arrayOfArguments
export function forEachOnObject(theObject, callback) {
  /* istanbul ignore else */
  if (!isObject(theObject)) {
    return;
  }

  /* istanbul ignore else */
  if (!isFunction(callback)) {
    return;
  }

  for (const key in theObject) {
    /* istanbul ignore else */
    if (isOwnProperty(theObject, key)) {
      callback(key, theObject[key]);
    }
  }
}

export function forEachOnArray(theArray, callback) {
  /* istanbul ignore else */
  if (!isArray(theArray)) {
    return;
  }

  /* istanbul ignore else */
  if (!isFunction(callback)) {
    return;
  }

  for (let index = 0, arrayLength = theArray.length; index < arrayLength; index++) {
    callback(index, theArray[index]);
  }
}

export function trim(s) {
  if (!isString(s)) {
    return s;
  } else {
    return s.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
}

export function getTopFrameOfSameDomain(cWin) {
  try {
    /* istanbul ignore else */
    if (cWin.parent.document != cWin.document) {
      return getTopFrameOfSameDomain(cWin.parent);
    }
  } catch (e) { }
  return cWin;
}

export var metaInfo = {};

export function getMetaInfo(cWin) {
  const obj = {};
  const MAX_PAGE_URL_LEN = 512;
  let frame;

  obj.pageURL = '';
  obj.refURL = '';
  obj.protocol = 'https://';
  obj.secure = 1;
  obj.isInIframe = isIframe(cWin);

  try {
    frame = getTopFrameOfSameDomain(cWin);
    obj.refURL = (frame.refurl || frame.document.referrer || '').substr(0, MAX_PAGE_URL_LEN);
    obj.pageURL = (frame !== window.top && frame.document.referrer != '' ? frame.document.referrer : frame.location.href).substr(0, MAX_PAGE_URL_LEN);

    obj.protocol = (({ location }) => {
      /* istanbul ignore else */
      if (location.protocol === 'http:') {
        obj.secure = 0;
        return 'http://';
      }
      obj.secure = 1;
      return 'https://';
    })(frame);
  } catch (e) { }

  obj.pageDomain = getDomainFromURL(obj.pageURL);

  metaInfo = obj;

  return obj;
}

export function isIframe({ self, top }) {
  try {
    return self !== top;
  } catch (e) {
    return false;
  }
}

export function findQueryParamInURL(url, name) {
  return isOwnProperty(parseQueryParams(url), name);
}

export function parseQueryParams(url) {
  const parser = createDocElement(window, 'a');
  parser.href = url;
  const params = {};

  /* istanbul ignore else */
  if (parser.search) {
    let queryString = parser.search.replace('?', '');
    queryString = queryString.split('&');
    forEachOnArray(queryString, (index, keyValue) => {
      keyValue = keyValue.split('=');
      const key = keyValue[0] || '';
      const value = keyValue[1] || '';
      params[key] = value;
    });
  }

  return params;
}

export function createDocElement(win, elementName) {
  return win.document.createElement(elementName);
}

export function addHookOnFunction(theObject, useProto, functionName, newFunction) {
  const callMethodOn = theObject;
  // eslint-disable-next-line no-proto
  theObject = useProto ? theObject.__proto__ : theObject;
  if (isObject(theObject) && isFunction(theObject[functionName])) {
    const originalFunction = theObject[functionName];
    theObject[functionName] = newFunction(callMethodOn, originalFunction);
  } else {
    logWarning('in assignNewDefination: oldReference is not a function');
  }
}

export function getBididForPMP(values, priorityArray) {
  values = values.split(',');

  const valuesLength = values.length;
  const priorityArrayLength = priorityArray.length;
  let selectedPMPDeal = '';
  let bidID = '';

  /* istanbul ignore else */
  if (valuesLength == 0) {
    log('Error: Unable to find bidID as values array is empty.');
    return;
  }

  for (let i = 0; i < priorityArrayLength; i++) {
    for (let j = 0; j < valuesLength; j++) {
      if (values[j].includes(priorityArray[i])) {
        selectedPMPDeal = values[j];
        break;
      }
    }

    /* istanbul ignore else */
    if (selectedPMPDeal != '') {
      break;
    }
  }

  if (selectedPMPDeal == '') {
    selectedPMPDeal = values[0];
    log(`No PMP-Deal was found matching PriorityArray, So Selecting first PMP-Deal: ${selectedPMPDeal}`);
  } else {
    log(`Selecting PMP-Deal: ${selectedPMPDeal}`);
  }

  const temp = selectedPMPDeal.split(CONSTANTS.COMMON.DEAL_KEY_VALUE_SEPARATOR);
  /* istanbul ignore else */
  if (temp.length == 3) {
    bidID = temp[2];
  }

  /* istanbul ignore else */
  if (!bidID) {
    log(`Error: bidID not found in PMP-Deal: ${selectedPMPDeal}`);
    return;
  }

  return bidID;
}

function insertElement(elm, doc = document, target, asLastChildChild) {
  let parentEl;
  if (target) {
    parentEl = doc.getElementsByTagName(target);
  } else {
    parentEl = doc.getElementsByTagName('head');
  }
  try {
    parentEl = parentEl.length ? parentEl : doc.getElementsByTagName('body');
    if (parentEl.length) {
      parentEl = parentEl[0];
      const insertBeforeEl = asLastChildChild ? null : parentEl.firstChild;
      return parentEl.insertBefore(elm, insertBeforeEl);
    }
  } catch (e) { }
}

export function insertHtmlIntoIframe(htmlCode) {
  if (!htmlCode) {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.id = getUniqueIdentifierStr();
  iframe.width = 0;
  iframe.height = 0;
  iframe.hspace = '0';
  iframe.vspace = '0';
  iframe.marginWidth = '0';
  iframe.marginHeight = '0';
  iframe.style.display = 'none';
  iframe.style.height = '0px';
  iframe.style.width = '0px';
  iframe.scrolling = 'no';
  iframe.frameBorder = '0';
  iframe.allowtransparency = 'true';

  insertElement(iframe, document, 'body');

  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(htmlCode);
  iframe.contentWindow.document.close();
}

// removeIf(removeNativeRelatedCode)
export function createInvisibleIframe() {
  const f = createDocElement(window, 'iframe');
  f.id = getUniqueIdentifierStr();
  f.height = 0;
  f.width = 0;
  f.border = '0px';
  f.hspace = '0';
  f.vspace = '0';
  f.marginWidth = '0';
  f.marginHeight = '0';
  f.style.border = '0';
  f.scrolling = 'no';
  f.frameBorder = '0';
  // f.src = 'about:self';//todo: test by setting empty src on safari
  f.style = 'display:none';
  return f;
}

// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function addMessageEventListener(theWindow, eventHandler) {
  /* istanbul ignore else */
  if (typeof eventHandler !== 'function') {
    log('EventHandler should be a function');
    return false;
  }

  if (theWindow.addEventListener) {
    theWindow.addEventListener('message', eventHandler, false);
  } else {
    theWindow.attachEvent('onmessage', eventHandler);
  }
  return true;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function safeFrameCommunicationProtocol(msg) {
  try {
    let bidSlotId;
    let msgData = window.JSON.parse(msg.data);
    /* istanbul ignore else */
    if (!msgData.pwt_type) {
      return;
    }

    switch (window.parseInt(msgData.pwt_type)) {
      case 1:
        /* istanbul ignore else */
        if (window.PWT.isSafeFrame) {
          return;
        }

        var bidDetails = bidSlotId = bidManager.getBidById(msgData.pwt_bidID);
        /* istanbul ignore else */
        if (bidDetails) {
          var theBid = bidDetails.bid;
          var adapterID = theBid.getAdapterID();
          var divID = bidDetails.slotid;
          const newMsgData = {
            pwt_type: 2,
            pwt_bid: theBid
          };
          vLogInfo(divID, { type: 'disp', adapter: adapterID });
          bidManager.executeMonetizationPixel(divID, theBid);
          // outstream video renderer for safe frame.
          if (theBid && theBid.pbbid && theBid.pbbid.mediaType == 'video' && theBid.renderer && isObject(theBid.renderer)) {
            if (isFunction(theBid.renderer.render)) {
              theBid.renderer.render(theBid.getPbBid());
            }
          } else {
            resizeWindow(window.document, theBid.width, theBid.height, divID);
            msg.source.postMessage(window.JSON.stringify(newMsgData), msgData.pwt_origin);
          }
        }
        break;

      case 2:
        /* istanbul ignore else */
        if (!window.PWT.isSafeFrame) {
          return;
        }

        /* istanbul ignore else */
        if (msgData.pwt_bid) {
          theBid = msgData.pwt_bid;
          if (theBid.adHtml) {
            try {
              const iframe = createInvisibleIframe(window.document);
              /* istanbul ignore else */
              if (!iframe) {
                throw { message: 'Failed to create invisible frame.', name: '' };
              }

              iframe.setAttribute('width', theBid.width);
              iframe.setAttribute('height', theBid.height);
              iframe.style = '';

              window.document.body.appendChild(iframe);

              /* istanbul ignore else */
              if (!iframe.contentWindow) {
                throw { message: 'Unable to access frame window.', name: '' };
              }

              const iframeDoc = iframe.contentWindow.document;
              /* istanbul ignore else */
              if (!iframeDoc) {
                throw { message: 'Unable to access frame window document.', name: '' };
              }

              let content = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><scr' + 'ipt>inDapIF=true;</scr' + 'ipt></head>';
              content += '<body>';
              content += '<script>var $sf = window.parent.$sf;<\/script>';
              content += '<script>setInterval(function(){try{var fr = window.document.defaultView.frameElement;fr.width = window.parent.document.defaultView.innerWidth;fr.height = window.parent.document.defaultView.innerHeight;}catch(e){}}, 200);</script>';
              content += theBid.adHtml;
              content += '</body></html>';

              iframeDoc.write(content);
              iframeDoc.close();
            } catch (e) {
              logError('Error in rendering creative in safe frame.');
              log(e);
              log('Rendering synchronously.');
              displayCreative(window.document, msgData.pwt_bid);
            }
          } else if (theBid.adUrl) {
            writeIframe(window.document, theBid.adUrl, theBid.width, theBid.height, '');
          } else {
            logWarning('creative details are not found');
            log(theBid);
          }
        }
        break;

      // removeIf(removeNativeRelatedCode)
      case 3:
        if (CONFIG.isPrebidPubMaticAnalyticsEnabled()) {
          msg = { message: 'Prebid Native', adId: msgData.pwt_bidID, action: msgData.pwt_action };
          window.postMessage(JSON.stringify(msg), '*');
        } else {
          bidDetails = bidSlotId = bidManager.getBidById(msgData.pwt_bidID);
          /* istanbul ignore else */
          if (bidDetails) {
            theBid = bidDetails.bid;
            adapterID = theBid.getAdapterID();
            divID = bidDetails.slotid;
            vLogInfo(divID, { type: 'disp', adapter: adapterID });
            if (msgData.pwt_action && msgData.pwt_action == 'imptrackers') {
              bidManager.executeMonetizationPixel(divID, theBid);
            }
            bidManager.fireTracker(theBid, msgData.pwt_action);
          }
        }
        break;
      // endRemoveIf(removeNativeRelatedCode)
    }

    // Check if browsers local storage has auction related data and update impression served count accordingly.
    const frequencyDepth = JSON.parse(localStorage.getItem(`PROFILE_AUCTION_INFO_${window.location.hostname}`)) || {};
    if (frequencyDepth !== null && frequencyDepth.slotLevelFrquencyDepth) {
      frequencyDepth.slotLevelFrquencyDepth[frequencyDepth.codeAdUnitMap[bidSlotId && bidSlotId.slotid]].impressionServed = frequencyDepth.slotLevelFrquencyDepth[frequencyDepth.codeAdUnitMap[bidSlotId && bidSlotId.slotid]].impressionServed + 1;
      frequencyDepth.impressionServed = frequencyDepth.impressionServed + 1;
    }
    localStorage.setItem(`PROFILE_AUCTION_INFO_${window.location.hostname}`, JSON.stringify(frequencyDepth));
  } catch (e) { }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function addMessageEventListenerForSafeFrame(theWindow) {
  addMessageEventListener(theWindow, safeFrameCommunicationProtocol);
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

export function getElementLocation(el) {
  let rect;
  let x = 0;
  let y = 0;

  if (isFunction(el.getBoundingClientRect)) {
    rect = el.getBoundingClientRect();
    x = Math.floor(rect.left);
    y = Math.floor(rect.top);
  } else {
    while (el) {
      x += el.offsetLeft;
      y += el.offsetTop;
      el = el.offsetParent;
    }
  }
  return { x, y };
}

export function createVLogInfoPanel(divID, dimensionArray) {
  let element;
  let infoPanelElement;
  let infoPanelElementID;
  const doc = window.document;

  /* istanbul ignore else */
  if (visualDebugLogIsEnabled) {
    element = doc.getElementById(divID);
    /* istanbul ignore else */
    if (element && dimensionArray.length && dimensionArray[0][0] && dimensionArray[0][1]) {
      infoPanelElementID = `${divID}-pwtc-info`;
      /* istanbul ignore else */
      if (!isUndefined(doc.getElementById(infoPanelElementID))) {
        const pos = getElementLocation(element);
        infoPanelElement = doc.createElement('div');
        infoPanelElement.id = infoPanelElementID;
        infoPanelElement.style = `position: absolute; /*top: ${pos.y}px;*/ left: ${pos.x}px; width: ${dimensionArray[0][0]}px; height: ${dimensionArray[0][1]}px; border: 1px solid rgb(255, 204, 52); padding-left: 11px; background: rgb(247, 248, 224) none repeat scroll 0% 0%; overflow: auto; z-index: 9999997; visibility: hidden;opacity:0.9;font-size:13px;font-family:monospace;`;

        const closeImage = doc.createElement('img');
        closeImage.src = `${metaInfo.protocol}ads.pubmatic.com/AdServer/js/pwt/close.png`;
        closeImage.style = `cursor:pointer; position: absolute; top: 2px; left: ${pos.x + dimensionArray[0][0] - 16 - 15}px; z-index: 9999998;`;
        closeImage.title = 'close';
        closeImage.onclick = () => {
          infoPanelElement.style.display = 'none';
        };
        infoPanelElement.appendChild(closeImage);
        infoPanelElement.appendChild(doc.createElement('br'));

        let text = `Slot: ${divID} | `;
        for (let i = 0; i < dimensionArray.length; i++) {
          text += `${(i != 0 ? ', ' : '') + dimensionArray[i][0]}x${dimensionArray[i][1]}`;
        }
        infoPanelElement.appendChild(doc.createTextNode(text));
        infoPanelElement.appendChild(doc.createElement('br'));
        element.parentNode.insertBefore(infoPanelElement, element);
      }
    }
  }
}

export function realignVLogInfoPanel(divID) {
  let element;
  let infoPanelElement;
  let infoPanelElementID;
  const doc = window.document;

  /* istanbul ignore else */
  if (visualDebugLogIsEnabled) {
    element = doc.getElementById(divID);
    /* istanbul ignore else */
    if (element) {
      infoPanelElementID = `${divID}-pwtc-info`;
      infoPanelElement = doc.getElementById(infoPanelElementID);
      /* istanbul ignore else */
      if (infoPanelElement) {
        const pos = getElementLocation(element);
        infoPanelElement.style.visibility = 'visible';
        infoPanelElement.style.left = `${pos.x}px`;
        infoPanelElement.style.height = `${element.clientHeight}px`;
      }
    }
  }
}

export function vLogInfo(divID, infoObject) {
  let infoPanelElement;
  let message;
  const doc = window.document;
  /* istanbul ignore else */
  if (visualDebugLogIsEnabled) {
    const infoPanelElementID = `${divID}-pwtc-info`;
    infoPanelElement = doc.getElementById(infoPanelElementID);
    /* istanbul ignore else */
    if (infoPanelElement) {
      switch (infoObject.type) {
        case 'bid':
          let latency = infoObject.latency;
          var bidDetails = infoObject.bidDetails;
          var currencyMsg = '';
          /* istanbul ignore else */
          if (latency < 0) {
            latency = 0;
          }
          if (infoObject.hasOwnProperty('adServerCurrency') && infoObject['adServerCurrency'] !== undefined) {
            if (infoObject.adServerCurrency == 0) {
              currencyMsg = 'USD';
            } else {
              currencyMsg = infoObject.adServerCurrency;
            }
          } else {
            currencyMsg = 'USD';
          }
          message = `Bid: ${infoObject.bidder}${infoObject.s2s ? '(s2s)' : ''}: ${bidDetails.getNetEcpm()}(${bidDetails.getGrossEcpm()})${currencyMsg} :${latency}ms`;
          /* istanbul ignore else */
          if (bidDetails.getPostTimeoutStatus()) {
            message += ': POST-TIMEOUT';
          }
          break;

        case 'win-bid':
          bidDetails = infoObject.bidDetails;
          currencyMsg = '';
          if (infoObject.hasOwnProperty('adServerCurrency') && infoObject['adServerCurrency'] !== undefined) {
            if (infoObject.adServerCurrency == 0) {
              currencyMsg = 'USD';
            } else {
              currencyMsg = infoObject.adServerCurrency;
            }
          } else {
            currencyMsg = 'USD';
          }
          message = `Winning Bid: ${bidDetails.getAdapterID()}: ${bidDetails.getNetEcpm()}${currencyMsg}`;
          break;

        case 'win-bid-fail':
          message = 'There are no bids from PWT';
          break;

        case 'hr':
          message = '----------------------';
          break;

        case 'disp':
          message = `Displaying creative from ${infoObject.adapter}`;
          break;
      }
      infoPanelElement.appendChild(doc.createTextNode(message));
      infoPanelElement.appendChild(doc.createElement('br'));
    }
  }
}

export function getExternalBidderStatus(divIds) {
  let status = true;
  forEachOnArray(divIds, (key, divId) => {
    status = window.OWT.externalBidderStatuses[divId]
      ? status && window.OWT.externalBidderStatuses[divId].status
      : status;
  });
  return status;
}

export function resetExternalBidderStatus(divIds) {
  forEachOnArray(divIds, function (key, divId) {
    log(`resetExternalBidderStatus: ${divId}`);
    window.OWT.externalBidderStatuses[divId] = undefined;
  });
}

// removeIf(removeLegacyAnalyticsRelatedCode)
export function ajaxRequest(url, callback, data, options) {
  try {
    options = options || {};

    let x;
    const XHR_DONE = 4;
    let ajaxSupport = true;
    const method = options.method || (data ? 'POST' : 'GET');

    if (!window.XMLHttpRequest) {
      ajaxSupport = false;
    } else {
      x = new window.XMLHttpRequest();
      if (isUndefined(x.responseType)) {
        ajaxSupport = false;
      }
    }

    if (!ajaxSupport) {
      log('Ajax is not supported');
      return;
    }

    x.onreadystatechange = () => {
      if (x.readyState === XHR_DONE && callback) {
        callback(x.responseText, x);
      }
    };

    x.open(method, url);

    if (options.withCredentials) {
      x.withCredentials = true;
    }

    if (options.preflight) {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }

    x.setRequestHeader('Content-Type', options.contentType || 'text/plain');
    x.send(method === 'POST' && data);
  } catch (error) {
    log('Failed in Ajax');
    log(error);
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

export function addFloorConfigIfPresent(config, adUnitConfig, defaultFloor) {
	if(config.floors || defaultFloor){
		adUnitConfig["floors"] = config.floors || defaultFloor;
	}	
}

// Returns mediaTypes for adUnits which are sent to prebid
export function getAdUnitConfig(sizes, currentSlot) {
  function iskgpvpresent() {
    if (kgpv) {
      return Object.keys(slotConfig['config']).toString().toLowerCase().includes(kgpv.toLowerCase());
    }
  }
  // checks if regex is present and enabled
  function isregexEnabled() {
    return !!(slotConfig && (slotConfig[CONSTANTS.COMMON.MCONF_REGEX] == true));
  }
  // Returns regex-matched config for kgpv, if not found returns undefined
  function isAdunitRegex() {
    const regexKeys = Object.keys(slotConfig['config']);
    let matchedRegex;
    regexKeys.forEach(function (exp) {
      try {
        // Ignores "default" key and RegExp performs case insensitive check
        if (exp.length > 0 && exp != CONSTANTS.COMMON.DEFAULT && kgpv.match(new RegExp(exp, 'i'))) {
          matchedRegex = exp;
          return;
        }
      } catch (ex) {
        log(CONSTANTS.MESSAGES.M32 + JSON.stringify(exp));
      }
    })
    if (matchedRegex) {
      return slotConfig['config'][matchedRegex];
    } else {
      return undefined;
    }
  }
  // returns selected MediaConfig
  function selectSlotConfig() {
    // exact-match else regex check
    if (iskgpvpresent()) {
      return slotConfig['config'][kgpv];
    } else if (isregexEnabled()) {
      return isAdunitRegex();
    }
  }

  const adUnitConfig = {};
  const mediaTypeObject = {};
  var slotConfig = CONFIG.getSlotConfiguration();
  if (slotConfig) {
    if ((slotConfig.configPattern && slotConfig.configPattern.trim() != '') || (slotConfig['configPattern'] = '_AU_')) {
      const kgp = slotConfig.configPattern;
      let isVideo = true;
      let isNative = true;
      let isBanner = true;
      let config;
			var defaultFloor = undefined;
      var divId = isFunction(currentSlot.getDivID) ? currentSlot.getDivID() : currentSlot.getSlotId().getDomId();

      // TODO: Have to write logic if required in near future to support multiple kgpvs, right now
      // as we are only supporting div and ad unit, taking the first slot name.
      // Implemented as per code review and discussion.

      var kgpv = generateSlotNamesFromPattern(currentSlot, kgp, false)[0];
      // Global Default Enable is false then disable each
      if (isOwnProperty(slotConfig['config'], CONSTANTS.COMMON.DEFAULT)) {
        if (slotConfig['config'][CONSTANTS.COMMON.DEFAULT].banner && isOwnProperty(slotConfig['config'][CONSTANTS.COMMON.DEFAULT].banner, 'enabled') && !slotConfig['config'][CONSTANTS.COMMON.DEFAULT].banner.enabled) {
          isBanner = false;
        }
        if (slotConfig['config'][CONSTANTS.COMMON.DEFAULT].native && isOwnProperty(slotConfig['config'][CONSTANTS.COMMON.DEFAULT].native, 'enabled') && !slotConfig['config'][CONSTANTS.COMMON.DEFAULT].native.enabled) {
          isNative = false;
        }
        if (slotConfig['config'][CONSTANTS.COMMON.DEFAULT].video && isOwnProperty(slotConfig['config'][CONSTANTS.COMMON.DEFAULT].video, 'enabled') && !slotConfig['config'][CONSTANTS.COMMON.DEFAULT].video.enabled) {
          isVideo = false;
        }
        config = slotConfig['config'][CONSTANTS.COMMON.DEFAULT];
				defaultFloor = config && config["floors"];
        if (config.renderer && !isEmptyObject(config.renderer)) {
          adUnitConfig['renderer'] = config.renderer;
        }
      }
      if (isOwnProperty(slotConfig['config'], kgpv) || iskgpvpresent() || isregexEnabled()) {
        // populating slotlevel config
        const slConfig = selectSlotConfig();
        // if SLConfig present then override default config
        if (slConfig) {
          config = slConfig;
        }

        if (!config) {
          config = slotConfig['config'][Object.keys(slotConfig['config']).filter(key => key.toLocaleLowerCase() === kgpv.toLowerCase())]
        }
        log(`Config${JSON.stringify(config)} found for adSlot: ${JSON.stringify(currentSlot)}`);
      } else {
        log(`Considering Default Config for ${JSON.stringify(currentSlot)}`);
      }
      if (config) {
        if (isNative && config.native && (!isOwnProperty(config.native, 'enabled') || config.native.enabled)) {
          if (config.native['config']) {
            mediaTypeObject['native'] = config.native['config'];
          } else {
            logWarning(`Native Config will not be considered as no config has been provided for slot${JSON.stringify(currentSlot)} or there is no configuration defined in default.`);
          }
        }
        if (isVideo && config.video && (!isOwnProperty(config.video, 'enabled') || config.video.enabled)) {
          if (CONFIG.getAdServer() != CONSTANTS.AD_SERVER.DFP) {
            if (config.video['config']) {
              mediaTypeObject['video'] = config.video['config'];
              if (config.video['partnerConfig']) {
                mediaTypeObject['partnerConfig'] = config.video['partnerConfig'];
              }
            } else {
              logWarning(`Video Config will not be considered as no config has been provided for slot${JSON.stringify(currentSlot)} or there is no configuration defined in default.`);
            }
          } else {
            logWarning('Video Config will not be considered with DFP selected as AdServer.');
          }
        }
        if (config.renderer && !isEmptyObject(config.renderer)) {
          adUnitConfig['renderer'] = config.renderer;
        }
				if(config.ortb2Imp && !refThis.isEmptyObject(config.ortb2Imp)){
					adUnitConfig['ortb2Imp'] = config.ortb2Imp;
				}
        if (!isBanner || (config.banner && (isOwnProperty(config.banner, 'enabled') && !config.banner.enabled))) {
          mediaTypeConfig[divId] = mediaTypeObject;
          adUnitConfig['mediaTypeObject'] = mediaTypeObject
					addFloorConfigIfPresent(config, adUnitConfig, defaultFloor);
          return adUnitConfig;
        }
				addFloorConfigIfPresent(config, adUnitConfig, defaultFloor);
      } else {
        log(`Config not found for adSlot: ${JSON.stringify(currentSlot)}`);
      }
    } else {
      logWarning('Slot Type not found in config. Please provide slotType in configuration');
    }
  }
  mediaTypeObject['banner'] = {
    sizes
  };
  mediaTypeConfig[divId] = mediaTypeObject;
  adUnitConfig['mediaTypeObject'] = mediaTypeObject
  return adUnitConfig;
}

// removeIf(removeNativeRelatedCode)
export function addEventListenerForClass(theWindow, theEvent, theClass, eventHandler) {
  if (typeof eventHandler !== 'function') {
    log('EventHandler should be a function');
    return false;
  }
  const elems = findElementsByClass(theWindow, theClass);
  if (!theWindow.addEventListener) {
    theEvent = `on${theEvent}`;
  }
  for (let i = 0; i < elems.length; i++) {
    elems[i].addEventListener(theEvent, eventHandler, true);
  }
  return true;
}

// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeNativeRelatedCode)
export function findElementsByClass(theWindow, theClass) {
  return theWindow.document.getElementsByClassName(theClass) || [];
}

// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeNativeRelatedCode)
export function getBidFromEvent(theEvent) {
  return (theEvent && theEvent.target && theEvent.target.attributes && theEvent.target.attributes[CONSTANTS.COMMON.BID_ID] && theEvent.target.attributes[CONSTANTS.COMMON.BID_ID].value) || '';
}

// endRemoveIf(removeNativeRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function getAdFormatFromBidAd(ad) {
  let format;
  if (ad && isString(ad)) {
    // TODO: Uncomment below code once video has been implemented
    try {
      const videoRegex = new RegExp(/VAST\s+version/);
      if (videoRegex.test(ad)) {
        format = CONSTANTS.FORMAT_VALUES.VIDEO;
      } else {
        const adStr = JSON.parse(ad.replace(/\\/g, ''));
        if (adStr && adStr.native) {
          format = CONSTANTS.FORMAT_VALUES.NATIVE;
        }
      }
    } catch (ex) {
      format = CONSTANTS.FORMAT_VALUES.BANNER;
    }
    // }
  }
  return format;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// This common function can be used add hooks for publishers to make changes in flows
export function handleHook(hookName, arrayOfDataToPass) {
  // Adding a hook for publishers to modify the data we have
  if (isFunction(window.PWT[hookName])) {
    log(`For Hook-name: ${hookName}, calling window.PWT.${hookName}function.`);
    window.PWT[hookName](...arrayOfDataToPass);
  }
  // else {
  //  log('Hook-name: '+hookName+', window.PWT.'+hookName+' is not a function.' );
  // }
}

export function getCurrencyToDisplay() {
  let defaultCurrency = CONFIG.getAdServerCurrency();
  if (defaultCurrency == 0) {
    defaultCurrency = 'USD';
  }
  if (CONFIG.getAdServerCurrency()) {
    if (window[CONSTANTS.COMMON.PREBID_NAMESPACE] && isFunction(window[CONSTANTS.COMMON.PREBID_NAMESPACE].getConfig)) {
      const pbConf = window[CONSTANTS.COMMON.PREBID_NAMESPACE].getConfig();
      if (pbConf && pbConf.currency && pbConf.currency.adServerCurrency) {
        return pbConf.currency.adServerCurrency;
      }
    }
  }
  return defaultCurrency;
}

export function getConfigFromRegex(klmsForPartner, generatedKey) {
  // This function will return the config for the partner for specific slot.
  // KGP would always be AU@DIV@WXH
  // KLM would be an array of regex Config and regex pattern pairs where key would be regex pattern to match
  // and value would be the config for that slot to be considered.
  /* Algo to match regex pattern
    Start regex parttern matching  pattern -> ["ADUNIT", "DIV", "SIZE"]
    Then match the slot adUnit with pattern
    if successful the match the div then size
    if all are true then return the config else match the next avaiable pattern
    if none of the pattern match then return the error config not found */
  let rxConfig = null;
  const keys = generatedKey.split('@');
  for (let i = 0; i < klmsForPartner.length; i++) {
    const klmv = klmsForPartner[i];
    const rxPattern = klmv.rx;
    if (keys.length == 3) { // Only execute if generated key length is 3 .
      try {
        // Added second parameter to RegExp to make case insenitive check on AU & DIV parameters.
        if (keys[0].match(new RegExp(rxPattern.AU, 'i')) && keys[1].match(new RegExp(rxPattern.DIV, 'i')) && keys[2].match(new RegExp(rxPattern.SIZE, 'i'))) {
          rxConfig = {
            config: klmv.rx_config,
            regexPattern: `${rxPattern.AU}@${rxPattern.DIV}@${rxPattern.SIZE}`
          };
          break;
        }
      } catch (ex) {
        logError(CONSTANTS.MESSAGES.M27 + JSON.stringify(rxPattern));
      }
    } else {
      logWarning(CONSTANTS.MESSAGES.M28 + generatedKey);
    }
  }
  return rxConfig;
}

// removeIf(removeUserIdRelatedCode)
export function getUserIdConfiguration() {
  const userIdConfs = [];
  window[pbNameSpace].onSSOLogin({});
  forEachOnObject(CONFIG.getIdentityPartners(), function (parterId, partnerValues) {
    if (!CONSTANTS.EXCLUDE_PARTNER_LIST.includes(parterId)) {
      userIdConfs.push(getUserIdParams(partnerValues));
    }
  });
  log(CONSTANTS.MESSAGES.IDENTITY.M4 + JSON.stringify(userIdConfs));
  return userIdConfs;
}

// endRemoveIf(removeUserIdRelatedCode)

// removeIf(removeUserIdRelatedCode)
export function getUserIds() {
  if (isFunction(window[CONSTANTS.COMMON.PREBID_NAMESPACE].getUserIds)) {
    return window[CONSTANTS.COMMON.PREBID_NAMESPACE].getUserIds();
  } else {
    logWarning(`getUserIds${CONSTANTS.MESSAGES.IDENTITY.M6}`);
  };
}

// endRemoveIf(removeUserIdRelatedCode)

// removeIf(removeUserIdRelatedCode)
export function getUserIdsAsEids() {
  if (isFunction(window[CONSTANTS.COMMON.PREBID_NAMESPACE].getUserIdsAsEids)) {
    return window[CONSTANTS.COMMON.PREBID_NAMESPACE].getUserIdsAsEids();
  } else {
    logWarning(`getUserIdsAsEids${CONSTANTS.MESSAGES.IDENTITY.M6}`);
  };
}

// endRemoveIf(removeUserIdRelatedCode)

export function getNestedObjectFromArray(sourceObject, sourceArray, valueOfLastNode) {
  const convertedObject = sourceObject;
  let referenceForNesting = convertedObject;
  for (let i = 0; i < sourceArray.length - 1; i++) {
    if (!referenceForNesting[sourceArray[i]]) {
      referenceForNesting[sourceArray[i]] = {};
    }
    referenceForNesting = referenceForNesting[sourceArray[i]];
  }
  referenceForNesting[sourceArray[sourceArray.length - 1]] = valueOfLastNode;
  return convertedObject;
}

export function getNestedObjectFromString(sourceObject, separator, key, value) {
  const splitParams = key.split(separator);
  if (splitParams.length == 1) {
    sourceObject[key] = value;
  } else {
    sourceObject = getNestedObjectFromArray(sourceObject, splitParams, value);
  }
  return sourceObject;
}

export function deleteCustomParams(params) {
  delete params.custom;
  return params;
}

export function getUserIdParams(params) {
  let userIdParams = {};
  applyDataTypeChangesIfApplicable(params);
  applyCustomParamValuesfApplicable(params);
  for (const key in params) {
    try {
      if (!CONSTANTS.EXCLUDE_IDENTITY_PARAMS.includes(key)) {
        if (CONSTANTS.TOLOWERCASE_IDENTITY_PARAMS.includes(key)) {
          params[key] = params[key].toLowerCase();
        }
        if (CONSTANTS.JSON_VALUE_KEYS.includes(key)) {
          params[key] = JSON.parse(params[key]);
        }
        userIdParams = getNestedObjectFromString(userIdParams, '.', key, params[key]);
      }
    } catch (ex) {
      logWarning(CONSTANTS.MESSAGES.IDENTITY.M3, ex);
    }
  }
  if (userIdParams && userIdParams.params && userIdParams.params['loadATS'] == 'true') {
    initLiveRampAts(userIdParams);
  }
  if (userIdParams && userIdParams.params && userIdParams.params['loadIDP'] == 'true') {
    initZeoTapJs(userIdParams);
  }
  if (userIdParams && userIdParams.params && userIdParams.params['loadLauncher'] == 'true') {
    initLauncherJs(userIdParams);
  }
  if (userIdParams && userIdParams.custom && userIdParams.custom['loadLaunchPad'] == 'true') {
    initLiveRampLaunchPad(userIdParams);
  }
  return deleteCustomParams(userIdParams);
}

export function getPartnerParams(params) {
  let pparams = {};
  for (const key in params) {
    try {
      pparams = getNestedObjectFromString(pparams, '.', key, params[key]);
    } catch (ex) {
      logWarning(CONSTANTS.MESSAGES.M29, ex);
    }
  }
  return pparams;
}

// removeIf(removeLegacyAnalyticsRelatedCode)
export function getAdDomain({ meta }) {
  if (meta && meta.advertiserDomains && meta.advertiserDomains.length > 0) {
    const adomain = meta.advertiserDomains[0];

    if (adomain) {
      try {
        const hostname = new URL(adomain);
        return hostname.hostname.replace('www.', '');
      } catch (e) {
        log(`Adomain URL (Not a proper URL):${adomain}`);
        return adomain.split('/')[0].replace('www.', '');
      }
    }
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function getTgid() {
  const testGroupId = parseInt(window.PWT.testGroupId || 0);
  if (testGroupId <= 15 && testGroupId >= 0) {
    return testGroupId;
  }
  return 0;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function generateMonetizationPixel(slotID, theBid) {
  let pixelURL = CONFIG.getMonetizationPixelURL();
  const pubId = CONFIG.getPublisherId();
  let netEcpm;
  let grossEcpm;
  let kgpv;
  let bidId;
  let adapterId;
  let adapterName;
  let adUnitId;
  let sspID = '';
  const isAnalytics = true; // this flag is required to get grossCpm and netCpm in dollars instead of adserver currency
  const prebidBidId = (theBid.pbbid && theBid.pbbid.prebidBidId) || (theBid.prebidBidId);

  /* istanbul ignore else */
  if (!pixelURL) {
    return;
  }

  if (isFunction(theBid.getGrossEcpm)) {
    grossEcpm = theBid.getGrossEcpm(isAnalytics);
  } else {
    if (CONFIG.getAdServerCurrency() && isFunction(theBid.getCpmInNewCurrency)) {
      grossEcpm = window.parseFloat(theBid.getCpmInNewCurrency(CONSTANTS.COMMON.ANALYTICS_CURRENCY));
    } else {
      if (CONFIG.isPrebidPubMaticAnalyticsEnabled() && theBid.originalCpm) {
        grossEcpm = theBid.originalCpm;
      } else {
        grossEcpm = theBid.cpm;
      }
    }
  }
  if (isFunction(theBid.getAdapterID)) {
    adapterId = theBid.getAdapterID()
  } else {
    adapterId = theBid.bidderCode
  }
  // Uncomment below code in case hybrid profile is supported
  if (adapterId == 'pubmaticServer') {
    adapterId = theBid.originalBidder || 'pubmatic'; // in case of pubmaticServer we will get originalBidder, assigning pubmatic just in case originalBidder is not there.
  }

  adapterName = CONFIG.getAdapterNameForAlias(adapterId);

  // Do we need all checks or we can just use one check
  if (isFunction(theBid.getNetEcpm)) {
    netEcpm = theBid.getNetEcpm(isAnalytics)
  } else {
    // else would be executed in case this function is called from prebid for vast updation
    netEcpm = window.parseFloat((grossEcpm * CONFIG.getAdapterRevShare(adapterId)).toFixed(CONSTANTS.COMMON.BID_PRECISION))
  }

  if (isFunction(theBid.getBidID)) {
    bidId = theBid.getBidID()
  } else {
    if (CONFIG.isPrebidPubMaticAnalyticsEnabled() && theBid.adId) {
      bidId = theBid.adId;
    } else {
      bidId = window.PWT.bidMap[slotID].adapters[adapterId].bids[Object.keys(window.PWT.bidMap[slotID].adapters[adapterId].bids)[0]].bidID;
    }
  }
  if (isFunction(theBid.getKGPV)) {
    kgpv = theBid.getKGPV()
  } else {
    kgpv = window.PWT.bidMap[slotID].adapters[adapterId].bids[Object.keys(window.PWT.bidMap[slotID].adapters[adapterId].bids)[0]].getKGPV(false, theBid.mediaType);
  }
  if (isFunction(theBid.getsspID)) {
    sspID = theBid.getsspID();
  } else {
    sspID = theBid.sspID || '';
  }

  const origAdUnit = bidManager.getAdUnitInfo(slotID);
  adUnitId = origAdUnit.adUnitId || slotID;
  const iiid = window.PWT.bidMap[slotID].getImpressionID();
  const isRefreshed = (window.PWT.newAdUnits && window.PWT.newAdUnits[iiid] && window.PWT.newAdUnits[iiid][slotID] && window.PWT.newAdUnits[iiid][slotID]['pubmaticAutoRefresh'] && window.PWT.newAdUnits[iiid][slotID]['pubmaticAutoRefresh']['isRefreshed']) ? 1 : 0;
  // var impressionID = PWT.bidMap[slotID].impressionID;
  const adv = getAdDomain(theBid.pbbid || theBid) || undefined;
  const fskp = window.PWT.floorData
    ? (window.PWT.floorData[iiid]
      ? (window.PWT.floorData[iiid].floorRequestData
        ? (window.PWT.floorData[iiid].floorRequestData.skipped == false ? 0 : 1)
        : undefined)
      : undefined)
    : undefined;

  pixelURL += `pubid=${pubId}`;
  pixelURL += `&purl=${window.encodeURIComponent(metaInfo.pageURL)}`;
  pixelURL += `&tst=${getCurrentTimestamp()}`;
  pixelURL += `&iid=${window.encodeURIComponent(window.PWT.bidMap[slotID].getImpressionID())}`;
  pixelURL += `&bidid=${prebidBidId ? window.encodeURIComponent(prebidBidId) : window.encodeURIComponent(bidId)}`;
  pixelURL += `&origbidid=${window.encodeURIComponent(bidId)}`;
  pixelURL += `&pid=${window.encodeURIComponent(CONFIG.getProfileID())}`;
  pixelURL += `&pdvid=${window.encodeURIComponent(CONFIG.getProfileDisplayVersionID())}`;
  pixelURL += `&slot=${window.encodeURIComponent(slotID)}`;
  pixelURL += `&au=${window.encodeURIComponent(adUnitId)}`;
  pixelURL += `&bc=${window.encodeURIComponent(adapterId)}`;
  pixelURL += `&pn=${window.encodeURIComponent(adapterName)}`;
  pixelURL += `&en=${window.encodeURIComponent(netEcpm)}`;
  pixelURL += `&eg=${window.encodeURIComponent(grossEcpm)}`;
  pixelURL += `&kgpv=${window.encodeURIComponent(kgpv)}`;
  pixelURL += `&piid=${window.encodeURIComponent(sspID)}`;
  pixelURL += `&rf=${window.encodeURIComponent(isRefreshed)}`;
	pixelURL += "&di=" + window.encodeURIComponent(theBid.getDealID() || "-1");

  pixelURL += `&plt=${window.encodeURIComponent(getDevicePlatform())}`;
  pixelURL += (isFunction(theBid.getWidth) && isFunction(theBid.getHeight))
    ? (`&psz=${window.encodeURIComponent(`${theBid.getWidth()}x${theBid.getHeight()}`)}`)
    : ((isFunction(theBid.getSize))
      ? (`&psz=${window.encodeURIComponent(theBid.getSize())}`)
      : `&psz=${window.encodeURIComponent(`${theBid.width}x${theBid.height}`)}`);
  pixelURL += `&tgid=${window.encodeURIComponent(getTgid())}`;
  adv && (pixelURL += `&adv=${window.encodeURIComponent(adv)}`);
  pixelURL += `&orig=${window.encodeURIComponent((metaInfo && metaInfo.pageDomain) || '')}`;
  pixelURL += `&ss=${window.encodeURIComponent(isFunction(theBid.getServerSideStatus)
    ? (theBid.getServerSideStatus() ? 1 : 0)
    : (CONFIG.isServerSideAdapter(adapterId) ? 1 : 0))}`;
  (fskp != undefined) && (pixelURL += `&fskp=${window.encodeURIComponent(fskp)}`);
  pixelURL += `&af=${window.encodeURIComponent(isFunction(theBid.getAdFormat)
    ? theBid.getAdFormat() : (theBid.mediaType || undefined))}`;

  return CONSTANTS.COMMON.PROTOCOL + pixelURL;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function UpdateVastWithTracker(bid, vast) {
  try {
    const domParser = new DOMParser();
    const parsedVast = domParser.parseFromString(vast, 'application/xml');
    const impEle = parsedVast.createElement('Impression');
    impEle.innerHTML = CONFIG.isPrebidPubMaticAnalyticsEnabled() ? '' : `<![CDATA[${generateMonetizationPixel(bid.adUnitCode, bid)}]]>`;
    if (parsedVast.getElementsByTagName('Wrapper').length == 1) {
      parsedVast.getElementsByTagName('Wrapper')[0].appendChild(impEle);
    } else if (parsedVast.getElementsByTagName('InLine').length == 1) {
      parsedVast.getElementsByTagName('InLine')[0].appendChild(impEle);
    }
    return new XMLSerializer().serializeToString(parsedVast);
  } catch (ex) {
    return vast;
  }
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

export function getDomainFromURL(url) {
  const a = window.document.createElement('a');
  a.href = url;
  return a.hostname;
}

// removeIf(removeLegacyAnalyticsRelatedCode)
export function replaceAuctionPrice(str, cpm) {
  if (!str) return;
  return str.replace(/\$\{AUCTION_PRICE\}/g, cpm);
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

// removeIf(removeInStreamRelatedCode)
export function getCustomParamsForDFPVideo(customParams, bid) {
  const adserverTargeting = (bid && bid.adserverTargeting) || {};
  const targetingKeys = {};
  for (const key in adserverTargeting) {
    if (isOwnProperty(adserverTargeting, key)) {
      if (isArray(adserverTargeting[key])) {
        targetingKeys[key] = adserverTargeting[key].join();
      } else {
        targetingKeys[key] = adserverTargeting[key];
      }
    }
  }
  customParams = Object.assign({},
    targetingKeys,
    customParams);
  return customParams;
}

// endRemoveIf(removeInStreamRelatedCode)

// removeIf(removeLegacyAnalyticsRelatedCode)
export function getDevicePlatform() {
  let deviceType = 3;
  try {
    let ua = navigator.userAgent;
    if (ua && isString(ua) && ua.trim() != '') {
      ua = ua.toLowerCase().trim();
      const isMobileRegExp = new RegExp('(mobi|tablet|ios).*');
      if (ua.match(isMobileRegExp)) {
        deviceType = 2;
      } else {
        deviceType = 1;
      }
    }
  } catch (ex) {
    logError('Unable to get device platform', ex);
  }
  return deviceType;
}

// endRemoveIf(removeLegacyAnalyticsRelatedCode)

export function getOWConfig() {
  const obj = {
    'timeout': CONFIG.getTimeout(),
    'openwrap_version': CONFIG.getOWVersion(),
    'prebid_version': CONFIG.getPrebidVersion(),
    'profileId': CONFIG.getProfileID(),
    'profileVersionId': CONFIG.getProfileDisplayVersionID()
  };
  return obj;
}

// removeIf(removeIdHubOnlyRelatedCode)
export function updateAdUnits(adUnits) {
  if (isArray(adUnits)) {
    adUnits.forEach(({ bids }) => {
      bids.forEach(function (bid) {
        updateUserIds(bid);
      });
    });
  } else if (!isEmptyObject(adUnits)) {
    adUnits.bids.forEach(function (bid) {
      updateUserIds(bid);
    });
  }
}

// endRemoveIf(removeIdHubOnlyRelatedCode)

// removeIf(removeIdHubOnlyRelatedCode)
export function updateUserIds(bid) {
  // idsAppendedToAdUnits =true;
  if (isUndefined(bid.userId)) {
    bid['userId'] = getUserIds();
  } else if (bid.userId) {
    /* istanbul ignore next */
    bid.userId = Object.assign(bid.userId, getUserIds());
  }
  if (isUndefined(bid.userIdAsEids)) {
    bid['userIdAsEids'] = getUserIdsAsEids();
  } else if (isArray(bid.userIdAsEids)) {
    const idsPresent = new Set();
    let ids = getUserIdsAsEids().concat(bid.userIdAsEids);
    if (isArray(ids) && ids.length > 0) {
      ids = ids.filter(({ source }) => {
        if (source) {
          if (idsPresent.has(source)) {
            return false;
          }
          idsPresent.add(source);
        }
        return true;
      })
    }
    bid.userIdAsEids = ids;
  }
}

// endRemoveIf(removeIdHubOnlyRelatedCode)
export function getLiverampParams(params) {
  if (params.params.cssSelectors && params.params.cssSelectors.length > 0) {
    params.params.cssSelectors = params.params.cssSelectors.split(',');
  }
  const userIdentity = window[pbNameSpace].getUserIdentities() || {};
  const enableSSO = CONFIG.isSSOEnabled() || false;
  const detectionMechanism = params.params.detectionMechanism;
  const enableCustomId = params.params.enableCustomId === 'true';
  const atsObject = {
    'placementID': params.params.pid,
    'storageType': params.params.storageType,
    'logging': params.params.logging // "error"
  };
  if (enableCustomId) {
    atsObject.accountID = params.params.accountID;
    atsObject.customerIDRegex = params.params.customerIDRegex;
    atsObject.detectionSubject = 'customerIdentifier';
  }

  switch (detectionMechanism) {
    case undefined:
    case 'detect':
      atsObject.detectionType = params.params.detectionType;
      atsObject.urlParameter = params.params.urlParameter;
      atsObject.cssSelectors = params.params.cssSelectors;
      atsObject.detectDynamicNodes = params.params.detectDynamicNodes;
      atsObject.detectionEventType = params.params.detectionEventType;
      if (params.params.triggerElements && params.params.triggerElements.length > 0) {
        params.params.triggerElements = params.params.triggerElements.split(',');
        atsObject.triggerElements = params.params.triggerElements;
      }
      break;
    case 'direct':
      atsObject.emailHashes = undefined;
      if ((window.PWT && (window.PWT.OVERRIDES_SCRIPT_BASED_MODULES && window.PWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('identityLink'))) || window.PWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
        const emailHash = enableSSO && userIdentity.emailHash ? userIdentity.emailHash : userIdentity.pubProvidedEmailHash ? userIdentity.pubProvidedEmailHash : undefined;
        atsObject.emailHashes = (emailHash && [emailHash['MD5'], emailHash['SHA1'], emailHash['SHA256']]) || undefined;
      }
      /* do we want to keep sso data under direct option?
      if yes, if sso is enabled and 'direct' is selected as detection mechanism, sso emails will be sent to ats script.
      if sso is disabled, and 'direct' is selected as detection mechanism, we will look for publisher provided email ids, and if available the hashes will be sent to ats script.
      */
      if (enableCustomId && isFunction(window[pbNameSpace].getUserIdentities) && window[pbNameSpace].getUserIdentities() !== undefined) {
        atsObject.customerID = window[pbNameSpace].getUserIdentities().customerID || undefined;
      }
      break;
  };
  return atsObject;
}

export function getEmailHashes() {
  const userIdentity = window[pbNameSpace].getUserIdentities() || {};
  const enableSSO = CONFIG.isSSOEnabled() || false;
  const emailHash = enableSSO && userIdentity.emailHash ? userIdentity.emailHash : userIdentity.pubProvidedEmailHash ? userIdentity.pubProvidedEmailHash : undefined;
  const emailHashArr = [];
  forEachOnObject(emailHash, (keyName, keyValue) => {
    if (keyValue !== undefined) {
      emailHashArr.push(keyValue);
    }
  });
  return emailHashArr.length > 0 ? emailHashArr : undefined;
}

export function initLiveRampLaunchPad({ custom }) {
  const lpURL = `https://launchpad-wrapper.privacymanager.io/${custom.configurationId}/launchpad-liveramp.js`;
  function addLaunchPad() {
    const launchPadScript = document.createElement('script');
    launchPadScript.onload = () => {
      __launchpad('addEventListener', 1, function () {
        const isDirectMode = !(ats.outputCurrentConfiguration()['DETECTION_MODULE_INFO']) ||
          ats.outputCurrentConfiguration()['ENVELOPE_MODULE_INFO']['ENVELOPE_MODULE_CONFIG']['startWithExternalId'];
        if (isDirectMode) { // If direct or detect/direct mode
          if ((window.PWT && (window.PWT.OVERRIDES_SCRIPT_BASED_MODULES && window.PWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('identityLink'))) || window.PWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
            const emailHashes = getEmailHashes();
            emailHashes && window.ats.setAdditionalData({ 'type': 'emailHashes', 'id': emailHashes });
          }
        }
      }, ['atsWrapperLoaded']);
    };
    launchPadScript.src = lpURL;
    document.body.appendChild(launchPadScript);
  }
  addLaunchPad();
}

export function getPublinkLauncherParams(params) {
  if (params.params.cssSelectors && params.params.cssSelectors.length > 0) {
    params.params.cssSelectors = params.params.cssSelectors.split(',');
  }
  const userIdentity = window[pbNameSpace].getUserIdentities() || {};
  const enableSSO = CONFIG.isSSOEnabled() || false;
  const detectionMechanism = params.params.detectionMechanism;
  const lnchObject = {
    'apiKey': params.params.api_key,
    'siteId': params.params.site_id,
  };

  switch (detectionMechanism) {
    case undefined:
    case 'detect':
      lnchObject.urlParameter = params.params.urlParameter;
      lnchObject.cssSelectors = params.params.cssSelectors;
      lnchObject.detectionSubject = 'email';
      break;
    case 'direct':
      if ((window.PWT && (window.PWT.OVERRIDES_SCRIPT_BASED_MODULES && window.PWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('publinkId'))) || window.PWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
        const emailHash = enableSSO && userIdentity.emailHash ? userIdentity.emailHash : userIdentity.pubProvidedEmailHash ? userIdentity.pubProvidedEmailHash : undefined;
        lnchObject.emailHashes = (emailHash && [emailHash['MD5'], emailHash['SHA256']]) || undefined;
      }
      /* do we want to keep sso data under direct option?
      if yes, if sso is enabled and 'direct' is selected as detection mechanism, sso emails will be sent to ats script.
      if sso is disabled, and 'direct' is selected as detection mechanism, we will look for publisher provided email ids, and if available the hashes will be sent to ats script.
      */
      break;
  };
  return lnchObject;
}

export function initLiveRampAts(params) {
  function addATS() {
    const atsScript = document.createElement('script');
    const atsObject = getLiverampParams(params);
    atsScript.onload = () => {
      window.ats && window.ats.start(atsObject);
    };
    atsScript.src = 'https://ats.rlcdn.com/ats.js';
    document.body.appendChild(atsScript);
  }
  if (document.readyState == 'complete') {
    addATS();
  } else {
    window.addEventListener('load', () => {
      setTimeout(addATS, 1000);
    });
  }
}

export function initZeoTapJs({ partnerId }) {
  function addZeoTapJs() {
    let n = document; const t = window;
    const userIdentity = window[pbNameSpace].getUserIdentities() || {};
    const enableSSO = CONFIG.isSSOEnabled() || false;
    let userIdentityObject = {};
    if ((window.PWT && (window.PWT.OVERRIDES_SCRIPT_BASED_MODULES && window.PWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('zeotapIdPlus'))) || window.PWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
      userIdentityObject = {
        email: enableSSO && userIdentity.emailHash ? userIdentity.emailHash['SHA256'] : userIdentity.pubProvidedEmailHash ? userIdentity.pubProvidedEmailHash['SHA256'] : undefined
      };
    };
    const e = n.createElement('script');
    e.type = 'text/javascript';
    e.crossorigin = 'anonymous';
    e.async = !0;
    e.src = 'https://content.zeotap.com/sdk/idp.min.js';
    e.onload = () => { };
    n = n.getElementsByTagName('script')[0];
    const initialsationObject = {
      partnerId,
      allowIDP: true,
      useConsent: (CONFIG.getCCPA() || CONFIG.getGdpr()),
      checkForCMP: (CONFIG.getCCPA() || CONFIG.getGdpr())
    };
    n.parentNode.insertBefore(e, n);

    n = t.zeotap || { _q: [], _qcmp: [] };

    !((n, t, e) => {
      for (let o = 0; o < t.length; o++) {
        !(t => {
          n[t] = (...args) => {
            n[e].push([t].concat(Array.prototype.slice.call(args, 0)))
          }
        })(t[o])
      }
    })(n, ['callMethod'], '_q');
    t.zeotap = n;
    t.zeotap.callMethod('init', initialsationObject);
    t.zeotap.callMethod('setUserIdentities', userIdentityObject, true);
  }

  if (document.readyState == 'complete') {
    addZeoTapJs();
  } else {
    window.addEventListener('load', () => {
      setTimeout(addZeoTapJs, 1000);
    });
  }
}

export function initLauncherJs(params) {
  window.cnvr_launcher_options = { lid: params.params.launcher_id };
  function loadLauncher() {
    const launchScript = document.createElement('script');
    const launchObject = getPublinkLauncherParams(params);
    launchScript.onload = () => {
      window.conversant.getLauncherObject = () => {
        return launchObject;
      }
      window.conversant && window.conversant.launch('publink', 'start', launchObject);
    };
    launchScript.src = 'https://secure.cdn.fastclick.net/js/cnvr-launcher/latest/launcher-stub.min.js';
    document.body.appendChild(launchScript);
  }
  if (document.readyState == 'complete') {
    loadLauncher();
  } else {
    window.addEventListener('load', () => {
      setTimeout(loadLauncher, 1000);
    });
  }
}

export function getRandomNumberBelow100() {
  return Math.floor(Math.random() * 100);
}

export function getUpdatedKGPVForVideo(kgpv, adFormat) {
  if (adFormat == CONSTANTS.FORMAT_VALUES.VIDEO) {
    const videoKgpv = ['', '0x0'];
    const splitKgpv = kgpv.split('@');
    // Adding this check for Div Mapping Only
    if (splitKgpv.length > 1) {
      if (splitKgpv.length == 2) {
        if (splitKgpv[1].includes(':')) {
          const kgpvIndex = splitKgpv[1].split(':');
          videoKgpv[1] = `${videoKgpv[1]}:${kgpvIndex[1]}`;
        }
        videoKgpv[0] = splitKgpv[0];
      }
      kgpv = videoKgpv.join('@');
    }
  }
  return kgpv;
}

export function applyDataTypeChangesIfApplicable(params) {
  let value;
  if (params.name in CONSTANTS.SPECIAL_CASE_ID_PARTNERS) {
    for (partnerName in CONSTANTS.SPECIAL_CASE_ID_PARTNERS) {
      if (partnerName === params.name) {
        for (key in CONSTANTS.SPECIAL_CASE_ID_PARTNERS[partnerName]) {
          const paramValue = params[key];
          switch (CONSTANTS.SPECIAL_CASE_ID_PARTNERS[partnerName][key]) {
            case 'number':
              if (paramValue && typeof paramValue !== 'number') {
                value = parseInt(paramValue)
                isNaN(value)
                  ? logError(`${partnerName}: Invalid parameter value '${paramValue}' for parameter ${key}`)
                  : params[key] = value;
              }
              break;
            case 'array':
              if (paramValue) {
                if (typeof paramValue === 'string') {
                  const arr = paramValue.split(',').map(item => {
                    return item.trim();
                  });
                  if (arr.length > 0) {
                    params[key] = arr;
                  }
                } else if (typeof paramValue === 'number') {
                  params[key] = [paramValue];
                }
              }
              break;
            case 'customObject':
              if (paramValue) {
                if (key === 'params.requestedAttributesOverrides') {
									try {
										params[key] = JSON.parse(paramValue);
									} catch (e) {
										refThis.logError("Error parsing requestedAttributesOverrides for partner ", partnerName);
									}
                }
              }
              break;
            default:
              return;
          }
        }
      }
    }
  }
}

export function applyCustomParamValuesfApplicable(params) {
  if (params.name in CONSTANTS.ID_PARTNERS_CUSTOM_VALUES) {
    const partnerValues = CONSTANTS.ID_PARTNERS_CUSTOM_VALUES[params.name];
    let i = 0;
    for (; i < partnerValues.length; i++) {
      if (!params[partnerValues[i]['key']]) {
        params[partnerValues[i]['key']] = partnerValues[i]['value'];
      }
    }
  }
}

export function getBrowserDetails() {
  return bidManager.getBrowser().toString();
}

export function getPltForFloor() {
  return getDevicePlatform().toString();
}

export function getGeoInfo() {
	let PREFIX = 'UINFO';
	let LOCATION_INFO_VALIDITY =  172800000; // 2 * 24 * 60 * 60 * 1000 - 2 days
	let geoDetectionURL = 'https://ut.pubmatic.com/geo?pubid=' +
		conf[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.PUBLISHER_ID];

	let info = window[pbNameSpace].getDataFromLocalStorage(PREFIX, LOCATION_INFO_VALIDITY);
	if(info && JSON.parse(info).cc) {	// Got valid data
		window.PWT.CC = JSON.parse(info);
	} else {
		window[pbNameSpace].detectLocation(geoDetectionURL,
		function(loc) {
			window[pbNameSpace].setAndStringifyToLocalStorage(PREFIX, loc);
			window.PWT.CC = loc;
		});
	}
}

export function getCDSTargetingData(obj) {
	obj = obj || {};
	let cdsData = window[CONSTANTS.COMMON.PREBID_NAMESPACE].getConfig('cds');
    cdsData && Object.keys(cdsData).map(function(key) {
      if((cdsData[key].sendtoGAM !== false)) {
        let val = cdsData[key].value;
        val = (!Array.isArray(val) && typeof val !== 'object' &&
            typeof val !== 'function' && typeof val !== 'undefined') ? val : '';
        obj[key] = val;
      }
    });
	return obj;
}
