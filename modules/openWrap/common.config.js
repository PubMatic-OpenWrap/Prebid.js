// NOTE: This file will contains only common code/function used in OW and IDHUB.

import * as config from './conf.js';
import * as CONSTANTS from './constants.js';

export function getConsentManagementEnabled() {
  return config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_ENABLED] === "1";
}

export function getCmpApi(cmpApi) {
  return config[CONSTANTS.CONFIG.COMMON][cmpApi] || "iab";
}

export function getTimeout(timeoutField, defaultTimeout) {
  const timeout = config[CONSTANTS.CONFIG.COMMON][timeoutField];
  return timeout ? window.parseInt(timeout) : defaultTimeout;
}