import { config } from '../../src/config.js';
import { logError } from '../../src/utils.js';

export let pwt = {};
export let testConfigDetails = {};
export let test_pwt = {};
export let adapters = {};
export let identityPartners = {};
export let slotConfig = {};
export let alias = {};
export let test_adapters = {};
export let test_identityPartners = {};

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
  alias = owConfig.alias;
  test_adapters = owConfig.test_adapters;
  test_identityPartners = owConfig.test_identityPartners;
};

config.getConfig('openWrap', config => setOWConfig(config.openWrap));
