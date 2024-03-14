import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './idhub.js';

export const idhubUtils = {};

submodule('openWrap', idhubUtils, "IDHUB");
ready.then(function(){
  idhubUtils.idhubInit();
  initializeModule(idhubUtils);
});
