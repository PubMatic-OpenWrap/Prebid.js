import * as config from './conf.js';
import * as CONSTANTS from './constants.js';
import * as util from './util.js';

// let refThis = null;
// refThis = this;
// CONSTANTS.COMMON.OWVERSION = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.OWVERSION];
// CONSTANTS.COMMON.PBVERSION = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PBVERSION];

export function getPublisherId() {
  return util.trim(config.pwt.pubid) || '0';
}

export function getSendAllBidsStatus() {
  return window.parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.SEND_ALL_BIDS]) || 0;
}

export function getTransactionIdStatus() {
  return window.parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.TRANSACTION_ID]) || 0;
}

export function getTimeout() {
  return window.parseInt(config.pwt.t) || 1000;
}

export function getDisableAjaxTimeout() {
  const pwt = config.pwt;
  if (util.isOwnProperty(pwt, CONSTANTS.CONFIG.DISABLE_AJAX_TIMEOUT)) {
    return config.pwt.disableAjaxTimeout == true;
  }
  return true;
}

export function getAdapterRevShare(adapterID) {
  const adapterConfig = config.adapters;
  if (util.isOwnProperty(adapterConfig[adapterID], CONSTANTS.CONFIG.REV_SHARE)) {
    return (1 - window.parseFloat(adapterConfig[adapterID][CONSTANTS.CONFIG.REV_SHARE]) / 100);
  }
  return 1;
}

export function getAdapterThrottle(adapterID) {
  const adapterConfig = config.adapters;
  if (util.isOwnProperty(adapterConfig[adapterID], CONSTANTS.CONFIG.THROTTLE)) {
    return 100 - window.parseFloat(adapterConfig[adapterID][CONSTANTS.CONFIG.THROTTLE]);
  }
  return 0;
}

export function isServerSideAdapter(adapterID) {
  const adapterConfig = config.adapters;
  /* istanbul ignore else */
  if (adapterConfig[adapterID] && util.isOwnProperty(adapterConfig[adapterID], CONSTANTS.CONFIG.SERVER_SIDE_ENABLED)) {
    return window.parseInt(adapterConfig[adapterID][CONSTANTS.CONFIG.SERVER_SIDE_ENABLED]) === 1;
  }
  return false;
}

// TODO: do we need this feature?
export function getBidPassThroughStatus(adapterID) {
  const adapterConfig = config.adapters;
  if (util.isOwnProperty(adapterConfig[adapterID], CONSTANTS.CONFIG.BID_PASS_THROUGH)) {
    return window.parseInt(adapterConfig[adapterID][CONSTANTS.CONFIG.BID_PASS_THROUGH]);
  }
  return 0;
}

export function getProfileID() {
  return util.trim(config.pwt[CONSTANTS.CONFIG.PROFILE_ID]) || '0';
}

export function getProfileDisplayVersionID() {
  return util.trim(config.pwt[CONSTANTS.CONFIG.PROFILE_VERSION_ID]) || '0';
}

export function forEachAdapter(callback) {
  util.forEachOnObject(config.adapters, callback);
}

function addPrebidAdapter() {
  const preBidAdapter = CONSTANTS.COMMON.PARENT_ADAPTER_PREBID;
  if (!util.isOwnProperty(config.adapters, preBidAdapter)) {
    const adapterConfig = {};
    adapterConfig[CONSTANTS.CONFIG.REV_SHARE] = '0.0';
    adapterConfig[CONSTANTS.CONFIG.THROTTLE] = '100';
    adapterConfig[CONSTANTS.CONFIG.KEY_GENERATION_PATTERN] = '_DIV_';
    adapterConfig[CONSTANTS.CONFIG.KEY_LOOKUP_MAP] = {};
    config.adapters[preBidAdapter] = adapterConfig;
  }
}

export function getGdpr() {
  const gdpr = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_CONSENT] || CONSTANTS.CONFIG.DEFAULT_GDPR_CONSENT;
  return gdpr === '1';
}

export function getCmpApi() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_CMPAPI] || CONSTANTS.CONFIG.DEFAULT_GDPR_CMPAPI;
}

export function getGdprTimeout() {
  const gdprTimeout = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_TIMEOUT];
  return gdprTimeout ? window.parseInt(gdprTimeout) : CONSTANTS.CONFIG.DEFAULT_GDPR_TIMEOUT;
}

export function getAwc() {
  const awc = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_AWC] || CONSTANTS.CONFIG.DEFAULT_GDPR_AWC;
  return awc === '1';
}

export function getOverrideNamespace(configKey, defaultName, returnValueInCaseMissingNamespace) {
  const pbNamespace = config[CONSTANTS.CONFIG.COMMON][configKey];
  if (pbNamespace) {
    return pbNamespace === defaultName ? returnValueInCaseMissingNamespace : pbNamespace;
  } else {
    return returnValueInCaseMissingNamespace;
  }
}

/* start-test-block */
export {addPrebidAdapter};

/* end-test-block */

export function initConfig() {
  updateABTestConfig();
  addPrebidAdapter();

  const ignoreAdapterLevelParams = {};
  util.forEachOnObject(CONSTANTS.CONFIG, (key, value) => {
    ignoreAdapterLevelParams[value] = '';
  });

  util.forEachOnObject(config.adapters, (adapterID, adapterConfig) => {
    const adapterLevelParams = {};
    util.forEachOnObject(adapterConfig, (key, value) => {
      if (!util.isOwnProperty(ignoreAdapterLevelParams, key)) {
        adapterLevelParams[key] = value;
      }
    });
    util.forEachOnObject(adapterConfig[CONSTANTS.CONFIG.KEY_LOOKUP_MAP], (kgpv, slotLevelParams) => {
      util.forEachOnObject(adapterLevelParams, (key, value) => {
        slotLevelParams[key] = value;
      });
    });

    if (adapterID != 'pubmatic' && adapterID != 'pubmatic2') {
      util.forEachOnObject(adapterConfig[CONSTANTS.CONFIG.REGEX_KEY_LOOKUP_MAP], (kgpv, slotLevelParams) => {
        util.forEachOnObject(adapterLevelParams, (key, value) => {
          if (util.isOwnProperty(slotLevelParams, 'rx_config')) {
            slotLevelParams['rx_config'][key] = value;
          }
        });
      });
    }
  });
}

/* Native Configuration */

export function getNativeConfiguration() {
  return config[CONSTANTS.COMMON.NATIVE_MEDIA_TYPE_CONFIG];
}

export function getAdServerCurrency() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.AD_SERVER_CURRENCY];
}

export function isSingleImpressionSettingEnabled() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.SINGLE_IMPRESSION] || CONSTANTS.CONFIG.DEFAULT_SINGLE_IMPRESSION);
}

export function isUserIdModuleEnabled() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.ENABLE_USER_ID] || CONSTANTS.CONFIG.DEFAULT_USER_ID_MODULE);
}

export function getIdentityPartners() {
  return config[CONSTANTS.COMMON.IDENTITY_PARTNERS];
}

export function isIdentityOnly() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.IDENTITY_ONLY] || CONSTANTS.CONFIG.DEFAULT_IDENTITY_ONLY);
}

export function getIdentityConsumers() {
  return (config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.IDENTITY_CONSUMERS] || '').toLowerCase();
}

export function getSlotConfiguration() {
  return config[CONSTANTS.COMMON.SLOT_CONFIG];
}

export function getAdServer() {
  return config[CONSTANTS.COMMON.ADSERVER];
}

export function getCCPA() {
  const ccpa = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CCPA_CONSENT] || CONSTANTS.CONFIG.DEFAULT_CCPA_CONSENT;
  return ccpa === '1';
}

export function getCCPACmpApi() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CCPA_CMPAPI] || CONSTANTS.CONFIG.DEFAULT_CCPA_CMPAPI;
}

export function getCCPATimeout() {
  const ccpaTimeout = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CCPA_TIMEOUT];
  return ccpaTimeout ? window.parseInt(ccpaTimeout) : CONSTANTS.CONFIG.DEFAULT_CCPA_TIMEOUT;
}

export function getSchainObject() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.SCHAINOBJECT] || null;
}

export function isSchainEnabled() {
  return window.parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.SCHAIN]) || 0;
}

export function isFloorPriceModuleEnabled() {
  return window.parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.FLOOR_PRICE_MODULE_ENABLED]) === 1;
}

export function getFloorSource() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.FLOOR_SOURCE];
}

export function getFloorJsonUrl() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.FLOOR_JSON_URL];
}

// It will return the auctionDelay specified in conf.js or else default is 100
export function getFloorAuctionDelay() {
  const auctionDelay = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.FLOOR_AUCTION_DELAY];
  return auctionDelay ? window.parseInt(auctionDelay) : CONSTANTS.CONFIG.DEFAULT_FLOOR_AUCTION_DELAY;
}

// It will return the floorType specified in conf.js or else default is true
export function getFloorType() {
  return !!(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.FLOOR_ENFORCE_JS] && (config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.FLOOR_ENFORCE_JS]).toLowerCase() === CONSTANTS.COMMON.HARD_FLOOR);
}

export function isPrebidPubMaticAnalyticsEnabled() {
  // note: not using window.parseInt as this function is also used in build.sh that runs in NodeJS environment
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.ENABLE_PB_PM_ANALYTICS]) === 1;
}

export function isUsePrebidKeysEnabled() {
  // note: not using window.parseInt as this function is also used in build.sh that runs in NodeJS environment
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.USE_PREBID_KEYS]) === 1;
}

export function getPBJSNamespace() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PBJS_NAMESPACE] || 'pbjs';
}

export function getPriceGranularity() {
  const priceGranularity = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PRICE_GRANULARITY] || null;

  if (priceGranularity === CONSTANTS.COMMON.PRICE_GRANULARITY_CUSTOM) {
    const bucketsValue = getPriceGranularityBuckets();
    if (bucketsValue !== null) {
      return bucketsValue;
    } else {
      util.logWarning(CONSTANTS.MESSAGES.M36);
      return null;
    }
  } else {
    return priceGranularity;
  }
}

export function getPriceGranularityBuckets() {
  let pgBuckets = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PRICE_GRANULARITY_BUCKETS] || null;
  if (pgBuckets === null) { return null; }

  // API would be providing us with ranges as keyword, we need to raplace it by buckets before processing
  let transformedBuckets = {};
  delete Object.assign(transformedBuckets, pgBuckets, { 'buckets': pgBuckets['ranges'] })['ranges'];

  return transformedBuckets;
}

export function isBidPoolingEnabled() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.BID_POOLING_ENABLED]) === 1;
};

export function getGranularityMultiplier() {
  return parseFloat(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.GRANULARITY_MULTIPLIER]) || 1;
}

export function isAbTestEnabled() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.AB_TEST_ENABLED]) === 1;
}

export function getTestPWTConfig() {
  return config[CONSTANTS.COMMON.TEST_PWT] || {};
}

export function getTestGroupDetails() {
  return config[CONSTANTS.COMMON.TEST_GROUP_DETAILS] || {};
}

export function getTestPartnerConfig() {
  return config[CONSTANTS.COMMON.TEST_PARTNER] || {};
}

export function getTestIdentityPartners() {
  return config[CONSTANTS.COMMON.TEST_IDENTITY_PARTNER] || {};
}

export function updateABTestConfig() {
  if (isAbTestEnabled()) {
    const randomNumberBelow100 = util.getRandomNumberBelow100();
    const testGroupDetails = getTestGroupDetails();
    // if Random number is smaller than the test group size then test config will be applied
    if (testGroupDetails && testGroupDetails.testGroupSize && randomNumberBelow100 < testGroupDetails.testGroupSize) {
      updatePWTConfig();
      config.adapters = updatePartnerConfig(getTestPartnerConfig(), config.adapters);
      enableBidpoolingIfApplicable(testGroupDetails);
      if (getTestIdentityPartners() && getIdentityPartners()) {
        if (Object.keys(getTestIdentityPartners()).length > 0 && Object.keys(getIdentityPartners()).length == 0) {
          util.log(CONSTANTS.MESSAGES.M31, JSON.stringify(getTestIdentityPartners()));
          config.identityPartners = getTestIdentityPartners();
        } else if (Object.keys(getTestIdentityPartners()).length == 0 && Object.keys(getIdentityPartners()).length > 0) {
          util.log(CONSTANTS.MESSAGES.M31, JSON.stringify({}));
          config.identityPartners = {};
        } else {
          config.identityPartners = updatePartnerConfig(getTestIdentityPartners(), getIdentityPartners());
        }
      }
      window.PWT.testGroupId = 1;
    }
  }
}

export function enableBidpoolingIfApplicable(testGroupDetails) {
  testGroupDetails.testType == CONSTANTS.COMMON.BID_POOLING &&
    (config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.BID_POOLING_ENABLED] = CONSTANTS.COMMON.ENABLED_BID_POOLING);
}

export function updatePWTConfig() {
  const testConfig = getTestPWTConfig();
  if (testConfig && Object.keys(testConfig).length > 0) {
    util.log(CONSTANTS.MESSAGES.M30, JSON.stringify(testConfig));
    for (const key in testConfig) {
      if (config[CONSTANTS.CONFIG.COMMON][key]) {
        config[CONSTANTS.CONFIG.COMMON][key] = testConfig[key];
      }
    }
    // TODO: Uncomment Below code after updating phatomjs or using chrome headless
    // Object.assign(config[CONSTANTS.CONFIG.COMMON], testConfig);
  }
}

export function updatePartnerConfig(testConfig, controlConfig) {
  if (testConfig && controlConfig && Object.keys(testConfig).length > 0 && Object.keys(controlConfig).length > 0) {
    util.log(CONSTANTS.MESSAGES.M31, JSON.stringify(testConfig));
    for (const key in testConfig) {
      if (util.isOwnProperty(testConfig, key) && util.isObject(testConfig[key])) {
        if (Object.keys(testConfig[key]).length == 0 && controlConfig[key] && Object.keys(controlConfig[key]).length > 0) {
          testConfig[key] = controlConfig[key];
        } else if (Object.keys(testConfig[key]).length > 0 && controlConfig[key] && Object.keys(controlConfig[key]).length > 0) {
          testConfig[key] = getMergedConfig(testConfig[key], controlConfig[key]);
        }
      }
    }
    window.PWT.testGroupId = 1;
    return testConfig;
  } else {
    // since only one test type can be enabled other type of test config will be empty if other test config is enabled and hence return control config
    return controlConfig;
  }
}

// This will keep toObject config as is and only merge objects common in both from and toobject
export function getMergedConfig(toObject, fromObject) {
  for (const key in fromObject) {
    if (!Object.prototype.hasOwnProperty.call(toObject, key)) {
      if (util.isObject(fromObject[key]) || util.isArray(fromObject[key])) {
        toObject[key] = JSON.parse(JSON.stringify(fromObject[key]));
      } else {
        toObject[key] = fromObject[key];
      }
    }
  }
  return toObject;
}

export function forEachBidderAlias(callback) {
  util.forEachOnObject(config.alias, callback);
}

export function getAdapterNameForAlias(aliasName) {
  if (config.alias && config.alias[aliasName]) {
    return config.alias[aliasName] && config.alias[aliasName].name ? config.alias[aliasName].name : config.alias[aliasName];
  }
  return aliasName;
}

export function isSSOEnabled() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.SSO_ENABLED]) === 1;
}

export function getServerEnabledAdaptars() {
  const s2sBidders = Object.keys(config.adapters).filter(adapter => {
    if (config.adapters[adapter]['serverSideEnabled'] == '1') {
      return adapter;
    }
  });
  return s2sBidders;
}

export function getTimeoutForPBSRequest() {
  const ssTimeOut = parseInt(config.pwt.ssTimeout);
  const maxTimeout = CONSTANTS.TIMEOUT_CONFIG.MaxTimeout;
  const minTimeout = CONSTANTS.TIMEOUT_CONFIG.MinTimeout;
  if (ssTimeOut >= minTimeout && ssTimeOut <= maxTimeout) {
    return ssTimeOut;
  } else if (ssTimeOut >= minTimeout) {
    return maxTimeout;
  }
  return minTimeout;
}

export function getPubMaticAndAlias(s2sBidders) {
  const pubMaticaliases = s2sBidders.filter(adapter => {
    if ((config.alias && config.alias[adapter] && (config.alias[adapter].name ? config.alias[adapter].name.includes('pubmatic') : config.alias[adapter].includes('pubmatic'))) || adapter.includes('pubmatic')) {
      return adapter;
    }
  });
  return pubMaticaliases;
}

export function usePBSAdapter() {
  if (config.pwt.usePBSAdapter == '1') {
    return true;
  }
  return false;
}

export function createMacros() {
  return {
    '[PLATFORM]': util.getDevicePlatform().toString(),
    '[PROFILE_ID]': getProfileID().toString(),
    '[PROFILE_VERSION]': getProfileDisplayVersionID().toString()
  }
}

export function getMarketplaceBidders() {
  return config.pwt.marketplaceBidders ? config.pwt.marketplaceBidders.split(',') : false;
}

export function getOWVersion() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.OWVERSION];
}

export function getPrebidVersion() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PBVERSION];
}

export function getGppConsent() {
  const gpp = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GPP_CONSENT] || CONSTANTS.CONFIG.DEFAULT_GPP_CONSENT;
  return gpp === '1';
}

export function getGppCmpApi() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GPP_CMPAPI] || CONSTANTS.CONFIG.DEFAULT_GPP_CMPAPI;
}

export function getGppTimeout() {
  const gppTimeout = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GPP_TIMEOUT];
  return gppTimeout ? window.parseInt(gppTimeout) : CONSTANTS.CONFIG.DEFAULT_GPP_TIMEOUT;
}

export function shouldClearTargeting() {
  return window.PWT.shouldClearTargeting !== undefined ? Boolean(window.PWT.shouldClearTargeting) : true;
};

// Utility function to retrieve configuration valuesMore actions
export function getConfigValue(property, defaultValue, parseAsInteger) {
  parseAsInteger = (typeof parseAsInteger === 'undefined') ? true : parseAsInteger; // Default to true if not supplied
  const configValue = config[CONSTANTS.CONFIG.COMMON] && config[CONSTANTS.CONFIG.COMMON][property];
  
  if (configValue !== undefined) {
      return parseAsInteger ? parseInt(configValue, 10) : parseFloat(configValue);
  }

  const pwtValue = PWT && PWT.LazyLoading && PWT.LazyLoading[property];
  if (pwtValue !== undefined) {
      return parseAsInteger ? parseInt(pwtValue, 10) : parseFloat(pwtValue);
  }

  return parseAsInteger ? parseInt(defaultValue, 10) : parseFloat(defaultValue);
}

export function isAuctionLazyLoadingEnabled() {
  return getConfigValue(CONSTANTS.CONFIG.AUCTION_LAZY_LOADING_ENABLED, CONSTANTS.COMMON.DEFAULT_AUCTION_LAZY_LOADING_ENABLED) === 1;
};

export function getAuctionMarginPercentage() {
	return getConfigValue(CONSTANTS.CONFIG.AUCTION_MARGIN_PERCENTAGE, CONSTANTS.COMMON.DEFAULT_AUCTION_MARGIN_PERCENTAGE);
};

export function isGamLazyLoadingEnabled() {
  return getConfigValue(CONSTANTS.CONFIG.GAM_LAZY_LOADING_ENABLED, CONSTANTS.COMMON.DEFAULT_GAM_LAZY_LOADING_ENABLED) === 1;
};

export function getFetchMarginPercentage() {
	return getConfigValue(CONSTANTS.CONFIG.FETCH_MARGIN_PERCENTAGE, CONSTANTS.COMMON.DEFAULT_FETCH_MARGIN_PERCENTAGE);
};

export function getRenderMarginPercentage() {
	return getConfigValue(CONSTANTS.CONFIG.RENDER_MARGIN_PERCENTAGE, CONSTANTS.COMMON.DEFAULT_RENDER_MARGIN_PERCENTAGE);
};

export function getMobileScalingForLazyLoading() {
	return getConfigValue(CONSTANTS.CONFIG.MOBILE_SCALING_FOR_LAZY_LOADING, CONSTANTS.COMMON.DEFAULT_MOBILE_SCALING_FOR_LAZY_LOADING, false);
};

export function isSRAEnabled() {
  return window.googletag && window.googletag.pubads && window.googletag.pubads().isSRA() || false;
};
