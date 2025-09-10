import { _each, isArray, logError, logWarn, pick, isFn } from '../src/utils.js';
import { default as adapter, setDebounceDelay } from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { BID_STATUS, STATUS, REJECTION_REASON } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { getStorageManager } from '../src/storageManager.js';

/// /////////// CONSTANTS //////////////
const ADAPTER_CODE = 'pubmatic';
const VENDOR_OPENWRAP = 'openwrap';
const DISPLAY_MANAGER = 'Prebid.js';
const SEND_TIMEOUT = 2000;
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl?';
const END_POINT_WIN_BID_LOGGER = END_POINT_HOST + 'wt?';
const END_POINT_VERSION = 1;
const INTEGRATION_TYPE = 'web';
const LOG_PRE_FIX = 'PubMatic-Analytics: ';
const cache = {
  auctions: {}
};
const SUCCESS = 'success';
const NO_BID = 'no-bid';
const ERROR = 'error';
const REQUEST_ERROR = 'request-error';
const TIMEOUT_ERROR = 'timeout-error';
const CURRENCY_USD = 'USD';
const BID_PRECISION = 2;
// todo: input profileId and profileVersionId ; defaults to zero or one
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const DEFAULT_ISIDENTITY_ONLY = 0;
const PREFIX = 'PROFILE_AUCTION_INFO_';
const enc = window.encodeURIComponent;


/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional
let s2sBidders = [];
let identityOnly = DEFAULT_ISIDENTITY_ONLY;

// ///////////// OPENWRAP CODE /////////////////////

getGlobal().injectTrackerForIMA = async function (args, vast) {

  var bid = cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[args.requestId][0];
  bid.adId = args.adId;
  bid.auctionId = args.auctionId;
  bid.adUnitCode = args.adUnitCode;
  bid.requestId = args.requestId;
  bid.bidderCode = args.bidderCode;
  bid.bidResponse = parseBidResponse(args);
  
  var auctionCache = cache.auctions[args.auctionId];
  auctionCache.adUnitCodes[args.adUnitCode].wonBidId = args.requestId;
  auctionCache.adUnitCodes[args.adUnitCode].bidWonAdId = args.adId;

 const result = await executeBidWonLoggerCall(args.auctionId,args.adUnitCode,true);
   
    if (!bid) {
      logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
      return;
    }

    try {
      var domParser = new DOMParser();
      var parsedVast = domParser.parseFromString(vast, 'application/xml');
      var impEle = parsedVast.createElement('Impression');
      impEle.innerHTML = '<![CDATA[' + END_POINT_WIN_BID_LOGGER + result + ']]>';
      if (parsedVast.getElementsByTagName('Wrapper').length == 1) {
        parsedVast.getElementsByTagName('Wrapper')[0].appendChild(impEle);
      } else if (parsedVast.getElementsByTagName('InLine').length == 1) {
        parsedVast.getElementsByTagName('InLine')[0].appendChild(impEle);
      }
      return new XMLSerializer().serializeToString(parsedVast);
    } catch (ex) {
      logError(LOG_PRE_FIX + ' Exception in injecting tracker for IMA ', ex);
      return vast;
    }
  
};

function getCDSData() {
  return config.getConfig('cds');
}

function getCDSDataLoggerStr() {
  var separator = ';';
  var cdsData = getCDSData();
  var cdsStr = '';
  if (cdsData) {
    Object.keys(cdsData).map(function (key) {
      var val = cdsData[key].value;
      val = (!Array.isArray(val) && typeof val !== 'object' &&
        typeof val !== 'function' && typeof val !== 'undefined') ? val : '';
      cdsStr += (key + '=' + val + separator);
    });
    cdsStr = cdsStr.slice(0, -1);
  }
  return enc(cdsStr);
}

export function setConsentFieldsLoggedBy() {
  let loggedBy = {                  // This indicates whether the data is logged by tracker or logger for first auction.
    // "auction-id" : {             // This property will be set at the time of auction init
    //   tracker: false,
    //   logger: false
    // }
  };
  return {
    initialize: function(auctionId) {
      if (isEmpty(loggedBy)) {
        loggedBy[auctionId] = {
          tracker: false,
          logger: false
        };
      }
    },
    setLoggedBy: function(auctionId, loggingFor) {
      if (loggedBy[auctionId]) {
        loggedBy[auctionId][loggingFor] = true;
      }
    },
    reset: function() {
      loggedBy = {};
    },
    getLoggedBy: function() {
      return loggedBy;
    }
  }
}
let consentFieldsLoggedBy = setConsentFieldsLoggedBy();

export function getConsentFieldsLoggedBy() {
  return consentFieldsLoggedBy;
}

function getConsentResolverConfig() {
  return (window?.PWT?.getConsentResolverConfig && isFn(window.PWT.getConsentResolverConfig))
    ? window.PWT?.getConsentResolverConfig()
    : null;
}

// Logging this information to take informed decision on what consent config to be applied.
export function getConsentInfo(auctionId, loggingFor) {
  const crConfig = getConsentResolverConfig();
  if (!crConfig || typeof crConfig != 'object') return {};

  const baseObj = {
    cecbo: crConfig?.cecbo,
    ccmps: crConfig?.ccmps
  };

  const loggedBy = consentFieldsLoggedBy.getLoggedBy();

  if (!crConfig.ccme || !loggedBy?.[auctionId] || loggedBy?.[auctionId][loggingFor]) {
    return baseObj;
  }

  // Setting value to true for specific loggingFor inside loggedDataBy in ConsentResolverConfig of OW
  consentFieldsLoggedBy.setLoggedBy(auctionId, loggingFor);

  // In case of trackewr we need to log all the dimensions
  const dimensions = {
    ccme: crConfig.ccme,
    ccmp: crConfig?.ccmp,
    ccmpid: crConfig?.ccmpid,
    csc: crConfig?.csc,
    crgdf: crConfig?.crgdf,
    cgm: crConfig?.cgm,
  };
  if (loggingFor === 'tracker') {
    return {
      ...baseObj,
      ...dimensions
    };
  }

  // When PWT.getDurationOf function available
  const getDurationOf = window.PWT?.getDurationOf;
  const isGetDurationOfFn = isFn(getDurationOf);
  const metrics = isGetDurationOfFn ? {
    trnslt: getDurationOf('TRANSLATOR_CALLING_TIME'),
    lrt: getDurationOf('LOGGER_CALLING_TIME'),
    trt: getDurationOf('TRACKER_CALLING_TIME'),
    ccmt: isGetDurationOfFn ? getDurationOf('CONSENT_CONFIG_RESOLVER_TIME') : null,
    cgst: isGetDurationOfFn ? getDurationOf('GEO_CALLING_TIME') : null,
    ccmpt: isGetDurationOfFn ? getDurationOf('CMP_CALLING_TIME') : null
  } : {};

  return {
    ...baseObj,
    ...dimensions,
    ...metrics,
  };
}


function getPSL(auctionId) {
  let latency = window.pbsLatency;
  let latencyValues = latency && latency[auctionId]
  // If we do not have latencyValues, means we are not using prebidServerBidAdapter i.e. auction end point
  // so for 2.5 endpoint we need to make sure that we are not passing this key as earlier.
  let pslTime = latencyValues ? 0 : undefined;
  if (latencyValues && latencyValues['startTime'] && latencyValues['endTime']) {
    pslTime = latencyValues['endTime'] - latencyValues['startTime']
  }
  return pslTime;
}



function transformPayload(auctionId, currentPayload, adUnitInfo, bidWon = false) {
  const HOSTNAME = window.location.host;
  const storage = getStorageManager({ bidderCode: ADAPTER_CODE });
  const storedObject = storage.getDataFromLocalStorage(PREFIX + HOSTNAME);
  const frequencyDepth = storedObject ? JSON.parse(storedObject) : {};
  const newPayload = { ...currentPayload };

  for (const key in newPayload) {
    if (key === 'fd') {
      const cdsValue = getCDSDataLoggerStr();
      Object.assign(newPayload[key], {
        ...(cdsValue && { cds: cdsValue }),
        bdv: frequencyDepth,
        cmp: getConsentInfo(auctionId, bidWon ? 'tracker' : 'logger'),
      });
    } else if (key === 'rd') {
      Object.assign(newPayload[key], {
        psl: getPSL(auctionId),
        ih: identityOnly,
        owv: window.PWT?.versionDetails?.openwrap_version || '-1',
      });
    } else if (key === 'sd') {
      if (bidWon) {
        newPayload[key].rf = adUnitInfo?.pubmaticAutoRefresh?.isRefreshed ? 1 : 0;
        newPayload[key] = Object.assign({}, newPayload[key])
      } else {
        Object.keys(newPayload[key]).map(slotName => {

          let origAdUnit = getAdUnit(cache.auctions[adUnitInfo]?.origAdUnits, slotName) || {};
          newPayload[key][slotName].pubmaticAutoRefresh = {
            autoRefresh: origAdUnit?.pubmaticAutoRefresh?.isRefreshed ? 1 : 0
          };
          newPayload[key][slotName] = Object.assign({}, newPayload[key][slotName]);  
        });
      }
    }
  }
  return newPayload;
}

/// /////////// HELPER FUNCTIONS //////////////

function formatSource(src = 'client') {
  return (src === 's2s' ? 'server' : src).toLowerCase();
}

function sendAjaxRequest({ endpoint, method, queryParams = '', body = null }) {
  const url = queryParams ? `${endpoint}${queryParams}` : endpoint;
  return ajax(url, null, body, { method });
};
   
function copyRequiredBidDetails(bid) {
  return pick(bid, [
    'bidder',
    'bidderCode',
    'adapterCode',
    'bidId',
    'adUnitId', () => bid.adUnitCode,
    'owAdUnitId', () => getGptSlotInfoForAdUnitCode(bid.adUnitCode)?.gptSlot || bid.adUnitCode,
    'status', () => NO_BID, // default a bid to NO_BID until response is received or bid is timed out
    'finalSource as source',
    'params',
    'adUnit', () => pick(bid, [
      'adUnitCode',
      'transactionId',
      'sizes as dimensions',
      'mediaTypes'
    ])
  ]);
}

function setBidStatus(bid, args) {
  if (bid?.status === ERROR && bid?.error?.code === TIMEOUT_ERROR) { return; }
  switch (args.getStatusCode()) {
    case STATUS.GOOD:
      bid.status = SUCCESS;
      delete bid.error; // it's possible for this to be set by a previous timeout
      break;
    default:
      bid.status = ERROR;
      bid.error = {
        code: REQUEST_ERROR
      };
  }
}

function parseBidResponse(bid) {
  return pick(bid, [
    'bidPriceUSD', () => {
      // todo: check whether currency cases are handled here
      if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === CURRENCY_USD) {
        return window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION));
      }
      // use currency conversion function if present
      if (typeof bid.getCpmInNewCurrency === 'function') {
        return window.parseFloat(Number(bid.getCpmInNewCurrency(CURRENCY_USD)).toFixed(BID_PRECISION));
      }
      logWarn(LOG_PRE_FIX + 'Could not determine the Net cpm in USD for the bid thus using bid.cpm', bid);
      return bid.cpm
    },
    'bidGrossCpmUSD', () => {
      if (typeof bid.originalCurrency === 'string' && bid.originalCurrency.toUpperCase() === CURRENCY_USD) {
        return window.parseFloat(Number(bid.originalCpm).toFixed(BID_PRECISION));
      }
      // use currency conversion function if present
      if (typeof getGlobal().convertCurrency === 'function') {
        return window.parseFloat(Number(getGlobal().convertCurrency(bid.originalCpm, bid.originalCurrency, CURRENCY_USD)).toFixed(BID_PRECISION));
      }
      logWarn(LOG_PRE_FIX + 'Could not determine the Gross cpm in USD for the bid, thus using bid.originalCpm', bid);
      return bid.originalCpm
    },
    'dealId',
    'currency',
    'cpm', () => window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION)),
    'originalCpm', () => window.parseFloat(Number(bid.originalCpm).toFixed(BID_PRECISION)),
    'originalCurrency',
    'adserverTargeting',
    'dealChannel',
    'meta',() => (bid.meta && Object.keys(bid.meta).length > 0 ? bid.meta : undefined),
    'status',
    'error',
    'bidId',
    'mediaType',
    'params',
    'floorData',
    'mi',
    'regexPattern', () => bid.regexPattern || undefined,
    'partnerImpId', // partner impression ID
    'dimensions', () => pick(bid, [
      'width',
      'height'
    ])
  ]);
}

function getAdapterNameForAlias(aliasName) {
  // This condition  is OpenWrap specific, not to contribute to Prebid
  if (window.PWT && isFn(window.PWT.getAdapterNameForAlias)) {
    return window.PWT.getAdapterNameForAlias(aliasName)
  }
  // Fallback mechanism which is conrtibuted to Prebid
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function isS2SBidder(bidder) {
  return (s2sBidders.indexOf(bidder) > -1) ? 1 : 0
}

function isOWPubmaticBid(adapterName) {
  let s2sConf = config.getConfig('s2sConfig');
  let s2sConfArray = s2sConf ? (isArray(s2sConf) ? s2sConf : [s2sConf]) : [];
  return s2sConfArray.some(conf => {
    if (adapterName === ADAPTER_CODE && conf.defaultVendor === VENDOR_OPENWRAP &&
      conf.bidders.indexOf(ADAPTER_CODE) > -1) {
      return true;
    }
  })
}

function checkAndModifySizeOfKGPVIfRequired(bid) {
  var responseObject = {
    'responseKGPV': bid.params.kgpv,
    'responseRegex': bid.params.regexPattern
  };

  // Logic to find out KGPV for partner for which the bid is recieved.
  // Need to check for No Bid Case.
  // kgpv.kgpvs.length > 0 && kgpv.kgpvs.forEach(function(ele){
  // eslint-disable-next-line no-tabs
  // 	/* istanbul ignore else */
  // eslint-disable-next-line no-tabs
  // 	if(bid.bidder == ele.adapterID){
  // eslint-disable-next-line no-tabs
  // 		responseObject.responseKGPV = ele.kgpv;
  // eslint-disable-next-line no-tabs
  // 		responseObject.responseRegex = ele.regexPattern;
  // eslint-disable-next-line no-tabs
  // 	}
  // });
  var responseIdArray = responseObject.responseKGPV.split('@');
  var sizeIndex = 1;
  var isRegex = false;
  /* istanbul ignore else */
  if (responseIdArray && (responseIdArray.length == 2 || ((responseIdArray.length == 3) && (sizeIndex = 2) && (isRegex = true))) && bid.bidResponse.mediaType != 'video') {
    var responseIdSize = responseIdArray[sizeIndex];
    var responseIndex = null;
    // Below check if ad unit index is present then ignore it
    // TODO: Confirm it needs to be ignored or not
    /* istanbul ignore else */
    if (responseIdArray[sizeIndex].indexOf(':') > 0) {
      responseIdSize = responseIdArray[sizeIndex].split(':')[0];
      responseIndex = responseIdArray[sizeIndex].split(':')[1];
    }
    /* istanbul ignore else */
    if (bid.bidResponse.dimensions &&
      (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height) != responseIdSize &&
      ((bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height).toUpperCase() != '0X0')) {
      // Below check is for size level mapping
      // ex. 300x250@300X250 is KGPV generated for first size but the winning size is 728x90
      // then new KGPV will be replaced to 728x90@728X90
      /* istanbul ignore else */
      if (responseIdArray[0].toUpperCase() == responseIdSize.toUpperCase()) {
        responseIdArray[0] = (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height).toLowerCase();
      }
      if (isRegex) {
        responseObject.responseKGPV = responseIdArray[0] + '@' + responseIdArray[1] + '@' + (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height);
      } else {
        responseObject.responseKGPV = responseIdArray[0] + '@' + (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height);
      }
      // Below check is to make consistent behaviour with ad unit index
      // it again appends index if it was originally present
      if (responseIndex) {
        responseObject.responseKGPV = responseObject.responseKGPV + ':' + responseIndex;
      }
    }
  }
  return responseObject;
}

function getListOfIdentityPartners() {
  const namespace = getGlobal();
  const publisherProvidedEids = namespace.getConfig("ortb2.user.eids") || [];
  const availableUserIds = namespace.adUnits[0]?.bids[0]?.userId || {};
  const identityModules = namespace.getConfig('userSync')?.userIds || [];
  const identityModuleNameMap = identityModules.reduce((mapping, module) => {
    if (module.storage?.name) {
      mapping[module.storage.name] = module.name;
    }
    return mapping;
  }, {});

  const userIdPartners = Object.keys(availableUserIds).map(storageName =>
    identityModuleNameMap[storageName] || storageName
  );

  const publisherProvidedEidList = publisherProvidedEids.map(eid =>
    identityModuleNameMap[eid.source] || eid.source
  );

  const identityPartners = Array.from(new Set([...userIdPartners, ...publisherProvidedEidList]));
  return identityPartners.length > 0 ? identityPartners : undefined;
}

function getAdUnit(adUnits, adUnitId) {
  return adUnits.filter(adUnit => (adUnit.divID && adUnit.divID == adUnitId) || (adUnit.code == adUnitId))[0];
}

function getTgId() {
  var testGroupId = parseInt(config.getConfig('testGroupId') || 0);
  if (testGroupId <= 15 && testGroupId >= 0) {
    return testGroupId;
  }
  return 0;
}

function getIntegrationType() {
  let s2sConfig = config.getConfig('s2sConfig');
  return s2sConfig?.bidders?.length ? 'hybrid' : 'web';
}

function getFeatureLevelDetails(auctionCache) {
  const result = {};

  // Add floor data if available
  if (auctionCache?.floorData?.floorRequestData) {
    const flrData = {
      ...auctionCache.floorData.floorRequestData,
      ...(auctionCache.floorData.floorResponseData?.enforcements && { enforcements: auctionCache.floorData.floorResponseData.enforcements })
    };
    result.flr = flrData;
  }

  // Add bdv object with list of identity partners
  const identityPartners = getListOfIdentityPartners();
  if (identityPartners) {
    result.bdv = {
      lip: identityPartners
    };
  }

  return result;
}



function getRootLevelDetails(auctionCache, auctionId) {
  const referrer = config.getConfig('pageUrl') || auctionCache.referer || '';
  
  return {
    pubid: `${publisherId}`,
    iid: `${auctionCache?.wiid || auctionId}`,
    to: parseInt(`${auctionCache.timeout}`),
    purl: referrer,
    tst: Math.round(Date.now() / 1000),
    pid: `${profileId}`,
    pdvid: `${profileVersionId}`,
    ortb2: auctionCache.ortb2,
    tgid: getTgId(),
    s2sls: s2sBidders,
    it: getIntegrationType(),
    dm: DISPLAY_MANAGER,
    dmv:'$prebid.version$' || '-1'
  }
}
function executeBidsLoggerCall(event, highestCpmBids) {
  const { auctionId } = event;
  const auctionCache = cache.auctions[auctionId];

  if (!auctionCache || auctionCache.sent) return;
  const country = event.bidderRequests?.length > 0
    ? event.bidderRequests.find(bidder => bidder?.bidderCode === ADAPTER_CODE)?.ortb2?.user?.ext?.ctr || ''
    : '';
   // Fetching slotinfo at event level results to undefined so Running loop over the codes to get the GPT slot name.
   Object.entries(auctionCache?.adUnitCodes || {}).forEach(([adUnitCode, adUnit]) => {
    let origAdUnit = getAdUnit(cache.auctions[auctionId]?.origAdUnits, adUnitCode) || {};
    auctionCache.adUnitCodes[adUnitCode].adUnitId = origAdUnit.owAdUnitId || getGptSlotInfoForAdUnitCode(adUnitCode)?.gptSlot || adUnitCode;
    
    for (let bidId in adUnit?.bids) {
      adUnit?.bids[bidId].forEach(bid => {
        bid['owAdUnitId'] = getGptSlotInfoForAdUnitCode(bid?.adUnit?.adUnitCode)?.gptSlot || bid.adUnit?.adUnitCode;   
        const winBid = highestCpmBids.filter(cpmbid => cpmbid.adId === bid?.adId)[0]?.adId;
        auctionCache.adUnitCodes[bid?.adUnitId].bidWonAdId = auctionCache.adUnitCodes[bid?.adUnitId].bidWonAdId ? auctionCache.adUnitCodes[bid?.adUnitId].bidWonAdId : winBid;
        bid.mi = bid?.bidResponse ? bid.bidResponse.mi : (window.matchedimpressions && window.matchedimpressions[bid.bidder]);
        const prebidBidId = bid.bidResponse && bid.bidResponse.prebidBidId;
        bid.bidId = prebidBidId || bid.bidId || bidId;
        bid.bidderCode = bid.bidderCode || bid.bidder;
        const prebidBidsReceived = event?.bidsReceived;
        if (isArray(prebidBidsReceived) && prebidBidsReceived.length > 0) {
          prebidBidsReceived.forEach(function(iBid) {
           if (iBid.adId === bid.adId) {
              bid.bidderCode = iBid.bidderCode;
            }
          });
        }
        let adapterName = getAdapterNameForAlias(bid.adapterCode || bid.bidder);
        bid.adapterName = adapterName;
        bid.bidder = adapterName;
      })
    }
  });
  const payload = {
    sd: auctionCache.adUnitCodes,
    fd: getFeatureLevelDetails(auctionCache),
    rd: {ctr: country && country !== '' ? country : window.PWT?.CC?.cc ? window.PWT.CC.cc : '', ...getRootLevelDetails(auctionCache, auctionId)}
  };
  auctionCache.sent = true;
  const urlParams = new URLSearchParams(new URL(payload.rd.purl).search);
  const queryParams = `v=${END_POINT_VERSION}&psrc=${INTEGRATION_TYPE}${urlParams.get('pmad') === '1' ? '&debug=1' : ''}`;
  if (isFn(window.PWT?.recordExitTime)) {
    window.PWT.recordExitTime('LOGGER_CALLING_TIME');
  }
  const owPayLoad = transformPayload(auctionId, payload, auctionId);
  sendAjaxRequest({
    endpoint: END_POINT_BID_LOGGER,
    method: 'POST',
    queryParams: queryParams,
    body: JSON.stringify(owPayLoad)
  });
}

function executeBidWonLoggerCall(auctionId, adUnitId, isIma=false) {
  const winningBidId = cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.wonBidId;
  const winningBids = cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.bids[winningBidId];
  if (!winningBids) {
    logWarn(LOG_PRE_FIX + 'Could not find winningBids for : ', auctionId);
    return;
  }

  let winningBid = winningBids[0];
  if (winningBids.length > 1) {
    winningBid = winningBids.find(bid => bid.adId === cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.bidWonAdId) || winningBid;
  }

  const adapterName = getAdapterNameForAlias(winningBid.adapterCode || winningBid.bidder);
  winningBid.bidId =  winningBidId;
  if (isOWPubmaticBid(adapterName) && isS2SBidder(winningBid.bidder)) {
    return;
  }
  let origAdUnit = getAdUnit(cache.auctions[auctionId]?.origAdUnits, adUnitId) || {};
  let owAdUnitId = origAdUnit.owAdUnitId || getGptSlotInfoForAdUnitCode(adUnitId)?.gptSlot || adUnitId;
  let auctionCache = cache.auctions[auctionId];
 
  const payload = {
    fd: getFeatureLevelDetails(auctionCache),
    rd: getRootLevelDetails(auctionCache, auctionId),
    sd: {
      adapterName,
      adUnitId,
      ...winningBid,
      owAdUnitId,
    }
  };
  const urlParams = new URLSearchParams(new URL(payload.rd.purl).search);
  const queryParams =`v=${END_POINT_VERSION}&psrc=${INTEGRATION_TYPE}${urlParams.get('pmad') === '1' ? '&debug=1' : ''}`;
  const owPayLoad = transformPayload(auctionId, payload, origAdUnit, true);
  if (isFn(window.PWT?.recordExitTime)) {
    window.PWT.recordExitTime('TRACKER_CALLING_TIME');
  }
  if(isIma) {
    const url = END_POINT_WIN_BID_LOGGER + queryParams + '&ima=1';
     
    return new Promise((resolve,reject)=>{
      ajax(url, (response,xhr)=>{
        resolve(response);
      }, JSON.stringify(owPayLoad), 'POST');
    })
 
  }
   sendAjaxRequest({
    endpoint: END_POINT_WIN_BID_LOGGER,
    method: 'POST',
    queryParams: queryParams,
    body: JSON.stringify(owPayLoad)
  });
  return ;
}


/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

const eventHandlers = {
  auctionInit: (args) => {
    s2sBidders = (function () {
      let s2sBidders = [];
      try {
        let s2sConf = config.getConfig('s2sConfig');
        if (isArray(s2sConf)) {
          s2sConf.forEach(conf => {
            if (conf?.bidders) {
              s2sBidders.push(...conf.bidders);
            }
          });
        } else if (s2sConf?.bidders) {
          s2sBidders.push(...s2sConf.bidders);
        }
      } catch (e) {
        logError('Error processing s2s bidders:', e);
      }
      return s2sBidders || [];
    }());
    let cacheEntry = pick(args, [
      'timestamp',
      'timeout',
      'bidderDonePendingCount', () => args.bidderRequests.length,
    ]);
    cacheEntry.adUnitCodes = {};
    cacheEntry.floorData = {};
    cacheEntry.origAdUnits = args.adUnits;
    cacheEntry.referer = args.bidderRequests[0].refererInfo.topmostLocation;
    cacheEntry.ortb2 = args.bidderRequests[0].ortb2;
    cache.auctions[args.auctionId] = cacheEntry;
  },

  bidRequested: (args) => {
    args.bids.forEach(function (bid) {
      if (!cache.auctions[args.auctionId].adUnitCodes.hasOwnProperty(bid.adUnitCode)) {
        cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode] = {
          bids: {},
          wonBidId: "",
          dimensions: bid.sizes
        };
      }
      if (bid.bidder === 'pubmatic' && !!bid?.params?.wiid) {
        cache.auctions[args.auctionId].wiid = bid.params.wiid;
      }
      cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId] = [copyRequiredBidDetails(bid)];
      if (bid.floorData) {
        cache.auctions[args.auctionId].floorData['floorRequestData'] = bid.floorData;
      }
    })
  },

  bidResponse: (args) => {
    if (!args.requestId) {
      logWarn(LOG_PRE_FIX + 'Got null requestId in bidResponseHandler');
      return;
    }
    let requestId = args.originalRequestId || args.requestId;
    let bid = cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[requestId][0];
    if (!bid) {
      logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
      return;
    }

    if ((bid.bidder && args.bidderCode && bid.bidder !== args.bidderCode) || (bid.bidder === args.bidderCode && bid.status === SUCCESS)) {
      if (bid.params) {
        args.params = bid.params;
      }
      bid = copyRequiredBidDetails(args);
      cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[requestId].push(bid);
    } else if (args.originalRequestId) {
      bid.bidId = args.requestId;
    }

    if (args.floorData) {
      cache.auctions[args.auctionId].floorData['floorResponseData'] = args.floorData;
    }

    bid.adId = args.adId;
    bid.source = formatSource(bid.source || args.source);
    setBidStatus(bid, args);
    const latency = args?.timeToRespond || Date.now() - cache.auctions[args.auctionId].timestamp;
    const auctionTime = cache.auctions[args.auctionId].timeout;
    // Check if latency is greater than auctiontime+150, then log auctiontime+150 to avoid large numbers
    bid.partnerTimeToRespond = latency > (auctionTime + 150) ? (auctionTime + 150) : latency;
    bid.clientLatencyTimeMs = Date.now() - cache.auctions[args.auctionId].timestamp;
    if (window.PWT && !!isFn(window.PWT.HookForBidReceived)) {
      window.PWT.HookForBidReceived(args.adUnitCode, args);
    }
    bid.bidResponse = parseBidResponse(args);
    bid.bidderCode = args.bidderCode || bid.bidderCode;
    var kgpvAndRegexOfBid = checkAndModifySizeOfKGPVIfRequired(bid);
    bid.params.kgpv = kgpvAndRegexOfBid.responseKGPV;
    bid.params.regexPattern = kgpvAndRegexOfBid.responseRegex;
    let adapterName = getAdapterNameForAlias(bid.adapterCode || bid.bidder);
    bid.bidder = adapterName;
    bid.adapterName = adapterName;
  },

  bidRejected: (args) => {
    // If bid is rejected due to floors value did not met
    // make cpm as 0, status as bidRejected and forward the bid for logging
    if (args.rejectionReason === REJECTION_REASON.FLOOR_NOT_MET) {
      args.cpm = 0;
      args.status = BID_STATUS.BID_REJECTED;
      eventHandlers['bidResponse'](args);
    }
  },

  bidderDone: (args) => {
    if (cache.auctions[args.auctionId]?.bidderDonePendingCount) {
      cache.auctions[args.auctionId].bidderDonePendingCount--;
    }
    args.bids.forEach(bid => {
      let cachedBids = cache.auctions[bid.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId || bid.originalRequestId || bid.requestId];
      cachedBids.forEach(cachedBid=>{
        if (typeof bid.serverResponseTimeMs !== 'undefined') {
          cachedBid.serverLatencyTimeMs = bid.serverResponseTimeMs;
        }
        if (!cachedBid.status) {
          cachedBid.status = NO_BID;
        }
        if (!cachedBid.clientLatencyTimeMs) {
          cachedBid.clientLatencyTimeMs = Date.now() - cache.auctions[bid.auctionId].timestamp;
        }
      });
    });
  },

  bidWon: (args) => {
    let auctionCache = cache.auctions[args.auctionId];
    auctionCache.adUnitCodes[args.adUnitCode].wonBidId = args.originalRequestId || args.requestId;
    auctionCache.adUnitCodes[args.adUnitCode].bidWonAdId = args.adId;
    executeBidWonLoggerCall(args.auctionId, args.adUnitCode);
  },

  auctionEnd: (args) => {
    // if for the given auction bidderDonePendingCount == 0 then execute logger call sooners
    let highestCpmBids = getGlobal().getHighestCpmBids() || [];
    setTimeout(() => {
      executeBidsLoggerCall.call(this, args, highestCpmBids);
    }, (cache.auctions[args.auctionId]?.bidderDonePendingCount === 0 ? 500 : SEND_TIMEOUT));
  },

  bidTimeout: (args) => {
    // db = 1 and t = 1 means bidder did NOT respond with a bid but we got a timeout notification
    // db = 0 and t = 1 means bidder did  respond with a bid but post timeout
    args.forEach(badBid => {
      let auctionCache = cache.auctions[badBid.auctionId];
      let bid = auctionCache.adUnitCodes[badBid.adUnitCode].bids[badBid.bidId || badBid.originalRequestId || badBid.requestId][0];
      if (bid) {
        bid.status = ERROR;
        bid.error = {
          code: TIMEOUT_ERROR
        };
      } else {
        logWarn(LOG_PRE_FIX + 'bid not found');
      }
    });
  }
}




/// /////////// ADAPTER DEFINITION //////////////
setDebounceDelay(0);
let baseAdapter = adapter({ analyticsType: 'endpoint' });
let pubmaticAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(conf = {}) {
    let error = false;

    if (typeof conf.options === 'object') {
      if (conf.options.publisherId) {
        publisherId = Number(conf.options.publisherId);
      }
      profileId = Number(conf.options.profileId) || DEFAULT_PROFILE_ID;
      profileVersionId = Number(conf.options.profileVersionId) || DEFAULT_PROFILE_VERSION_ID;
      identityOnly = Number(conf.options.identityOnly) || DEFAULT_ISIDENTITY_ONLY;
    } else {
      logError(LOG_PRE_FIX + 'Config not found.');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PRE_FIX + 'Missing publisherId(Number).');
      error = true;
    }

    if (error) {
      logError(LOG_PRE_FIX + 'Not collecting data due to error(s).');
    } else {
      baseAdapter.enableAnalytics.call(this, conf);
    }
  },

  disableAnalytics() {
    publisherId = DEFAULT_PUBLISHER_ID;
    profileId = DEFAULT_PROFILE_ID;
    profileVersionId = DEFAULT_PROFILE_VERSION_ID;
    s2sBidders = [];
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({ eventType, args }) {
    const handler = eventHandlers[eventType];
    if (handler) {
      handler(args);
    }
  }
});


/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: pubmaticAdapter,
  code: ADAPTER_CODE
});

export default pubmaticAdapter;
