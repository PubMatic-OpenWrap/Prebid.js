import { config } from '../../src/config.js';
import { logError } from '../../src/utils.js';

export let pwt = {};
export let testConfigDetails = {};
export let test_pwt = {};
export let adapters = {};
export let identityPartners = {};
export let slotConfig = {};

function setOWConfig(owConfig) {
  if (!owConfig || typeof owConfig !== 'object') {
    logError('OpenWrap config not defined...');
    return;
  }
  pwt = owConfig.pwt;
  testConfigDetails = owConfig.testConfigDetails;
  test_pwt = owConfig.test_pwt;
  adapters = owConfig.adapters;
  identityPartners = owConfig.identityPartners;
  slotConfig = owConfig.slotConfig;
};

config.getConfig('openWrap', config => setOWConfig(config.openWrap));

//export { pwt, testConfigDetails, test_pwt, adapters, identityPartners, slotConfig };
