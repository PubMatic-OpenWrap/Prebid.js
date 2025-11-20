/* eslint-disable prebid/validate-imports */
import * as commonUtil from '../common.util.js';
import * as timeMetrics from './timeMetrics.js';
import * as CONSTANTS from '../constants.js';
import * as COMMON_CONFIG from '../common.config.js';
import * as prebid from '../adapters/prebid.js';

// Constants for consent management
export const CONSENT_CONSTANTS = {
  DEFAULT_CMP_LOOK_UP_TIMEOUT: 1000,
  CONTINUOUS_CMP_CHECK_TIMEOUT: 15000,
  CONSENT_MANAGEMENT_SOURCE: {    // 1 -> CMP, 2 -> GEO, 0 -> NONE
    CMP: 1, 
    GEO: 2,
    NONE: 0
  },
  COMPLIANCE_MAP: {
    GDPR: 1,
    USP: 2,
    GPP: 3
  },
  READ_GEO_DATA_FROM: {          // 1 -> LOCALSTORAGE, 2 -> GEO_SERVICE, 0 -> NONE
    LOCALSTORAGE: 1,
    GEO_SERVICE: 2,
    NONE: 0
  }
}

// CMP APIs configuration
export const CMP_APIs = {
  GDPR: { apiName: "__tcfapi", complianceName: "gdpr", prepareConfig: configureGDPR, cmpCommandListner: handleGDPR },
  USP: { apiName: "__uspapi", complianceName: "usp", prepareConfig: configureUSP },
  GPP: { apiName: "__gpp", complianceName: "gpp", prepareConfig: configureGPP, cmpCommandListner: handleGPP }
};

// Initializes the consent management configuration object.
// ES6 refactor of ConsentResolverConfig

class ConsentResolverConfig {
  constructor() {
    this.reset();
  }

  reset = () => {
    this.config = {
      consentManagementEnabled: false,
      processCompleted: false,
      cmpPresent: false,
      complianceSupport: [],
      cmpId: 0,
      enforcedConsentBasisOn: CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.NONE,
      readGeoDataFrom: CONSENT_CONSTANTS.READ_GEO_DATA_FROM.NONE,
      geoInfo: {
        cc: undefined,
        sc: undefined,
        gc: undefined,
        gsId: undefined
      },
      geoMatchWithCMP: 2,
      prebidCMConfig: {},
      callbackFunctions: []
    };
  };

  getConsentManagementEnabled = () => this.config.consentManagementEnabled;

  getProcessCompleted = (callbackFn) => {
    if (this.config.processCompleted) {
      callbackFn();
      return;
    }
    if (commonUtil.isFunction(callbackFn)) {
      this.config.callbackFunctions.push(callbackFn);
    }
  };

  getComplianceSupport = () => this.config.complianceSupport;

  getPrebidCMConfig = () => this.config.prebidCMConfig;

  setConsentManagementEnabled = (consentManagementEnabled) => {
    this.config.consentManagementEnabled = consentManagementEnabled;
  };

  setCmpPresent = (cmpPresent) => {
    this.config.cmpPresent = !!cmpPresent;
  };

  setProcessCompleted = (processCompleted) => {
    this.config.processCompleted = processCompleted;
    if (processCompleted) {
      this.executeCallbackFunctions();
    }
  };

  executeCallbackFunctions = () => {
    while (this.config.callbackFunctions.length > 0) {
      const callbackFn = this.config.callbackFunctions.shift();
      if (callbackFn) callbackFn();
    }
  };

  setCmpId = (cmpId) => {
    this.config.cmpId = cmpId || 0;
  };

  setEnforcedConsentBasisOn = (enforcedConsentBasisOn) => {
    this.config.enforcedConsentBasisOn = enforcedConsentBasisOn;
  };

  setGeoMatchWithCMP = () => {
    if (this.config.geoInfo.gc && this.config.complianceSupport.length > 0) {
      this.config.geoMatchWithCMP = this.config.complianceSupport.includes(this.config.geoInfo.gc) ? 1 : 0;
    }
  };

  setGeoInfo = (readFrom, geoInfo) => {
    this.config.geoInfo = geoInfo;
    this.config.readGeoDataFrom = readFrom;
    this.setGeoMatchWithCMP();
  };

  setPrebidCMConfig = (key, conf) => {
    this.config.prebidCMConfig[key] = conf;
  };

  setComplianceSupport = (compliance) => {
    this.config.complianceSupport.push(compliance);
  };

  getProperties = () => ({
    ccme: this.config.consentManagementEnabled ? 1 : 0,
    ccmp: this.config.cmpPresent ? 1 : 0,
    ccmps: this.config.complianceSupport,
    ccmpid: this.config.cmpId,
    csc: this.config.geoInfo.sc,
    cecbo: this.config.enforcedConsentBasisOn,
    crgdf: this.config.readGeoDataFrom,
    cgm: this.config.geoMatchWithCMP
  });
}

// Singleton instance
let consentResolverConfigInstance;
export const getConsentResolverConfigInstance = () => {
  if (!consentResolverConfigInstance) {
    consentResolverConfigInstance = new ConsentResolverConfig();
  }
  return consentResolverConfigInstance;
};

const crConfig = getConsentResolverConfigInstance();

export function getConsentResolverConfig() {
  return crConfig.getProperties();
}
commonUtil.getGlobalOwObject().getConsentResolverConfig = getConsentResolverConfig;

/**
 * Set the time taken by CMP to load
 * @param {*} timeExceeded : If time exceeded then set the default timeout value
 */
export function setCMPTime(timeExceeded) {
  // If time taken by CMP is not set then set the default timeout value
  if (!timeMetrics.getDurationOf("CMP_CALLING_TIME")) {
    timeMetrics.recordExitTime("CMP_CALLING_TIME", timeExceeded ? 1500 : null);
  }
}

/**
 * Handle GDPR commands
 * @param {Object} pingReturnData - Data returned from the CMP
 * @param {boolean} success - Indicates if the command was successful
 */
export function handleGDPR(pingReturnData, success) {
  crConfig.setCmpId(pingReturnData && pingReturnData.cmpId);
}

/**
 * Handle GPP commands
 * @param {Object} pingReturnData - Data returned from the CMP
 * @param {boolean} success - Indicates if the command was successful
 */
export function handleGPP(pingReturnData, success) {
  crConfig.setCmpId(pingReturnData && pingReturnData.pingData && pingReturnData.pingData.cmpId);
}

/**
 * Get CMP API and timeout configuration
 * @returns {Object} - CMP API and timeout configuration
 */
export function getCmpApiAndTimeout() {
  return {
    cmpApi: COMMON_CONFIG.getCmpApi(CONSTANTS.CONFIG.CONSENT_MANAGEMENT_CMPAPI),
    timeout: COMMON_CONFIG.getTimeout(CONSTANTS.CONFIG.CONSENT_MANAGEMENT_TIMEOUT, 1000)
  }
}

/**
 * Configure GDPR settings
 */
export function configureGDPR() {
  const gdpr = {
    // allowAuctionWithoutConsent: COMMON_CONFIG.getAwc(), // Auction without consent IMP : Not required now
    defaultGdprScope: true
  };
  Object.assign(gdpr, getCmpApiAndTimeout());
  const gdprActionTimeout = commonUtil.getGlobalOwObject().actionTimeout || undefined;
  if (gdprActionTimeout && commonUtil.isNumber(gdprActionTimeout)) {
    gdpr.actionTimeout = gdprActionTimeout;
  }
  crConfig.setPrebidCMConfig("gdpr", gdpr);
}

/**
 * Configure USP settings
 */
export function configureUSP() {
  crConfig.setPrebidCMConfig("usp", getCmpApiAndTimeout());
}

/**
 * Configure GPP settings
 */
export function configureGPP() {
  crConfig.setPrebidCMConfig("gpp", getCmpApiAndTimeout());
}

/**
 * Get the CMPs present on the page
 * 
 * @returns Object : CMPs present on the page
 */
export function checkCMPsPresentOnPage() {
  let currentWindow = window;

  // Get the CMPs present on the page
  function checkCMPInWindow(frame) {
    for (const key in CMP_APIs) {
      if (CMP_APIs.hasOwnProperty(key)) {
        const cmpApi = CMP_APIs[key];
        if (isCMPApiPresent(cmpApi, frame)) {
          prepareCMPDataAndConfig(cmpApi, key, frame);
        }
      }
      //checkAndExecuteCMP(name, currentWindow);
    }
  }

  // Check if CMP APIs are present in the given frame
  function isCMPApiPresent(cmpApi, frame) {
    return typeof frame[cmpApi.apiName] === 'function' || frame.frames[cmpApi.apiName + "Locator"];
  }

  // Helper function to check for CMP presence and execute commands
  function prepareCMPDataAndConfig(cmpApi, key, frame) {    
    crConfig.setComplianceSupport(CONSENT_CONSTANTS.COMPLIANCE_MAP[key]);
    if (key === 'GDPR') {
      frame[cmpApi.apiName]('addEventListener', 2, cmpApi.cmpCommandListner);
    } else if (key === 'GPP') {
      frame[cmpApi.apiName]('addEventListener', cmpApi.cmpCommandListner);
    }
    crConfig.setCmpPresent(true);
    setCMPTime(false);
    cmpApi.prepareConfig();
  }

  // Iterate through window frames to find CMPs
  while (currentWindow) {  
    checkCMPInWindow(currentWindow);
    if (currentWindow === window.top) break;
    currentWindow = currentWindow.parent;
  }
}

/**
 * Get the geo information from the service
 */
export function getGeoInfoWrapper() {
  timeMetrics.recordEntryTime("GEO_CALLING_TIME", 1500); // Setting default timeout of 1500 ms in case service fails or didn't respond
  commonUtil.getGeoInfo(CONSENT_CONSTANTS.READ_GEO_DATA_FROM, function (readFrom, geoInfo) {
    crConfig.setGeoInfo(readFrom, geoInfo);
    timeMetrics.recordExitTime("GEO_CALLING_TIME");
  });
}

export function getCMPLookUpTimeout() {
  return (commonUtil.getGlobalOwObject() && commonUtil.isNumber(commonUtil.getGlobalOwObject().cmpLookUpTimeout))
    ? commonUtil.getGlobalOwObject().cmpLookUpTimeout
    : CONSENT_CONSTANTS.DEFAULT_CMP_LOOK_UP_TIMEOUT;
}

/**
 * Get the consent management configuration
 */
export function getConsentManagementConfig(callbackToSetConfig) {
  let isCallbackExecuted = false;
  let timeoutId;

  function executeCallback(enforcedConsentBasisOn) {
    if (!isCallbackExecuted) {
      clearTimeout(timeoutId);
      isCallbackExecuted = true;
      timeMetrics.recordExitTime("CONSENT_CONFIG_RESOLVER_TIME");
      callbackToSetConfig(crConfig.getPrebidCMConfig());
      crConfig.setEnforcedConsentBasisOn(enforcedConsentBasisOn);
      crConfig.setProcessCompleted(true);
    }
  }

  function proceedToFallbackExecution() {
    // console.log("Resolver: Proceeding to fallback execution");
    setCMPTime(true);           // Record CMP timing metrics

    const globalObj = commonUtil.getGlobalOwObject();
    if (!globalObj || !globalObj.CC || !globalObj.CC.gc) {
      // console.log("Resolver: No global object or CC configuration found");
      executeCallback(CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.NONE);
      return;
    }

    // Get compliance type based on geo location
    const compliance = commonUtil.getKeyByValue(CONSENT_CONSTANTS.COMPLIANCE_MAP, globalObj.CC.gc);
    if (compliance) {
      CMP_APIs[compliance].prepareConfig();                 // Configure consent based on geo location
      executeCallback(CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.GEO);
    } else {
      // console.log("Resolver: No gc configuration found");
      executeCallback(CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.NONE);
    }
  }

  function checkCmpRecursively() {
    if (isCallbackExecuted) {
      return;
    }
    checkCMPsPresentOnPage();
    if (crConfig.getComplianceSupport().length > 0) {
      // ("Resolver: CMP found");
      crConfig.setGeoMatchWithCMP();
      executeCallback(CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.CMP);
    } else {
      setTimeout(checkCmpRecursively, 50);
    }
  }

  // Not adding try-catch here, as if somthing goes wrong then we should stop the execution of PWT as its a current behaviour. 
  // Because setting config to prebid should not fail.
  // If we handle error and do not set consent config & proceed ahead, 
  // then we never able to find out the corner case and its not right even if something is failing in GDPR region & still we are processing for auction.
  // console.log("Resolver: Initializing configuration");
  timeMetrics.recordEntryTime("CONSENT_CONFIG_RESOLVER_TIME");

  if (!COMMON_CONFIG.getConsentManagementEnabled()) {
    executeCallback(CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.NONE);
    return;
  }

  crConfig.setConsentManagementEnabled(true);
  getGeoInfoWrapper();
  timeoutId = setTimeout(proceedToFallbackExecution, getCMPLookUpTimeout()); //timeout for checking CMP presence
  checkCmpRecursively();
}
