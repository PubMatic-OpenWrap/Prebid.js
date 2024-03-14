import { submodule, ready, module } from '../../src/hook.js';
import { initializeModule } from './idhub.js';
import * as IdHub from './idhub.js';
import { isPlainObject, logError } from '../../src/utils.js';

// const idHubSharedMethods = {
//   "IdHub": IdHub
// };
// Object.freeze(idHubSharedMethods);

// export const idhubUtils = {};
// //submodule('openWrap', idhubUtils);
// ready.then(function(){
//   // module('idhubOW', function shareIdhubUtilities(...args) {
//   //   if (!isPlainObject(args[0])) {
//   //     logError('IDHUB OW module needs plain object to share methods with submodule');
//   //     return;
//   //   }
//   //   function addMethods(object, func) {
//   //     for (let name in func) {
//   //       object[name] = func[name];
//   //     }
//   //   }
//   //   addMethods(args[0], idHubSharedMethods);
//   // });

//   idhubUtils.OW.owtInit();
//   IdHub.initializeModule(idhubUtils);
// });

// IdHub.init();
//IdHubIndex.init(window);
export const idhubUtils = {};

submodule('openWrap', idhubUtils, "IDHUB");
ready.then(function(){
  idhubUtils.idhubInit();
  initializeModule(idhubUtils);
});

// const idHubSharedMethods = {
//   "IdHub": IdHub
// };
// Object.freeze(idHubSharedMethods);
// module('zidhubOW', function shareIdhubUtilities(...args) {
//   if (!isPlainObject(args[0])) {
//     logError('IDHUB OW module needs plain object to share methods with submodule');
//     return;
//   }
//   function addMethods(object, func) {
//     for (let name in func) {
//       object[name] = func[name];
//     }
//   }
//   addMethods(args[0], idHubSharedMethods);
// });
