import { module } from "../../src/hook";
import * as CONSTANTS from './constants.js';
import { isPlainObject, logError } from '../../src/utils.js';

import * as owt from './owt.js';
import * as CONFIG from './config.js';
import * as util from './util.js';
import * as bidManager from './bidManager.js';
import * as SLOT from './slot.js';
import * as prebid from './adapters/prebid.js';

import * as CONFIG_IDHUB from './config.idhub.js';
import * as util_idhub from './util.idhub.js';
import * as COMMON_CONFIG from './common.config.js';
import * as idhubInit from './idhub.js';


const sharedMethods  = {
  "OW": {
    "owtInit": owt.init,
    "CONFIG": CONFIG,
    "CONSTANTS": CONSTANTS,
    "util": util,
    "bidManager": bidManager,
    "SLOT": SLOT,
    "prebid": prebid
  },
  "IDHUB": {
    "idhubInit": idhubInit.init,
    "CONFIG": CONFIG_IDHUB,
    "CONSTANTS": CONSTANTS,
    "util": util_idhub,
    "COMMON_CONFIG": COMMON_CONFIG
  }
};
Object.freeze(sharedMethods);

module('openWrap', function shareOwUtilities(...args) {
  if (!isPlainObject(args[0])) {
    logError('OW module needs plain object to share methods with submodule');
    return;
  }
  function addMethods(object, func) {
    let methods = func[args[1]];
    for (let name in methods) {
      object[name] = methods[name];
    }
  }
  addMethods(args[0], sharedMethods);
});
