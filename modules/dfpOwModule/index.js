import { hook, getHook, submodule, wrapHook, ready } from '../../src/hook.js';
import { initializeModule } from './gpt.js';

export const gptUtils = {};

submodule('openWrap', gptUtils);
ready.then(function(){
  gptUtils.owtInit();
  initializeModule(gptUtils);
});

// function initSubModule(){
//   submodule('openWrap', gptUtils);
//   ready.then(function(){
//     gptUtils.owtInit();
//     gptUtils.gptInit(window);
//   });
// }

// let hooked = hook("async", initSubModule);

// hooked();

