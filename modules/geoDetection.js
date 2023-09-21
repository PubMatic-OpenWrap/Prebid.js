import { logInfo, logError } from './../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { getGlobal } from '../src/prebidGlobal.js';

const TIMEOUT = 500;

/*
    GeoDetection module is to be used to get the region information.
    This needs to be called with the URL of API and path of region (e.g. location.data.region)
*/
getGlobal().detectLocation = function(URL, passBack) {
  const getRegion = function(loc) {
    try {
      let location = JSON.parse(loc);
      passBack(location);
    } catch (e) {
      logInfo('Location data is expected to be an object');
      passBack({error: e});
    }
  }

  try {
    ajaxBuilder(TIMEOUT)(
      URL,
      { success: getRegion, error: function(e) { passBack({error: e}) } },
      null,
      { contentType: 'application/x-www-form-urlencoded', method: 'GET' }
    );
  } catch (e) {
    passBack({error: e});
  }
}

var BIDDER_CODE = 'pubmatic';
var storage = getStorageManager({bidderCode: BIDDER_CODE});

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
