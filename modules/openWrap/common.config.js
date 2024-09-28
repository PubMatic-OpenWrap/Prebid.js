// NOTE: This file will contains only common code/function used in OW and IDHUB.

import * as config from './conf.js';
import * as CONSTANTS from './constants.js';

export function getGdprActionTimeout() {
  const gdprActionTimeout = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_ACTION_TIMEOUT];
  return gdprActionTimeout ? window.parseInt(gdprActionTimeout) : 0;
}

export function setConsentConfig(prebidConfig, key, cmpApi, timeout) {
  prebidConfig = prebidConfig || {};
  if (!prebidConfig["consentManagement"]) {
    prebidConfig["consentManagement"] = {};
  }
  prebidConfig["consentManagement"][key] = {
    cmpApi: cmpApi,
    timeout: timeout
  };
  return prebidConfig;
}
