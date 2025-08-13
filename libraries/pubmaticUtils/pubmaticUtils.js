import { getLowEntropySUA } from '../../src/fpd/sua.js';
import {getGlobal} from '../../src/prebidGlobal.js';

const CONSTANTS = Object.freeze({
  TIME_OF_DAY_VALUES: {
    MORNING: 'morning',
    AFTERNOON: 'afternoon',
    EVENING: 'evening',
    NIGHT: 'night'
  },
  UTM: 'utm_',
  UTM_VALUES: {
    TRUE: '1',
    FALSE: '0'
  },
  HAS_ID_VALUES: {
    TRUE: '1',
    FALSE: '0'
  },
  TARGET_HAS_IDS: ['id5id', 'pubcid', 'criteoId', 'tdid', 'lotamePanoramaId', '33acrossId', 'idl_env', 'pairId', 'uid2', 'publinkId'],
});

const BROWSER_REGEX_MAP = [
  { regex: /\b(?:crios)\/([\w.]+)/i, id: 1 }, // Chrome for iOS
  { regex: /(edg|edge)(?:e|ios|a)?(?:\/([\w.]+))?/i, id: 2 }, // Edge
  { regex: /(opera|opr)(?:.+version\/|\/|\s+)([\w.]+)/i, id: 3 }, // Opera
  { regex: /(?:ms|\()(ie) ([\w.]+)|(?:trident\/[\w.]+)/i, id: 4 }, // Internet Explorer
  { regex: /fxios\/([-\w.]+)/i, id: 5 }, // Firefox for iOS
  { regex: /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w.]+);)/i, id: 6 }, // Facebook In-App Browser
  { regex: / wv\).+(chrome)\/([\w.]+)/i, id: 7 }, // Chrome WebView
  { regex: /droid.+ version\/([\w.]+)\b.+(?:mobile safari|safari)/i, id: 8 }, // Android Browser
  { regex: /(chrome|crios)(?:\/v?([\w.]+))?\b/i, id: 9 }, // Chrome
  { regex: /version\/([\w.,]+) .*mobile\/\w+ (safari)/i, id: 10 }, // Safari Mobile
  { regex: /version\/([\w.,]+) .*(mobile ?safari|safari)/i, id: 11 }, // Safari
  { regex: /(firefox)\/([\w.]+)/i, id: 12 } // Firefox
];

export const getBrowserType = () => {
  const brandName = getLowEntropySUA()?.browsers
    ?.map(b => b.brand.toLowerCase())
    .join(' ') || '';
  const browserMatch = brandName ? BROWSER_REGEX_MAP.find(({ regex }) => regex.test(brandName)) : -1;

  if (browserMatch?.id) return browserMatch.id.toString();

  const userAgent = navigator?.userAgent;
  let browserIndex = userAgent == null ? -1 : 0;

  if (userAgent) {
    browserIndex = BROWSER_REGEX_MAP.find(({ regex }) => regex.test(userAgent))?.id || 0;
  }
  return browserIndex.toString();
}

export const getCurrentTimeOfDay = () => {
  const currentHour = new Date().getHours();

  return currentHour < 5 ? CONSTANTS.TIME_OF_DAY_VALUES.NIGHT
    : currentHour < 12 ? CONSTANTS.TIME_OF_DAY_VALUES.MORNING
      : currentHour < 17 ? CONSTANTS.TIME_OF_DAY_VALUES.AFTERNOON
        : currentHour < 19 ? CONSTANTS.TIME_OF_DAY_VALUES.EVENING
          : CONSTANTS.TIME_OF_DAY_VALUES.NIGHT;
}

export const getUtmValue = () => {
  const url = new URL(window.location?.href);
  const urlParams = new URLSearchParams(url?.search);
  return urlParams && urlParams.toString().includes(CONSTANTS.UTM) ? CONSTANTS.UTM_VALUES.TRUE : CONSTANTS.UTM_VALUES.FALSE;
}

/**
 * Determines whether an action should be throttled based on a given percentage.
 *
 * @param {number} skipRate - The percentage rate at which throttling will be applied (0-100).
 * @param {number} maxRandomValue - The upper bound for generating a random number (default is 100).
 * @returns {boolean} - Returns true if the action should be throttled, false otherwise.
 */
export const shouldThrottle = (skipRate, maxRandomValue = 100) => {
  // Determine throttling based on the throttle rate and a random value
  const rate = skipRate ?? maxRandomValue;
  return Math.floor(Math.random() * maxRandomValue) < rate;
};

/**
 * Determines whether any specific target identity partner is present.
 *
 * @returns {boolean} - Returns true if conatins any specific identity partner, false otherwise.
 */
export const getHasId = (targetEids) => {
  const targetHasIds = targetEids.length ? targetEids : CONSTANTS.TARGET_HAS_IDS;
  const namespace = getGlobal();
  const publisherProvidedEids = namespace.getConfig("ortb2.user.eids") || [];
  const availableUserIds = namespace.adUnits[0]?.bids[0]?.userId || {};
  const identityModules = namespace.getConfig('userSync')?.userIds || [];
  const identityModuleNameMap = identityModules.reduce((mapping, module) => {
    if (module.storage?.name) {
      mapping[module.storage.name] = module.name;
    }
    return mapping;
  }, {});

  const userIdPartners = Object.keys(availableUserIds).map(storageName =>
    identityModuleNameMap[storageName] || storageName
  );

  const publisherProvidedEidList = publisherProvidedEids.map(eid =>
    identityModuleNameMap[eid.source] || eid.source
  );

  const identityPartners = Array.from(new Set([...userIdPartners, ...publisherProvidedEidList]));
  if (identityPartners.length === 0 || targetHasIds.length === 0) {
    return CONSTANTS.HAS_ID_VALUES.FALSE;
  }
  return targetHasIds.some(partner => identityPartners.includes(partner)) ? CONSTANTS.HAS_ID_VALUES.TRUE : CONSTANTS.HAS_ID_VALUES.FALSE;
}
