import * as commonUtil from "../common.util.js";
import * as util from "../util.js";
import * as timeMetrics from "./timeMetrics.js";

const CMP_CHECK_TIMEOUT = 1500;
const CONSENT_MANAGEMENT_SOURCE = {
  CMP: "CMP",
  GEO: "GEO",
  NONE: "NONE"
};
const COMPLIANCE_MAP = {
  GDPR: 1,
  USP: 2,
  GPP: 3
};
const READ_GEO_DATA_FROM = {
  LOCALSTORAGE: "LS",
  GEO_SERVICE: "GS",
  NONE: "NONE"
};
const CMP_APIs = {
  GDPR: { apiName: "__tcfapi", complianceName: "gdpr", cmpCommandListner: gdprHandler },
  USP: { apiName: "__uspapi", complianceName: "usp" },
  GPP: { apiName: "__gpp", complianceName: "gpp", cmpCommandListner: gppHandler }
};
/**
 * Get the consent management configuration object
 * @returns Object : Consent management configuration object ie. window.PWT.cmConfig
 */
export function getCMConfigObject() {
  const globalObj = commonUtil.getGlobalOwObject();
  globalObj.cmConfig = globalObj.cmConfig || {};
  return globalObj.cmConfig;
}
/**
 * Initializes the consent management configuration object.
 */
function initializeCMConfig(allStatsAvailable, cmpPresent = 0, complianceSupport = [], cmpId = 0) {
  const cmConf = {
    allStatsAvailable,
    cmpPresent,
    complianceSupport,
    cmpId,
    geoInfo: {
      cc: undefined,
      sc: undefined,
    }
  };
  commonUtil.getGlobalOwObject().cmConfig = { ...getCMConfigObject(), ...cmConf };
}
/**
 * Set the time taken by CMP to load
 * @param {*} timeExceeded : If time exceeded then set the default timeout value
 */
function setCMPTime(timeExceeded) {
  const globalObj = commonUtil.getGlobalOwObject();
  if (!globalObj.getDurationOf("CMP_CALLING_TIME")) {
    timeExceeded
      ? timeMetrics.recordExitTime("CMP_CALLING_TIME", CMP_CHECK_TIMEOUT)
      : timeMetrics.recordExitTime("CMP_CALLING_TIME");
  }
}
function gdprHandler(pingReturnData) {
  if (pingReturnData && pingReturnData.cmpId) {
    getCMConfigObject().cmpId = pingReturnData.cmpId;
  }
}
function gppHandler(pingReturnData) {
  if (pingReturnData?.pingData?.cmpId) {
    getCMConfigObject().cmpId = pingReturnData.pingData.cmpId;
  }
}
/**
 * Get the CMPs present on the page
 * 
 * @returns Object : CMPs present on the page
 */
function getCMPsPresentOnPage() {
  const cmps = {};
  let currentWindow = window;
  const cmConfig = getCMConfigObject();
  const checkAndExecuteCMP = (name, frame) => {
    const cmpApi = CMP_APIs[name];
    const apiExists = typeof frame[cmpApi.apiName] === 'function' || frame.frames[cmpApi.apiName + "Locator"];
    if (apiExists) {
      cmConfig.cmpPresent = 1;
      setCMPTime(false);
      cmConfig.complianceSupport.push(COMPLIANCE_MAP[name]);
      if (name === 'GDPR') {
        frame[cmpApi.apiName]('addEventListener', 2, cmpApi.cmpCommandListner);
      } else if (name === 'GPP') {
        frame[cmpApi.apiName]('addEventListener', cmpApi.cmpCommandListner);
      }
    }
  };
  while (currentWindow) {
    try {
      for (const name in CMP_APIs) {
        checkAndExecuteCMP(name, currentWindow);
      }
    } catch (e) {}
    if (currentWindow === window.top) break;
    currentWindow = currentWindow.parent;
  }
  return cmps;
}
/**
 * Get the geo information from the service
 */
export function getGeoInfoWrapper() {
  timeMetrics.recordEntryTime("GEO_CALLING_TIME", 1500);
  commonUtil.getGeoInfo(READ_GEO_DATA_FROM, (readFrom, uInfo) => {
    timeMetrics.recordExitTime("GEO_CALLING_TIME");
    const cmConfig = getCMConfigObject();
    cmConfig.geoInfo.cc = uInfo.cc;
    cmConfig.geoInfo.sc = uInfo.sc;
  });
}
/**
 * Get the consent management configuration
 */
export function getConsentManagementConfig() {
  initializeCMConfig(true);
  getGeoInfoWrapper();
  let cmpTimeoutReached = false;
  let timeoutId;
  const handleCMPCheckTimeout = () => {
    cmpTimeoutReached = true;
    clearTimeout(timeoutId);
    setCMPTime(true);
  };
  timeoutId = setTimeout(handleCMPCheckTimeout, CMP_CHECK_TIMEOUT);
  const checkCmpRecursively = () => {
    try {
      if (cmpTimeoutReached) return;
      getCMPsPresentOnPage();
      if (getCMConfigObject().complianceSupport.length > 0) {
        clearTimeout(timeoutId);
      } else {
        setTimeout(checkCmpRecursively, 50);
      }
    } catch (error) {
      clearTimeout(timeoutId);
    }
  };
  checkCmpRecursively();
}
/**
 * Initialize the consent management configuration
 */
export function init() {
  initializeCMConfig(false);
  const globalObj = commonUtil.getGlobalOwObject();
  let allowTrafficRate = globalObj.allowTrafficRate;
  allowTrafficRate = util.isNumber(allowTrafficRate) ? allowTrafficRate : 5;
  if (!commonUtil.shouldThrottle(allowTrafficRate)) {
    getConsentManagementConfig();
  } else {
    getGeoInfoWrapper();
  }
}