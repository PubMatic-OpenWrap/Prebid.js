import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './gpt.js';

export const gptUtils = {};
export const idhubUtils = {};

submodule('openWrap', gptUtils);
ready.then(function(){
  submodule('zidhubOw', idhubUtils);
  ready.then(function(){
    gptUtils.OW.owtInit();
    initializeModule(gptUtils, idhubUtils);
  });
});




