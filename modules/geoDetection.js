import { logInfo, logError } from './../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getCoreStorageManager } from '../src/storageManager.js';
import { getGlobal } from '../src/prebidGlobal.js';

/*
    GeoDetection module is to be used to get the region information.
    This needs to be called with the URL of API and path of region (e.g. location.data.region)
*/
getGlobal().detectLocation = function(URL, passBack) {
  const getRegion = function(loc) {
    try {
      let location = JSON.parse(loc);
      passBack(location, true);
    } catch (e) {
      logInfo('Location data is expected to be an object');
      passBack({error: e}, false);
    }
  }

  try {
    ajaxBuilder()(
      URL,
      { success: getRegion, error: function(e) { passBack({error: e}, false) } },
      null,
      { contentType: 'application/x-www-form-urlencoded', method: 'GET' }
    );
  } catch (e) {
    passBack({error: e}, false);
  }
}
// Previously this module is being registed as moduleType:bidder and moduleName: pubmatic, this is not correct as it was checking pubmatic bidder has permission to read/write in localstorage.
// Now this module is being registered as moduleType:prebid and moduleName: geoDetection
var storage = getCoreStorageManager('geoDetection');

getGlobal().getDataFromLocalStorage = function(key, expiry) {
  try {
    var storedObject = storage.getDataFromLocalStorage(key);
    if (storedObject) {
      var createdDate = JSON.parse(storedObject).createdDate;
      let currentDate = new Date().valueOf();
      const diff = Math.abs(currentDate - createdDate);
      if (diff > expiry) {
        storage.removeDataFromLocalStorage(key);
        return undefined;
      }
      return storedObject;
    }
    return undefined;
  } catch (e) {
    return undefined;
  }
}

getGlobal().setAndStringifyToLocalStorage = function(key, object) {
  try {
    object.createdDate = new Date().valueOf();
    storage.setDataInLocalStorage(key, JSON.stringify(object));
  } catch (e) {
    logError('Error in setting localstorage ', e);
  }
}
