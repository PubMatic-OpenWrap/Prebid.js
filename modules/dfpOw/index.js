import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './gpt.js';

export const gptUtils = {};
export const idhubUtils = {};

submodule('openWrap', gptUtils, "OW");
ready.then(function(){
  gptUtils.owtInit();
  initializeModule(gptUtils);
});




