import { hook, getHook, submodule, wrapHook, ready } from '../../src/hook.js';

export const customUtils = {};

submodule('openWrap', customUtils);
ready.then(function(){
  customUtils.owtInit();
  start(customutils.Config);
  customUtils.customInit(window);
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

