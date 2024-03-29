import { getGlobal } from '../../src/prebidGlobal.js';

export let pwt = {};
export let testConfigDetails = {};
export let test_pwt = {};
export let adapters = {};
export let identityPartners = {};
export let slotConfig = {};

getGlobal().setOwConfig = function (config) {
  pwt = config.pwt;
  testConfigDetails = config.testConfigDetails;
  test_pwt = config.test_pwt;
  adapters = config.adapters;
  identityPartners = config.identityPartners;
  slotConfig = config.slotConfig;
};

//export { pwt, testConfigDetails, test_pwt, adapters, identityPartners, slotConfig };
