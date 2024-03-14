import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './custom.js';

export const customUtils = {};

submodule('openWrap', customUtils, "OW");
ready.then(function(){
  customUtils.owtInit();
  initializeModule(customUtils);
});


