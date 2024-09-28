import { submodule, ready } from '../../src/hook.js';
import { initializeModule } from './idhub.js';
import { config } from '../../src/config.js';

export const idhubUtils = {};

submodule('openWrap', idhubUtils, "IDHUB");
ready.then(function(){
  idhubUtils.idhubInit();
  config.getConfig("openWrap", () => initializeModule(idhubUtils));
});
