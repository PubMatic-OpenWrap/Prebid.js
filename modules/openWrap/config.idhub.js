import * as config from './conf.js';
import * as CONSTANTS from './constants.js';
// let refThis = null;
// refThis = this;
// CONSTANTS.COMMON.OWVERSION = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.OWVERSION];
// CONSTANTS.COMMON.PBVERSION = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PBVERSION];

// needed
export function getGdpr() {
  const gdpr = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_CONSENT] || CONSTANTS.CONFIG.DEFAULT_GDPR_CONSENT;
  return gdpr === '1';
}

// needed
export function getCmpApi() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_CMPAPI] || CONSTANTS.CONFIG.DEFAULT_GDPR_CMPAPI;
}

// needed
export function getGdprTimeout() {
  const gdprTimeout = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_TIMEOUT];
  return gdprTimeout ? window.parseInt(gdprTimeout) : CONSTANTS.CONFIG.DEFAULT_GDPR_TIMEOUT;
}

// needed
export function getAwc() {
  const awc = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_AWC] || CONSTANTS.CONFIG.DEFAULT_GDPR_AWC;
  return awc === '1';
}

// needed
export function isUserIdModuleEnabled() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.ENABLE_USER_ID] || CONSTANTS.CONFIG.DEFAULT_USER_ID_MODULE);
}

// needed
export function getIdentityPartners() {
  return config[CONSTANTS.COMMON.IDENTITY_PARTNERS];
}

// needed
export function isIdentityOnly() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.IDENTITY_ONLY] || CONSTANTS.CONFIG.DEFAULT_IDENTITY_ONLY);
}

// needed
export function getIdentityConsumers() {
  return (config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.IDENTITY_CONSUMERS] || '').toLowerCase();
}

// needed
export function getCCPA() {
  const ccpa = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CCPA_CONSENT] || CONSTANTS.CONFIG.DEFAULT_CCPA_CONSENT;
  return ccpa === '1';
}

// needed
export function getCCPACmpApi() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CCPA_CMPAPI] || CONSTANTS.CONFIG.DEFAULT_CCPA_CMPAPI;
}

// needed
export function getCCPATimeout() {
  const ccpaTimeout = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CCPA_TIMEOUT];
  return ccpaTimeout ? window.parseInt(ccpaTimeout) : CONSTANTS.CONFIG.DEFAULT_CCPA_TIMEOUT;
}

export function getProfileID() {
  return config.pwt[CONSTANTS.CONFIG.PROFILE_ID] || '0';
}

export function getProfileDisplayVersionID() {
  return config.pwt[CONSTANTS.CONFIG.PROFILE_VERSION_ID] || '0';
}

export function isSSOEnabled() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.SSO_ENABLED]) === 1;
}

export function getPublisherId() {
  return config.pwt[CONSTANTS.CONFIG.PUBLISHER_ID] || '0';
}

export function isPubMaticIHAnalyticsEnabled() {
  const isEnabled = parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.ENABLE_PB_IH_ANALYTICS]);
  return isNaN(isEnabled) ? 1 : isEnabled;
}

export function getIHAnalyticsAdapterExpiry() {
  return parseInt(config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.IH_ANALYTICS_ADAPTER_EXPIRY]) || CONSTANTS.COMMON.IH_ANALYTICS_ADAPTER_DEFAULT_EXPIRY;
}

export const PBJS_NAMESPACE = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PBJS_NAMESPACE] || 'pbjs';

export function getOwVersion() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.OWVERSION];
}

export function getPrebidVersion() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.COMMON.PBVERSION];
}