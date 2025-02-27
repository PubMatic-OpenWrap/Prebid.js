import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './gpt.js';
import { config } from '../../src/config.js';

export const gptUtils = {};

submodule('openWrap', gptUtils, "OW");
ready.then(function(){
  gptUtils.owtInit();
  config.getConfig("openWrap", () => initializeModule(gptUtils));
});




