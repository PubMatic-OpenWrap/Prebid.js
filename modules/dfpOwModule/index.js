import { hook, getHook, submodule, wrapHook, ready } from '../../src/hook.js';

export const gptUtils = {};

submodule('openWrap', gptUtils);
ready.then(function(){
  gptUtils.owtInit();
  gptUtils.gptInit(window);
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

