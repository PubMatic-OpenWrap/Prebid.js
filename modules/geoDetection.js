import { ajax } from '../src/ajax.js';
import { deepAccess } from '../src/utils.js';

var defaultGDURL = 'https://www.ebay.com/defaultLocation.json'; //TODO update this
var defaultPath = 'location.region'; //TODO update this

/*
    GeoDetection module is to be used to get the region information.
    This needs to be called with the URL of API and path of region (e.g. location.data.region)
*/
$$PREBID_GLOBAL$$.detectLocation = function(URL = defaultGDURL, regionPath = defaultPath, callback) {
    getRegion = function(loc) {
        try {
            let location = JSON.parse(loc);
            if(location.error) {
                callback(location);
            } else {
                callback({region: deepAccess(location, regionPath)});
            }
        } catch(e) {
            console.log("Location data is expected to be an object");
            callback({error: e});
        }
    }

    try {
        ajax(
            URL,
            getRegion,
            null,
            { contentType: 'application/x-www-form-urlencoded', method: 'GET' }
        );
    } catch(e) {
        callback({error: e});
    }
}
