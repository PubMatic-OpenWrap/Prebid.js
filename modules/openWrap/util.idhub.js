// TODO : Need to remove below two eslint lines and make changes accordingly
/* eslint-disable no-undef */
/* eslint-disable no-unused-expressions */
// eslint-disable-next-line no-redeclare
/* global Set */

import * as CONFIG from './config.idhub.js';

import * as CONSTANTS from './constants.js';
var debugLogIsEnabled = false;

/* start-test-block */
export { debugLogIsEnabled };

/* end-test-block */

const typeArray = 'Array';
const typeString = 'String';
const typeFunction = 'Function';
const typeNumber = 'Number';
const toString = Object.prototype.toString;
// const refThis = this;
const pbNameSpace = CONFIG.isIdentityOnly() ? CONSTANTS.COMMON.IH_NAMESPACE : CONSTANTS.COMMON.PREBID_NAMESPACE;
// const idsAppendedToAdUnits = false;

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
    // return theObject.hasOwnProperty(proertyName);
    return Object.prototype.hasOwnProperty.call(theObject, proertyName);
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

export function getTopFrameOfSameDomain(cWin) {
  try {
    /* istanbul ignore else */
    if (cWin.parent.document != cWin.document) {
      return getTopFrameOfSameDomain(cWin.parent);
    }
  } catch (e) {
    // continue regardless of error
  }
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
  } catch (e) {
    // continue regardless of error
  }

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

export function getUserIdConfiguration() {
  const userIdConfs = [];
  forEachOnObject(CONFIG.getIdentityPartners(), (parterId, partnerValues) => {
    if (!CONSTANTS.EXCLUDE_PARTNER_LIST.includes(parterId)) {
      userIdConfs.push(getUserIdParams(partnerValues));
    }
  });
  log(CONSTANTS.MESSAGES.IDENTITY.M4 + JSON.stringify(userIdConfs));
  return userIdConfs;
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

export function getUserIds() {
  if (isFunction(window[pbNameSpace].getUserIds)) {
    return window[pbNameSpace].getUserIds();
  } else {
    logWarning(`getUserIds${CONSTANTS.MESSAGES.IDENTITY.M6}`);
  }
}

export function getDomainFromURL(url) {
  const a = window.document.createElement('a');
  a.href = url;
  return a.hostname;
}

export function handleHook(hookName, arrayOfDataToPass) {
  // Adding a hook for publishers to modify the data we have
  if (isFunction(window.IHPWT[hookName])) {
    log(`For Hook-name: ${hookName}, calling window.IHPWT.${hookName}function.`);
    window.IHPWT[hookName](...arrayOfDataToPass);
  }
  // else {
  //  log('Hook-name: '+hookName+', window.IHPWT.'+hookName+' is not a function.' );
  // }
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

export function getUserIdsAsEids() {
  if (isFunction(window[pbNameSpace].getUserIdsAsEids)) {
    return window[pbNameSpace].getUserIdsAsEids();
  } else {
    logWarning(`getUserIdsAsEids${CONSTANTS.MESSAGES.IDENTITY.M6}`);
  }
}

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
      if ((window.IHPWT && (window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES && window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('identityLink'))) || window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
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
      // eslint-disable-next-line no-undef
      __launchpad('addEventListener', 1, () => {
        // eslint-disable-next-line no-undef
        const isDirectMode = !(ats.outputCurrentConfiguration()['DETECTION_MODULE_INFO']) ||
          // eslint-disable-next-line no-undef
          ats.outputCurrentConfiguration()['ENVELOPE_MODULE_INFO']['ENVELOPE_MODULE_CONFIG']['startWithExternalId'];
        if (isDirectMode) { // If direct or detect/direct mode
          if ((window.IHPWT && (window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES && window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('identityLink'))) || window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
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
      lnchObject.emailHashes = undefined;
      if ((window.IHPWT && (window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES && window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('publinkId'))) || window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
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

export function initZeoTapJs({ partnerId }) {
  function addZeoTapJs() {
    let n = document; const t = window;
    const userIdentity = window[pbNameSpace].getUserIdentities() || {};
    const enableSSO = CONFIG.isSSOEnabled() || false;
    let userIdentityObject = {};
    if ((window.IHPWT && (window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES && window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES.includes('zeotapIdPlus'))) || window.IHPWT.OVERRIDES_SCRIPT_BASED_MODULES === undefined) {
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

export function updateAdUnits(adUnits) {
  if (isArray(adUnits)) {
    adUnits.forEach(({ bids }) => {
      bids.forEach(bid => {
        updateUserIds(bid);
      });
    });
  } else if (!isEmptyObject(adUnits)) {
    adUnits.bids.forEach(bid => {
      updateUserIds(bid);
    });
  }
}

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
    let ids = bid.userIdAsEids.concat(getUserIdsAsEids());
    if (isArray(ids) && ids.length > 0) {
      ids = ids.filter(({ source }) => {
        if (source) {
          if (idsPresent.has(source)) {
            return false;
          }
          idsPresent.add(source);
        }
        return true;
      });
    }
    bid.userIdAsEids = ids;
  }
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
                  // var arr = params[key].split(",");
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

export function getOWConfig() {
  const obj = {
    'openwrap_version': CONFIG.getOwVersion(),
    'prebid_version': CONFIG.getPrebidVersion(),
    'profileId': CONFIG.getProfileID(),
    'profileVersionId': CONFIG.getProfileDisplayVersionID()
  };
  return obj;
}

export function deepMerge(target, source, keyName = 'source') {
  if (isArray(target) && isArray(source)) {
    const mergedArr = [].concat(target);
    source.forEach(item2 => {
      let found = false;
      mergedArr.forEach((item1, index) => {
        if (item1[keyName] === item2[keyName]) {
          mergedArr[index] = deepMerge(item1, item2);
          found = true;
        }
      });
      if (!found) {
        mergedArr.push(item2);
      }
    });
    return mergedArr;
  }

  if (isObject(target) && isObject(source)) {
    const mergedObj = Object.assign({}, target);
    Object.keys(source).forEach(key => {
      if (mergedObj[key] && typeof mergedObj[key] === 'object' && typeof source[key] === 'object') {
        mergedObj[key] = deepMerge(mergedObj[key], source[key]);
      } else {
        mergedObj[key] = source[key];
      }
    });
    return mergedObj;
  }
  return source;
}
