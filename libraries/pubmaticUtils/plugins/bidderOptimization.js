// plugins/bidderOptimization.js
import { getBrowserType, getCurrentTimeOfDay, getHasId } from '../pubmaticUtils.js';
import { logInfo, logError, deepClone, logWarn, parseUrl, generateUUID, isPlainObject, isArray, isNumber } from '../../../src/utils.js';
import { getRefererInfo } from '../../../src/refererDetection.js';
import { auctionManager } from '../../../src/auctionManager.js';
import { config as conf } from '../../../src/config.js';

const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Bidder-Optimization: '
});

let _configJsonManager = null;
export const getConfigJsonManager = () => _configJsonManager;
export const setConfigJsonManager = (configJsonManager) => { _configJsonManager = configJsonManager; }

let selectedbidderOptimisationModel = null;
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
    setBidderOptimisationConfig(config?.data);
    targetHasIds = config?.data?.userIds;
    if (selectedbidderOptimisationModel) {
      logInfo(`${CONSTANTS.LOG_PRE_FIX}: Model version selected: ${selectedbidderOptimisationModel.modelVersion}`);
    } else {
      logError(`${CONSTANTS.LOG_PRE_FIX} Rejected due to schema validation errors`);
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
  if (selectedbidderOptimisationModel) {
    try {
      const decision = getBidderDecision({
        auctionId: reqBidsConfigObj?.auctionId,
        browser: getBrowserType(),
        hasId: getHasId(targetHasIds),
        reqBidsConfigObj
      });

      // Apply bidder decisions
      if (decision) {
        if (decision.excludedBiddersByAdUnit) {
          for (const [adUnitCode, bidderList] of Object.entries(decision.excludedBiddersByAdUnit)) {
            filterBidders(bidderList, reqBidsConfigObj, adUnitCode);
          }
        }

        if (decision.clientSequence) {
          sequenceBidders(reqBidsConfigObj, decision.clientSequence);
        }
        logInfo(`${CONSTANTS.LOG_PRE_FIX} Applied bidder optimization decisions`);
      }

      return reqBidsConfigObj;
    } catch (error) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error in bidder optimization: ${error}`);
      return reqBidsConfigObj;
    }
  }
  return reqBidsConfigObj;
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

/**
 * Reorders the bids array in each adUnit according to the clientSequence in the decision object.
 * @param {Object} reqBidsConfigObj - The bid request configuration object
 * @param {Object} clientSequence - The decision object containing clientSequence info
 */
export const sequenceBidders = (reqBidsConfigObj, clientSequence) => {
  // use from utils
  if (!reqBidsConfigObj || !isArray(reqBidsConfigObj.adUnits) || !isArray(clientSequence)) return;

  reqBidsConfigObj.adUnits.forEach(adUnit => {
    if (isArray(adUnit.bids)) {
      // Bids in clientSequence order
      const prioritized = clientSequence
        .map(bidderName => adUnit.bids.find(bid => bid.bidder === bidderName))
        .filter(bid => !!bid);
      // Bids NOT in clientSequence, keep original order
      const remaining = adUnit.bids.filter(bid => !clientSequence.includes(bid.bidder));
      adUnit.bids = [...prioritized, ...remaining];
    }
  });
  conf.setConfig({bidderSequence: 'fixed'});
};

// Field matching functions for each schema field
const fieldMatchingFunctions = {
  domain: (context) => context.domain || getHostname(),
  mediaType: (context) => context.mediaType || deriveMediaType(context.bidRequest, context.bidResponse),
  browser: (context) => context.browser || '*',
  country: (context) => context.country || getConfigJsonManager()?.country || '*',
  timeOfDay: (context) => context.timeOfDay || getCurrentTimeOfDay() || '*',
  hasId: (context) => (context.hasId !== undefined ? context.hasId : getHasId(targetHasIds)),
  adUnitCode: (context) => context.adUnitCode || '*'
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

// Cache: auctionId => prepared optimisation data (lower-cased maps etc.)
const _auctionDataCache = {};

function pickRandomModel(modelGroups) {
  const valid = modelGroups.filter(m => isNumber(m.modelWeight) && m.modelWeight > 0);
  const weightSum = valid.reduce((s, m) => s + m.modelWeight, 0);
  if (!weightSum) return valid[0] || modelGroups[0];
  let random = Math.floor(Math.random() * weightSum) + 1;
  for (let m of valid) {
    random -= m.modelWeight;
    if (random <= 0) return m;
  }
  return valid[0] || modelGroups[0];
}

function validateSchema(schema) {
  const allowed = new Set(['domain', 'mediaType', 'browser', 'country', 'timeOfDay', 'hasId', 'adUnitCode']); // schema filed name - mediaTypes - check PRD
  if (!schema || !Array.isArray(schema.auctionKeyFields) || !Array.isArray(schema.adUnitKeyFields)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} schema missing keyFields arrays`);
    return false;
  }
  const validAuction = schema.auctionKeyFields.every(f => allowed.has(f));
  const validAdUnit = schema.adUnitKeyFields.every(f => allowed.has(f));

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

export function setBidderOptimisationConfig(bidderOptimisationSchema) {
  if (!bidderOptimisationSchema || !isPlainObject(bidderOptimisationSchema)) {
    logWarn(`${CONSTANTS.LOG_PRE_FIX}: invalid schema supplied`, bidderOptimisationSchema); // logWarn
    return;
  }
  // Handle multiple models with weights
  let selectedModel = bidderOptimisationSchema;
  if (isArray(bidderOptimisationSchema.modelGroups) && bidderOptimisationSchema.modelGroups.length) {
    selectedModel = pickRandomModel(bidderOptimisationSchema.modelGroups); // extract common functions from priceFloors in UTILS
  }                                                                        // Our bidder Optimisation schema can change when ML will start
  // inherit top-level skipRate if defined
  if (isNumber(bidderOptimisationSchema.skipRate) && selectedModel.skipRate == null) {
    selectedModel.skipRate = bidderOptimisationSchema.skipRate;
  }
  if (!validateSchema(selectedModel.schema)) {
    selectedbidderOptimisationModel = null;
    return;
  }
  selectedbidderOptimisationModel = normaliseConfig(selectedModel);
}

function deriveAuctionId(context) {
  return context.auctionId || context.bidRequest?.auctionId || auctionManager.getLastAuctionId() || generateUUID();
}

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
  // Auto-fill context fields
  if (!context.domain) {
    context.domain = getHostname(); // extract common functions from priceFloors in UTILS
  }
  if (!context.mediaType) {
    context.mediaType = deriveMediaType(context.bidRequest, context.bidResponse);
  }
  if (!selectedbidderOptimisationModel) {
    logWarn(`${CONSTANTS.LOG_PRE_FIX}: getBidderDecision called before config is set`);
    return fallbackDecision();
  }

  // Random skip handling – same semantics as priceFloors
  if (shouldSkip(selectedbidderOptimisationModel.skipRate)) {
    return { skipped: true };
  }

  // Pull / build auction-level prepared data once per auction
  const auctionId = deriveAuctionId(context);
  if (!_auctionDataCache[auctionId]) {
    _auctionDataCache[auctionId] = buildPreparedData(selectedbidderOptimisationModel);
  }
  const selectedData = _auctionDataCache[auctionId];

  // If multiple adUnits, build decision map per adUnit for excluded bidders
  const adUnitsArr = context.reqBidsConfigObj?.adUnits || [];
  let excludedByAdUnit;
  if (Array.isArray(adUnitsArr) && adUnitsArr.length) {
    excludedByAdUnit = {};
    adUnitsArr.forEach(au => {
      const adUnitContext = {
        ...context,
        adUnitCode: au.code,
        mediaType: deriveMediaTypeFromAdUnit(au)
      };
      const rule = getFirstMatchingValue(selectedData.adUnitOverrides, selectedbidderOptimisationModel.schema.adUnitKeyFields, adUnitContext, selectedbidderOptimisationModel.schema.delimiter);
      excludedByAdUnit[au.code] = rule?.excludedBidders ?? selectedbidderOptimisationModel.default.excludedBidders;
    });
  }

  const auctionRule = getFirstMatchingValue(
    selectedData.auctionValues,
    selectedbidderOptimisationModel.schema.auctionKeyFields,
    context,
    selectedbidderOptimisationModel.schema.delimiter
  );

  return {
    clientBidders: auctionRule?.clientBidders ?? selectedbidderOptimisationModel.default.clientBidders,
    serverBidders: auctionRule?.serverBidders ?? selectedbidderOptimisationModel.default.serverBidders,
    clientSequence: auctionRule?.clientSequence ?? selectedbidderOptimisationModel.default.clientSequence,
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
function normaliseConfig(bidderOptimisationSchema) {
  const copy = deepClone(bidderOptimisationSchema);
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

function buildPreparedData(bidderOptimisationSchema) {
  // For now just expose the lower-cased maps; more pre-processing could happen here later.
  return {
    auctionValues: bidderOptimisationSchema.auctionValues,
    adUnitOverrides: bidderOptimisationSchema.adUnitOverrides
  };
}

/**
 * Generates all key permutations (exact-to-wildcard) and returns the first hit.
 */
function getFirstMatchingValue(valuesMap, keyFieldOrder, context, delim) {
  if (!valuesMap || !keyFieldOrder?.length) return undefined;
  const fieldValues = enumeratePossibleFieldValues(keyFieldOrder, context);
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
