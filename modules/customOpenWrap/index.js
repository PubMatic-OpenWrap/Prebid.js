import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './custom.js';
import { config } from '../../src/config.js';

export const customUtils = {};

submodule('openWrap', customUtils, "OW");
ready.then(function(){
  customUtils.owtInit();
  config.getConfig("openWrap", () => initializeModule(customUtils));
});


