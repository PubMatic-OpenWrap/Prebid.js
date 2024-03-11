import { hook, getHook, submodule, wrapHook, ready } from '../../src/hook.js';

export const idhubUtils = {};

submodule('openWrap', idhubUtils);
ready.then(function(){
  idhubUtils.owtInit();
  idhubUtils.idhubInit(window);
});
