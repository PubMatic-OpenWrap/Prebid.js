import { ajaxBuilder } from '../src/ajax.js';

const TIMEOUT = 500;

/*
    GeoDetection module is to be used to get the region information.
    This needs to be called with the URL of API and path of region (e.g. location.data.region)
*/
$$PREBID_GLOBAL$$.detectLocation = function(URL, callback) {
    getRegion = function(loc) {
        try {
            let location = JSON.parse(loc);
            callback(location);
        } catch(e) {
            console.log("Location data is expected to be an object");
            callback({error: e});
        }
    }

    try {
        ajaxBuilder(TIMEOUT)(
            URL,
            { success: getRegion, error: function(e) {callback({error: e})} },
            null,
            { contentType: 'application/x-www-form-urlencoded', method: 'GET' }
        );
    } catch(e) {
        callback({error: e});
    }
}
