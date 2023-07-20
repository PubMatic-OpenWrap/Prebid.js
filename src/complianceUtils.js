import { _each } from '../src/utils.js';
const GDPR_REGIONS = [
    'AT', 'BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','EU','GB','UK'
];

export const configurationMap = {
    'criteoBidAdapter': {
      gvlid: 91,
      url: '/bidder.criteo.com/cdb',
      type: 'bidder'
    },
    'pubmaticBidAdapter': {
      gvlid: 76,
      url: "translator",
      type: 'bidder'
    },
    'hadronIdSystem': {
      gvlid: 561, 
      url: 'id.hadron.ad.gt',
      type: 'idh'
    },
    'id5IdSystem': {
      gvlid: 131, 
      url: 'id5-sync.com',
      type: 'idh'
    },
    'lotamePanoramaIdSystem': {
      gvlid: 95,
      url: 'id.crwdcntrl.net',
      type: 'idh'
    }
  };

  const COMPLIANCE_VIOLATIONS = {
    1: "UserId Module not called when vendor consent for module was denied.",
    2: "Bid adapters not called when vendor consent for module was denied.",
    3: "User sync not initiated when purpose 1 consent was denied.",
    4: "UserId not synced when purpose 1 consent was denied.",
    5: "Auction not initiated when purpose 2 consent was denied.",
    6: "CMP returned gdprApplies true for GDPR enabled region.",
    7: "gdpr flag passed to user_sync.html call.",
    8: "gdpr consent string passed to user_sync.html call.",
    9: "CCPA consent string passed to user_sync.html call."
}

const COMPLIANCE_MISCONFIGS = {
    1: "GDPR timeout value is in recommended range (~10000)",
    2: "GDPR Action timeout is set.", 
    3: "GDPR is enabled for GDPR applicable region.",
    4: "CCPA is enabled for CCPA applicable region.",
    5: "Distinct namespaces used for all wrappers on page.",
    6: "Prebid version is v7.39 or higher.",
    7: "Both GDPR and CCPA are not enabled in a single profile."
    /*8: "GDPR configuration disabled for non-GDPR region.",
    9: "CCPA configuration disabled for non-CCPA region."*/
}

function isVersionSmaller(version1, version2) {
    const parseVersion = (version) => version.slice(1).split('.').map(Number);

    const [major1, minor1, patch1] = parseVersion(version1);
    const [major2, minor2, patch2] = parseVersion(version2);

    if (major1 < major2) return true;
    if (major1 > major2) return false;

    if (minor1 < minor2) return true;
    if (minor1 > minor2) return false;

    return patch1 < patch2;
}

function getQuerystring(url, key) {
    var query = url.substring(1);
    let errors = [];
    let found = false;
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == key) {
            if(pair[i] !== undefined || pair[i].length > 0) {
                found = true;
            }
        }
    }
    return found;
}

export function validateConsentData(dataObj) {
    var errors = {
        'violations': [],
        'misconfigs': []
    };
    console.log("Compliance logger call - identifyViolations **** ", dataObj['gdprA'], " *** ",dataObj['loc']);
  
    if (!dataObj['gdprA'] && GDPR_REGIONS.indexOf(dataObj['loc']) >= 0 ) {
        errors['violations'].push({'errorCode': 6, 'meta': ''});
    }
    let networkEntries = window.performance.getEntries();
    let userSyncUrl = "";
    let idhViolations = [];
    let bidderViolations = [];
    for(let i in networkEntries) {
        if (networkEntries[i].initiatorType === 'xmlhttprequest') {;
        // check if installed modules have been blocked, but calls are still triggered. if that is the case, add it to xhrCalls array
            _each(configurationMap, function(obj, key) {
                if (networkEntries[i].name.indexOf(obj.url) > 0) { // call for a configured id module/partner is detected
                    if (dataObj['vc'][obj.gvlid] === false) {
                        if (obj.type === 'idh') {
                            //errors['violations'].push({'errorCode': 1, 'meta': key});
                            idhViolations.push(key);
                        } else {
                            //errors['violations'].push({'errorCode': 2, 'meta': key});
                            bidderViolations.push(key);
                        }
                    } else if (dataObj['pc']['1'] === false) {
                        errors['violations'].push({'errorCode': 4, 'meta': ''});
                    } else if (dataObj['pc']['2'] === false) {
                        errors['violations'].push({'errorCode': 5, 'meta': ''});
                    }
                }
                if (networkEntries[i].name.indexOf("user_sync.html") >= 0) {
                    errors['violations'].push({'errorCode': 3, 'meta': ''});
                }
                if (networkEntries[i].name.indexOf("user_sync.html") >= 0) {
                    userSyncUrl = networkEntries[i].name;
                }
            }); 
        }
    }
    if (idhViolations.length > 0) {
        errors['violations'].push({'errorCode': 1, 'meta': idhViolations.join(",")});
    }
    if (bidderViolations.length > 0) {
        errors['violations'].push({'errorCode': 2, 'meta': bidderViolations.join(",")});
    }
    if (userSyncUrl.length > 0) {
        if (dataObj['ge'] == true) {
            if(!getQuerystring(userSyncUrl, 'gdpr')) {
                errors['violations'].push({'errorCode': 7, 'meta': ''});
            }
            if(!getQuerystring(userSyncUrl, 'gdpr_consent')) {
                errors['violations'].push({'errorCode': 8, 'meta': ''});
            }
        } else if (dataObj['ce'] == true) {
            if(!getQuerystring(userSyncUrl, 'us_privacy')) {
                errors['violations'].push({'errorCode': 9, 'meta': ''});
            }
        }
    }

    if(dataObj['gto'] < 5000) {
        errors['misconfigs'].push({'errorCode': 1, 'meta': dataObj['gto']});
    }
    if(dataObj['gaTo'] === 0 || dataObj['gaTo'] === undefined) {
        errors['misconfigs'].push({'errorCode': 2, 'meta': ''});
    }
    if(dataObj['ge'] === 0 && GDPR_REGIONS.indexOf(dataObj['loc']) >= 0) {
        errors['misconfigs'].push({'errorCode': 3, 'meta': dataObj['loc']});
    }
    if(dataObj['ce'] === 0 && dataObj['loc'] === 'US') {
        errors['misconfigs'].push({'errorCode': 4, 'meta': ''});
    }
    if(dataObj.namespaces.indexOf("owpbjs") !== dataObj.namespaces.lastIndexOf("owpbjs")) {
        errors['misconfigs'].push({'errorCode': 5, 'meta': ''});
    }


    if (isVersionSmaller(dataObj.pv, 'v7.39.0')) {
        errors['misconfigs'].push({'errorCode': 6, 'meta': ''});
    }

    dataObj.errors = errors;
}
