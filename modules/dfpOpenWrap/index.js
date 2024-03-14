import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './gpt.js';

export const gptUtils = {};

submodule('openWrap', gptUtils, "OW");
ready.then(function(){
  gptUtils.owtInit();
  initializeModule(gptUtils);
});




