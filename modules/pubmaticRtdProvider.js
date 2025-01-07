import { submodule } from '../src/hook.js';
import { logInfo, logError, mergeDeep, isStr, deepAccess, logMessage, logWarn } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import {config as conf} from '../src/config.js';
import { ajax } from '../src/ajax.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/**
 * This RTD module has a dependency on the priceFloors module.
 * We utilize the continueAuction function from the priceFloors module to incorporate price floors data into the current auction.
 */
import { continueAuction } from './priceFloors.js'; 

const BIDDER_CODE = 'pubmatic';
const REAL_TIME_MODULE = 'realTimeData';
const SUBMODULE_NAME = 'pubmatic';
const FLOOR_PROVIDER = 'Pubmatic';
const LOG_PRE_FIX = 'PubMatic-Rtd-Provider: ';
const GVL_ID = 76;
const TCF_PURPOSES = [1, 7]

let isFloorEnabled = true; //default true
let _timeOfDay = 'evening';
let _deviceType = 'mobile';
let _country = 'Australia';
let _region = 'Delhi';
let _browser = 'Chrome';
let _os = 'Android';
let _utm = '0';

let __pubmaticFloorRulesPromise__ = null;
let __pubmaticGeolocationPromise__ = null;

function getDeviceTypeFromUserAgent(userAgent) {
  // Normalize user agent string to lowercase for easier matching
  const ua = userAgent.toLowerCase();
  // Check for mobile devices
  if (/mobile|iphone|ipod|android.*mobile|blackberry|windows phone/.test(ua)) {
    return 'mobile';
  }
  // Check for tablets
  if (/tablet|ipad|android(?!.*mobile)/.test(ua)) {
    return 'tablet';
  }
  // Default to desktop if neither mobile nor tablet matches
  return 'desktop';
}

function getBrowserFromUserAgent(userAgent) {
  if (/firefox\/\d+/i.test(userAgent)) {
    return "Firefox";
  } else if (/chrome\/\d+/i.test(userAgent) && !/edg\//i.test(userAgent)) {
      return "Chrome";
  } else if (/safari\/\d+/i.test(userAgent) && !/chrome\/\d+/i.test(userAgent)) {
      return "Safari";
  } else if (/edg\/\d+/i.test(userAgent)) {
      return "Edge";
  } else if (/msie \d+/i.test(userAgent) || /trident\/\d+/i.test(userAgent)) {
      return "Internet Explorer";
  }
}

function getOsFromUserAgent(userAgent) {
  if (/windows nt \d+/i.test(userAgent)) {
    return "Windows";
  } else if (/mac os x/i.test(userAgent)) {
    return "MacOS";
  } else if (/android/i.test(userAgent)) {
    return "Android";
  } else if (/linux/i.test(userAgent)) {
    return "Linux";
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iOS";
  }
}

function getBrowser(){
  return _browser;
}

function setBrowser(){
  let browser = getBrowserFromUserAgent(navigator.userAgent);
  _browser = browser;
}

function getOs(){
  return _os;
}

function setOs() {
  let os = getOsFromUserAgent(navigator.userAgent);
  _os = os;
}

function getDeviceType() {
 return _deviceType;
}

function setDeviceType(value){
  _deviceType = value;
}

function getTimeOfDay(){
return _timeOfDay;

  // const currentHour = new Date().getHours();  // Get the current hour (0-23)

  // if (currentHour >= 5 && currentHour < 12) {
  //   return 'morning';
  // } else if (currentHour >= 12 && currentHour < 17) {
  //   return 'afternoon';
  // } else if (currentHour >= 17 && currentHour < 19) {
  //   return 'evening';
  // } else {
  //   return 'night';
  // }
}

function setTimeOfDay(value){
  _timeOfDay = value;
}

function getCountry(){
  return _country;
}

function setCountry(value){
 _country = value;
}

function getRegion(){
  return _region;
}

function setRegion(value){
 _region = value;
}

function getBidder(bidderDetail){
  return bidderDetail?.bidder;
}

function getUtm(a,b){
  return _utm;
}

function setUtm(url){
  const queryString = url?.split('?')[1];
  _utm = queryString.includes('utm') ? '0' : '1';
}

export const getFloorsConfig = (provider, apiResponse) => {
 // const floor = apiResponse.floor;
 const floor = {
  data : apiResponse,
  auctionDelay: 600,
  enforcement: {
    enforceJS: false
  }
 }
  const floorsConfig = {
    floors: {
      ...floor,
      additionalSchemaFields: {
        deviceType : getDeviceType,
        timeOfDay: getTimeOfDay,
        country: getCountry,
        region: getRegion,
        browser: getBrowser,
        os: getOs,
        bidder: getBidder,
        utm: getUtm
      }
    },
  };

  console.log('In pubmaticRTDProvider -> In getFloorsConfig -> floors data -> ',floorsConfig);
  return floorsConfig;
};

export const setFloorsConfig = (provider, data) => {
  if (data) {
    const floorsConfig = getFloorsConfig(provider, data);
    conf.setConfig(floorsConfig);
  } else {
    conf.setConfig({ floors: window.__pubmaticPrevFloorsConfig__ });
  }
};

export const setDefaultPriceFloors = (provider) => {
  const { data } = deepAccess(provider, 'params');
  if (data !== undefined) {
    data.floorProvider = FLOOR_PROVIDER;
    setFloorsConfig(provider, data);
  }
};

const setPriceFloors = async (config) => {
  window.__pubxPrevFloorsConfig__ = conf.getConfig('floors');
  //setDefaultPriceFloors(config); //Setting default floors before API call 
  return fetchFloorRules(config)
    .then((apiResponse) => {
      console.log('Pubmatic rtd provider -> In setPriceFloors fn -> after fetchFloorRules');
      setFloorsConfig(config, apiResponse);
      console.log('Pubmatic rtd provider -> In setPriceFloors fn -> after setFloorsConfig -> config.getConfig() -> ',conf.getConfig());
    
    })
    .catch((_) => {
      logError(LOG_PRE_FIX + 'Error while fetching floors.');
    });
};


const fetchFloorRules = async (config) => {
  console.log('Pubmatic rtd provider -> In fetchFloorRules fn -> before API call');

  return new Promise((resolve, reject) => {
    const url = 'https://hbopenbid.pubmatic.com/pubmaticRtdApi';
    //const url = 'https://ads.pubmatic.com/AdServer/js/pwt/floors/160547/3819/floors.json';
    if (url) {
      ajax(url, {
        success: (responseText, response) => {
          try {
            if (response && response.response) {
              console.log('API Response Timer: In Pubmatic RTD module -> ', Date.now());

              const apiResponse = JSON.parse(response.response);
              setTimeOfDay(apiResponse?.userContext?.timeOfDay);
              setDeviceType(apiResponse?.userContext?.deviceType);
              //setCountry(apiResponse?.userContext?.country); // Setting from GEO API
              setRegion(apiResponse?.userContext?.region);
              console.log('Pubmatic rtd provider -> In fetchFloorRules fn -> response', apiResponse);
              resolve(apiResponse);
            } else {
              resolve(null);
            }
          } catch (error) {
            reject(error);
          }
        },
        error: (responseText, response) => {
          reject(response);
        },
      });
    }
  });
};

const getGeolocation = async () =>{
  return new Promise((resolve, reject) => {
    const url = 'https://ut.pubmatic.com/geo?pubid=5890';
    if (url) {
      ajax(url, {
        success: (response) => {
          try {
            if (response) {
              const apiResponse = JSON.parse(response);
              setCountry(apiResponse.cc);
              resolve(apiResponse.cc);
            } else {
              logWarn(LOG_PRE_FIX,'No response from geolocation API');
              resolve(null);
            }
          } catch (error) {
            logError(LOG_PRE_FIX,'Error geolocation API - ', error);
            reject(error);
          }
        },
        error: (response) => {
          logError(LOG_PRE_FIX,'Error geolocation API - ', response);
          reject(response);
        },
      });
    }
  }); 
}

/**
 * Checks TCF and USP consents
 * @param {Object} userConsent
 * @returns {boolean}
 */
function checkConsent (userConsent) {
  let consent

  if (userConsent) {
    if (userConsent.gdpr && userConsent.gdpr.gdprApplies) {
      const gdpr = userConsent.gdpr

      if (gdpr.vendorData) {
        const vendor = gdpr.vendorData.vendor
        const purpose = gdpr.vendorData.purpose

        let vendorConsent = false
        if (vendor.consents) {
          vendorConsent = vendor.consents[GVL_ID]
        }

        if (vendor.legitimateInterests) {
          vendorConsent = vendorConsent || vendor.legitimateInterests[GVL_ID]
        }

        const purposes = TCF_PURPOSES.map(id => {
          return (purpose.consents && purpose.consents[id]) || (purpose.legitimateInterests && purpose.legitimateInterests[id])
        })
        const purposesValid = purposes.filter(p => p === true).length === TCF_PURPOSES.length
        consent = vendorConsent && purposesValid
      }
    } else if (userConsent.usp) {
      const usp = userConsent.usp
      consent = usp[1] !== 'N' && usp[2] !== 'Y'
    }
  }

  return consent
}


/**
 * Initialize the Pubmatic RTD Module.
 * @param {Object} config
 * @param {Object} _userConsent
 * @returns {boolean}
 */
function init(config, _userConsent) {  
  const publisherId = config.params?.publisherId;
  const profileId = config.params?.profileId;

  if (!publisherId) {
    logError(LOG_PRE_FIX + 'Missing publisher Id.');
    return false;
  }

  if (publisherId && !isStr(publisherId)) {
    logError(LOG_PRE_FIX + 'Publisher Id should be string.');
    return false;
  }

  if (!profileId) {
    logError(LOG_PRE_FIX + 'Missing profile Id.');
    return false;
  }

  if (profileId && !isStr(profileId)) {
    logError(LOG_PRE_FIX + 'Profile Id should be string.');
    return false;
  }

 
  __pubmaticFloorRulesPromise__ = setPriceFloors(config);
  getGeolocation();
  setBrowser();
  setOs();
  setUtm(window.location?.href);
  return true;
}

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 */


//With CMP FLow
// function getBidRequestData(reqBidsConfigObj, onDone, config, userConsent) {
//   console.log('IN Pubmatic RTD -> getBidRequestData fn -> user consent ', userConsent);

//   //check user consent 
//   const hasConsent = checkConsent(userConsent)
//   const initialize = hasConsent !== false

// console.log('IN Pubmatic RTD -> getBidRequestData fn -> hasConsent ', hasConsent);
// if(initialize){
//   __pubmaticFloorRulesPromise__ = setPriceFloors(config);
//   __pubmaticGeolocationPromise__ = getGeolocation();
//   Promise.allSettled([__pubmaticFloorRulesPromise__,__pubmaticGeolocationPromise__]).then(() => {
//   console.log('ubmatic rtd provider -> In getBidRequestData fn -> reqBidsConfigObj', reqBidsConfigObj);
//   const hookConfig = {
//     reqBidsConfigObj,
//     context: this,
//     nextFn: ()=> true,
//     haveExited: false,
//     timer: null
//   };
//   continueAuction(hookConfig);
//   onDone();
// });
// }
// }

//Without CMP FLow
const getBidRequestData = (() => {
  //console.log('Pubmatic rtd provider -> In getBidRequestData fn -> is floorAttached ->', floorsAttached);
  let floorsAttached = false;
  return (reqBidsConfigObj, onDone) => {
    if (!floorsAttached) {
      __pubmaticFloorRulesPromise__.then(() => {
        console.log('ubmatic rtd provider -> In getBidRequestData fn -> reqBidsConfigObj', reqBidsConfigObj);
        const hookConfig = {
          reqBidsConfigObj,
          context: this,
          nextFn: ()=> true,
          haveExited: false,
          timer: null
        };
        continueAuction(hookConfig);
        //set ortb.bidders
        // if(isFloorEnabled){
        //   const Ortb2 = {
        //     user : {
        //       ext : {
        //         name : 'komal',
        //         deviceType : getDeviceType(),
        //         timeOfDay : getTimeOfDay()
        //       }
        //     }
        //   }
      
        //   mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, {
        //     [BIDDER_CODE] : Ortb2
        //   });
        // }
        onDone();
      });

      floorsAttached = true;
    }
  };
})();

/** @type {RtdSubmodule} */
export const pubmaticSubmodule = {
    /**
     * used to link submodule with realTimeData
     * @type {string}
     */
    name: SUBMODULE_NAME,
    init: init,
    getBidRequestData,
  };
  
  function registerSubModule() {
    submodule(REAL_TIME_MODULE, pubmaticSubmodule);
  }
  
  registerSubModule();