// plugins/bidderOptimization.js
import { getBrowserType } from '../pubmaticUtils.js';
import { logInfo, logError, deepClone, logWarn, parseUrl, generateUUID, parseGPTSingleSizeArray } from '../../../src/utils.js';
import { getRefererInfo } from '../../../src/refererDetection.js';
import { auctionManager } from '../../../src/auctionManager.js';
import { getCurrentTimeOfDay, getHasId } from '../pubmaticUtils.js';

const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Bidder-Optimization: '
});

let _configJsonManager = null;
export const getConfigJsonManager = () => _configJsonManager;
export const setConfigJsonManager = (configJsonManager) => { _configJsonManager = configJsonManager; }

// The normalised config supplied via pubmaticRtdProvider
let _optConfig = null;
let targetHasIds = [];

/**
 * Initialize the bidder optimization plugin
 * @param {Object} pluginName - Plugin name
 * @param {Object} configJsonManager - Configuration JSON manager object
 * @returns {Promise<boolean>} - Promise resolving to initialization status
 */
export async function init(pluginName, configJsonManager) {
  // Process bidder optimization configuration
  const config = configJsonManager.getConfigByName(pluginName);
  if (!config) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Bidder optimization configuration not found`);
    return false;
  }

  if (!config?.enabled) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Bidder optimization configuration is disabled`);
    return false;
  }
setConfigJsonManager(configJsonManager);
  try {
    setBidderOptimisationConfig(config.data);
    targetHasIds = config.data.userIds;
    if (_optConfig) {
      logInfo(`${CONSTANTS.LOG_PRE_FIX}: setBidderOptimisationConfig config Decision loaded - version %s`, _optConfig.modelVersion);
    } else {
      logError(`${CONSTANTS.LOG_PRE_FIX} Bidder optimization configuration rejected due to schema validation errors`);
    }
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error setting bidder optimization config: ${error}`);
  }

  return true;
}

/**
 * Process bid request
 * @param {Object} reqBidsConfigObj - Bid request config object
 * @returns {Object} - Updated bid request config object
 */
export function processBidRequest(reqBidsConfigObj) {
  if(_optConfig){
    try {
      const decision = getBidderDecision({
        auctionId: reqBidsConfigObj?.auctionId,
        browser: getBrowserType(),
        hasId: getHasId(targetHasIds),
        reqBidsConfigObj
      });
  
      // Apply bidder decisions
      if (decision && decision.excludedBiddersByAdUnit) {
        for (const [adUnitCode, bidderList] of Object.entries(decision.excludedBiddersByAdUnit)) {
          filterBidders(bidderList, reqBidsConfigObj, adUnitCode);
        }
        logInfo(`${CONSTANTS.LOG_PRE_FIX} Applied bidder optimization decisions`);
      }
  
      return reqBidsConfigObj;
    } catch (error) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error in bidder optimization: ${error}`);
      return reqBidsConfigObj;
    }
  }
}

/**
 * Get targeting data
 * @param {Array} adUnitCodes - Ad unit codes
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 * @param {Object} auction - Auction object
 * @returns {Object} - Targeting data
 */
export function getTargeting(adUnitCodes, config, userConsent, auction) {
  // Implementation for targeting data, if not applied then do nothing
}

// Export the bidder optimization functions
export const BidderOptimization = {
  init,
  processBidRequest,
  getTargeting
};

/// Helper Functions

/**
 * Filter out specified bidders from adUnits with matching code
 * @param {Array} bidderList - List of bidder names to be filtered out
 * @param {Object} reqBidsConfigObj - The bid request configuration object
 * @param {string} adUnitCode - The code of the adUnit to filter bidders from
 */
export const filterBidders = (bidderList, reqBidsConfigObj, adUnitCode) => {
  // Validate inputs
  if (!bidderList || !Array.isArray(bidderList) || bidderList.length === 0 ||
      !reqBidsConfigObj || !reqBidsConfigObj.adUnits || !Array.isArray(reqBidsConfigObj.adUnits)) {
    return;
  }
  // Find the adUnit with the matching code
  const adUnit = reqBidsConfigObj.adUnits.find(unit => unit.code === adUnitCode);

  // If adUnit exists and has bids array, filter out the specified bidders
  if (adUnit && adUnit.bids && Array.isArray(adUnit.bids)) {
    adUnit.bids = adUnit.bids.filter(bid => !bidderList.includes(bid.bidder));
  }
};

/* PriceFloors-style helpers for auto-derivation */

// Field matching functions for each schema field
const fieldMatchingFunctions = {
  domain: (ctx) => ctx.domain || getHostname(),
  mediaType: (ctx) => ctx.mediaType || deriveMediaType(ctx.bidRequest, ctx.bidResponse),
  browser: (ctx) => ctx.browser || '*',
  country: (ctx) => ctx.country || getConfigJsonManager()?.country || '*',
  timeOfDay: (ctx) => ctx.timeOfDay || getCurrentTimeOfDay() || '*',
  hasId: (ctx) => (ctx.hasId !== undefined ? ctx.hasId : getHasId(targetHasIds)),
  //size: (ctx) => ctx.size || deriveSize(ctx) || '*',
  adUnitCode: (ctx) => ctx.adUnitCode || '*'
};

function enumeratePossibleFieldValues(keyFields = [], context) {
  if (!keyFields.length) return [];
  return keyFields.reduce((accum, field) => {
    let exact = fieldMatchingFunctions[field] ? fieldMatchingFunctions[field](context) : '*';
    exact = exact == null ? '*' : String(exact);
    accum.push(exact === '*' ? ['*'] : [exact.toLowerCase(), '*']);
    return accum;
  }, []);
}
const getHostname = (() => {
  let domain;
  return function() {
    if (domain == null) {
      domain = parseUrl(getRefererInfo().topmostLocation, { noDecodeWholeURL: true }).hostname;
    }
    return domain;
  };
})();

/* -------------------------------------------------------------------------- */
/*                       Internal, mutable module state                       */
/* -------------------------------------------------------------------------- */

// Cache: auctionId => prepared optimisation data (lower-cased maps etc.)
const _auctionDataCache = {};

/* -------------------------------------------------------------------------- */
/*                                Public API                                  */
/* -------------------------------------------------------------------------- */

/**
 * Injects the optimisation schema coming from pubmaticRtdProvider.
 * A shallow validation + normalisation (lower-casing keys) is performed.
 *
 * @param {Object} cfg The JSON using the two-map schema of “Approach A”.
 */
function pickRandomModel(modelGroups) {
  const valid = modelGroups.filter(m => typeof m.modelWeight === 'number' && m.modelWeight > 0);
  const weightSum = valid.reduce((s, m) => s + m.modelWeight, 0);
  if (!weightSum) return valid[0] || modelGroups[0];
  let rnd = Math.floor(Math.random() * weightSum) + 1;
  for (let m of valid) {
    rnd -= m.modelWeight;
    if (rnd <= 0) return m;
  }
  return valid[0] || modelGroups[0];
}

function validateSchema(schema) {
  const allowed = new Set(['domain','mediaType','browser','country','timeOfDay','hasId','adUnitCode']);
  if (!schema || !Array.isArray(schema.auctionKeyFields) || !Array.isArray(schema.adUnitKeyFields)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} schema missing keyFields arrays`);
    return false;
  }
  const validAuction = schema.auctionKeyFields.every(f => allowed.has(f));
  const validAdUnit  = schema.adUnitKeyFields.every(f => allowed.has(f));
  if (!validAuction || !validAdUnit) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Fields received do not match allowed fields`);
    return false;
  }
  // ensure adUnitKeyFields extends auctionKeyFields and contains adUnitCode
  if (!schema.adUnitKeyFields.includes('adUnitCode')) {
    logError(`${CONSTANTS.LOG_PRE_FIX} adUnitKeyFields must include adUnitCode`);
    return false;
  }
  return true;
}

export function setBidderOptimisationConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    logError(`${CONSTANTS.LOG_PRE_FIX}: invalid config supplied`, cfg);
    return;
  }
  // Handle multiple models with weights
  let modelCfg = cfg;
  if (Array.isArray(cfg.modelGroups) && cfg.modelGroups.length) {
    modelCfg = pickRandomModel(cfg.modelGroups);
  }
  // inherit top-level skipRate if present
  if (cfg.skipRate != null && modelCfg.skipRate == null) {
    modelCfg.skipRate = cfg.skipRate;
  }
  if (!validateSchema(modelCfg.schema)) {
    return;
  }
  _optConfig = normaliseConfig(modelCfg);
}

function deriveAuctionId(ctx) {
  return ctx.auctionId || ctx.bidRequest?.auctionId || auctionManager.getLastAuctionId() || generateUUID();
}

// function deriveSize(ctx) {
//   // size from bidResponse if present
//   const br = ctx.bidResponse;
//   if (br?.size) {
//     return parseGPTSingleSizeArray(br.size) || '*';
//   }
//   // from current adUnit banner sizes
//   const au = ctx.currentAdUnit;
//   const bannerSizes = au?.mediaTypes?.banner?.sizes || au?.sizes || [];
//   if (Array.isArray(bannerSizes) && bannerSizes.length) {
//     const first = Array.isArray(bannerSizes[0]) ? bannerSizes[0] : bannerSizes;
//     return parseGPTSingleSizeArray(first) || '*';
//   }
//   return '*';
// }

function deriveMediaType(bidRequest, bidResponse) {
  if (bidResponse?.mediaType) return bidResponse.mediaType;
  const mediaTypes = Object.keys(bidRequest?.mediaTypes || {});
  return mediaTypes.length === 1 ? mediaTypes[0] : 'banner';
}

/**
 * Derive mediaType from adUnit definition
 */
function deriveMediaTypeFromAdUnit(adUnit) {
  const keys = Object.keys(adUnit?.mediaTypes || {});
  return keys.length === 1 ? keys[0] : 'banner';
}

export function getBidderDecision(context = {}) {
  // Auto-fill context fields if caller omitted them
  if (!context.domain) {
    context.domain = getHostname();
  }
  if (!context.mediaType) {
    context.mediaType = deriveMediaType(context.bidRequest, context.bidResponse);
  }
  if (!_optConfig) {
    logWarn(`${CONSTANTS.LOG_PRE_FIX}: getBidderDecision called before config is set`);
    return fallbackDecision();
  }

  // Random skip handling – same semantics as priceFloors
  if (shouldSkip(_optConfig.skipRate)) {
    return { skipped: true };
  }

  // Pull / build auction-level prepared data once per auction
  const auctionId = deriveAuctionId(context);
  if (!_auctionDataCache[auctionId]) {
    _auctionDataCache[auctionId] = buildPreparedData(_optConfig);
  }
  const prep = _auctionDataCache[auctionId];

  // If multiple adUnits, build decision map per adUnit for excluded bidders
  const adUnitsArr = context.reqBidsConfigObj?.adUnits || [];
  let excludedByAdUnit = undefined;
  if (Array.isArray(adUnitsArr) && adUnitsArr.length) {
    excludedByAdUnit = {};
    adUnitsArr.forEach(au => {
      const auCtx = {
        ...context,
        adUnitCode: au.code,
        mediaType: deriveMediaTypeFromAdUnit(au)
      };
      const rule = getFirstMatchingValue(prep.adUnitOverrides, _optConfig.schema.adUnitKeyFields, auCtx, _optConfig.schema.delimiter);
      excludedByAdUnit[au.code] = rule?.excludedBidders ?? _optConfig.default.excludedBidders;
    });
  }

  const auctionRule = getFirstMatchingValue(
    prep.auctionValues,
    _optConfig.schema.auctionKeyFields,
    context,
    _optConfig.schema.delimiter
  );

  // 2) ad-unit overrides (excludedBidders only)
  // const adUnitRuleSingle = getFirstMatchingValue(
  //   prep.adUnitOverrides,
  //   _optConfig.schema.adUnitKeyFields,
  //   context,
  //   _optConfig.schema.delimiter
  // );

  return {
    clientBidders: auctionRule?.clientBidders ?? _optConfig.default.clientBidders,
    serverBidders: auctionRule?.serverBidders ?? _optConfig.default.serverBidders,
    clientSequence: auctionRule?.clientSequence ?? _optConfig.default.clientSequence,
    skipped: false,
    excludedBiddersByAdUnit: excludedByAdUnit
  };
}

/* -------------------------------------------------------------------------- */
/*                               Helper logic                                 */
/* -------------------------------------------------------------------------- */

function fallbackDecision() {
  return { excludedBidders: [], clientBidders: ['*'], serverBidders: [], clientSequence: [], skipped: true };
}

function shouldSkip(skipRate = 0) {
  const rate = parseInt(skipRate, 10);
  return rate > 0 && Math.random() * 100 < rate;
}

/** Lower-cases all rule keys so lookups are case-insensitive */
function normaliseConfig(cfg) {
  const copy = deepClone(cfg);
  const lowerCaseKeys = (obj) =>
    Object.keys(obj || {}).reduce((acc, k) => {
      acc[k.toLowerCase()] = obj[k];
      return acc;
    }, {});
  copy.auctionValues = lowerCaseKeys(copy.auctionValues);
  copy.adUnitOverrides = lowerCaseKeys(copy.adUnitOverrides);
  copy.schema.delimiter = copy.schema.delimiter || '|';
  return copy;
}

function buildPreparedData(cfg) {
  // For now just expose the lower-cased maps; more pre-processing could happen here later.
  return {
    auctionValues: cfg.auctionValues,
    adUnitOverrides: cfg.adUnitOverrides
  };
}

/**
 * Generates all key permutations (exact-to-wildcard) and returns the first hit.
 */
function getFirstMatchingValue(valuesMap, keyFieldOrder, ctx, delim) {
  if (!valuesMap || !keyFieldOrder?.length) return undefined;
  const fieldValues = enumeratePossibleFieldValues(keyFieldOrder, ctx);
  if (!fieldValues.length) return undefined;
  const possibleKeys = generatePossibleEnumerations(fieldValues, delim);
  for (let k of possibleKeys) {
    if (valuesMap.hasOwnProperty(k)) {
      return valuesMap[k];
    }
  }
  return undefined;
}

function generatePossibleEnumerations(arrayOfFields, delimiter) {
  return arrayOfFields
    .reduce((accum, currentVal) => {
      const res = [];
      accum.forEach((base) => {
        currentVal.forEach((val) => {
          res.push(base ? base + delimiter + val : val);
        });
      });
      return res;
    }, [''])
    .filter(Boolean)
    .sort((a, b) => a.split('*').length - b.split('*').length);
}
