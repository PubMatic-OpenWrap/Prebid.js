import * as config from './conf.js';
import * as CONSTANTS from './constants.js';

export function getGdprActionTimeout() {
  const gdprActionTimeout = config[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_ACTION_TIMEOUT];
  return gdprActionTimeout ? window.parseInt(gdprActionTimeout) : 0;
}
