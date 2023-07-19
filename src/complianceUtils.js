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
    1: " - UserId Module called when vendor consent for module was denied",
    2: " - Bidder called when vendor consent for module was denied",
    3: "User sync initiated when purpose 1 consent was denied",
    4: "UserId modules called when purpose 1 consent was denied",
    5: "Auction initiated when purpose 2 consent was denied",
    6: "CMP returned gdprApplies false for GDPR enabled region"
}

const COMPLIANCE_MISCONFIGS = {
    1: "GDPR timeout is set to a very low value ",
    2: "GDPR Action timeout not set/set to 0",
    3: "GDPR config not set for GDPR applicable region. Region detected - ",
    4: "CCPA is not configured for a CCPA region. Region detected - ",
    5: "More than 1 instance of pwt detected.",
    6: "Prebid version is less than v7.39. We highly recommend you to use prebid v7.39 or above"
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

export function validateConsentData(dataObj) {
    var errors = {
        'violations': [],
        'misconfigs': []
    };
    console.log("Compliance logger call - identifyViolations **** ", dataObj['gdprA'], " *** ",dataObj['loc']);
  
    if (!dataObj['gdprA'] && GDPR_REGIONS.indexOf(dataObj['loc']) >= 0 ) {
        errors['violations'].push("CMP returned gdprApplies false for GDPR enabled region");
    }
    let networkEntries = window.performance.getEntries();
    let xhrCalls = [];
    for(let i in networkEntries) {
        if (networkEntries[i].initiatorType === 'xmlhttprequest') {;
        // check if installed modules have been blocked, but calls are still triggered. if that is the case, add it to xhrCalls array
        _each(configurationMap, function(obj, key) {
            if (networkEntries[i].name.indexOf(obj.url) > 0) { // call for a configured id module/partner is detected
                if (dataObj['vc'][obj.gvlid] === false) {
                    if (obj.type === 'idh') {
                        errors['violations'].push(key + COMPLIANCE_VIOLATIONS['1']);
                    } else {
                        errors['violations'].push(key + COMPLIANCE_VIOLATIONS['2']);
                    }
                } else if (dataObj['pc']['1'] === false) {
                    errors['violations'].push(COMPLIANCE_VIOLATIONS['4']);
                } else if (dataObj['pc']['2'] === false) {
                    errors['violations'].push(COMPLIANCE_VIOLATIONS['5']);
                }
            }
            if (networkEntries[i].name.indexOf("user_sync.html") >= 0) {
                errors['violations'].push(COMPLIANCE_VIOLATIONS['3']);
            }
        });   
        }
    }
    if(dataObj['gto'] < 1000) {
        errors['misconfigs'].push(COMPLIANCE_MISCONFIGS[1]+dataObj['gto']);
    }
    if(dataObj['gaTo'] === 0 || dataObj['gaTo'] === undefined) {
        errors['misconfigs'].push(COMPLIANCE_MISCONFIGS[2]);
    }
    if(dataObj['ge'] === 0 && GDPR_REGIONS.indexOf(dataObj['loc']) >= 0) {
        errors['misconfigs'].push(COMPLIANCE_MISCONFIGS[3]+dataObj['loc']);
    }
    if(dataObj['ce'] === 0&& GDPR_REGIONS.indexOf(dataObj['loc']) < 0) {
        errors['misconfigs'].push(COMPLIANCE_MISCONFIGS[4]+dataObj['loc']);
    }
    if(dataObj.namespaces.indexOf("owpbjs") !== dataObj.namespaces.lastIndexOf("owpbjs")) {
        errors['misconfigs'].push(COMPLIANCE_MISCONFIGS[5]);
    }

    if (isVersionSmaller(dataObj.pv, 'v7.39.0')) {
        errors['misconfigs'].push(COMPLIANCE_MISCONFIGS[6]);
    }

    dataObj.errors = errors;
}
