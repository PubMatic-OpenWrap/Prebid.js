import { getBidRequest, logWarn, isBoolean, isStr, isArray, inIframe, mergeDeep, deepAccess, isNumber, deepSetValue, logInfo, logError, deepClone, uniques, isPlainObject, isInteger, parseQueryStringParameters, generateUUID } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE, ADPOD } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { bidderSettings } from '../src/bidderSettings.js';
import { NATIVE_IMAGE_TYPES, NATIVE_KEYS_THAT_ARE_NOT_ASSETS, NATIVE_KEYS, NATIVE_ASSET_TYPES } from '../src/constants.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const converter = ortbConverter({     
    context: {
        // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them 
        netRevenue: true,    // or false if your adapter should set bidResponse.netRevenue = false
        ttl: 300              // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)  
    },
	imp(buildImp, bidRequest, context) {
		const imp = buildImp(bidRequest, context);
		setImpTagId(imp, bidRequest.params);
		return imp;
	},
	request(buildRequest, imps, bidderRequest, context) {
		const request = buildRequest(imps, bidderRequest, context);
		deepSetValue(request, 'ext.wrapper', {"profile":6066}); 
		deepSetValue(request, 'site.publisher.id', "5890"); 
		deepSetValue(request, 'at', 1); 
		return request;
	},

	bidResponse(buildBidResponse, bid, context) {
        const bidResponse = buildBidResponse(bid, context);
		if(bid.dealid && bid.ext && bid.ext.deal_channel) {
			bidResponse.dealChannel = "PMP";
		}

		if (bidResponse.mediaType === VIDEO) {
			const bidImpId = bid.impid;
			const requestbids = context.bidderRequest?.bids;
			const matchedBid = requestbids.filter(function(bid) {
				return bid.bidId === bidImpId;
			});
			if(matchedBid[0].params.context === 'outstream') {
				bidResponse.rendererCode = matchedBid[0].params.outstreamAU;
				bidResponse.renderer = BB_RENDERER.newRenderer(matchedBid[0].params.outstreamAU, matchedBid[0].params.adUnitCode);
			}
		}	
		return bidResponse;
	},
	response(buildResponse, bidResponses, ortbResponse, context) {
        const response = buildResponse(bidResponses, ortbResponse, context);
		findingNoBidImpressions(context.ortbRequest, response.bids);
		return response;
    }	
});

function setImpTagId(imp, params) {
	const adSlot = params.adSlot;
	var splits = adSlot.split(':');
	var slot = splits[0];
	splits = slot.split('@');
	imp.tagid = splits[0];
}

function findingNoBidImpressions(req, bids = []) {
	if(req.imp?.length) {
		const impIds = req.imp.map(impression => impression.id);
		const bidIds = bids.map(bid => bid.requestId)
		.filter((value, index, self) => self.indexOf(value) === index);
		const nonBidIds = impIds.filter(imp => !bidIds.includes(imp));
		nonBidIds.forEach(function(nonBidId) {
			req.imp.forEach(function (imp) {
			  if (imp.id === nonBidId) {
				bids.push({
				  requestId: imp.id,
				  width: 0,
				  height: 0,
				  ttl: 300,
				  ad: '',
				  creativeId: 0,
				  netRevenue: NET_REVENUE,
				  cpm: 0,
				  currency: DEFAULT_CURRENCY,
				  referrer: ''
				});
			  }
			});
		  });
	}
}


const BIDDER_CODE = 'pubmatic';
const LOG_WARN_PREFIX = 'PubMatic: ';
const ENDPOINT = 'https://hbopenbid.pubmatic.com/translator';
const USER_SYNC_URL_IFRAME = 'https://ads.pubmatic.com/AdServer/js/user_sync.html?kdntuid=1&p=';
const USER_SYNC_URL_IMAGE = 'https://image8.pubmatic.com/AdServer/ImgSync?p=';
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const PUBMATIC_ALIAS = 'pubmatic2';
const UNDEFINED = undefined;
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;
const PREBID_NATIVE_HELP_LINK = 'http://prebid.org/dev-docs/show-native-ads.html';
const PUBLICATION = 'pubmatic'; // Your publication on Blue Billywig, potentially with environment (e.g. publication.bbvms.com or publication.test.bbvms.com)
const RENDERER_URL = 'https://pubmatic.bbvms.com/r/'.concat('$RENDERER', '.js'); // URL of the renderer application
const MSG_VIDEO_PLACEMENT_MISSING = 'Video.Placement param missing';

const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '', // OpenWrap Wrapper Impression ID
  'profId': '', // OpenWrap Legacy: Profile ID
  'verId': '' // OpenWrap Legacy: version ID
};
const DATA_TYPES = {
  'NUMBER': 'number',
  'STRING': 'string',
  'BOOLEAN': 'boolean',
  'ARRAY': 'array',
  'OBJECT': 'object'
};
const VIDEO_CUSTOM_PARAMS = {
  'mimes': DATA_TYPES.ARRAY,
  'minduration': DATA_TYPES.NUMBER,
  'maxduration': DATA_TYPES.NUMBER,
  'startdelay': DATA_TYPES.NUMBER,
  'playbackmethod': DATA_TYPES.ARRAY,
  'api': DATA_TYPES.ARRAY,
  'protocols': DATA_TYPES.ARRAY,
  'w': DATA_TYPES.NUMBER,
  'h': DATA_TYPES.NUMBER,
  'battr': DATA_TYPES.ARRAY,
  'linearity': DATA_TYPES.NUMBER,
  'placement': DATA_TYPES.NUMBER,
  'plcmt': DATA_TYPES.NUMBER,
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER,
  'skip': DATA_TYPES.NUMBER
}

const NET_REVENUE = true;
const dealChannelValues = {
  1: 'PMP',
  5: 'PREF',
  6: 'PMPG'
};

// BB stands for Blue BillyWig
const BB_RENDERER = {
  bootstrapPlayer: function(bid) {
    const config = {
      code: bid.adUnitCode,
    };

    if (bid.vastXml) config.vastXml = bid.vastXml;
    else if (bid.vastUrl) config.vastUrl = bid.vastUrl;

    if (!bid.vastXml && !bid.vastUrl) {
      logWarn(`${LOG_WARN_PREFIX}: No vastXml or vastUrl on bid, bailing...`);
      return;
    }

    const rendererId = BB_RENDERER.getRendererId(PUBLICATION, bid.rendererCode);

    const ele = document.getElementById(bid.adUnitCode); // NB convention

    let renderer;

    for (let rendererIndex = 0; rendererIndex < window.bluebillywig.renderers.length; rendererIndex++) {
      if (window.bluebillywig.renderers[rendererIndex]._id === rendererId) {
        renderer = window.bluebillywig.renderers[rendererIndex];
        break;
      }
    }

    if (renderer) renderer.bootstrap(config, ele);
    else logWarn(`${LOG_WARN_PREFIX}: Couldn't find a renderer with ${rendererId}`);
  },
  newRenderer: function(rendererCode, adUnitCode) {
    var rendererUrl = RENDERER_URL.replace('$RENDERER', rendererCode);
    const renderer = Renderer.install({
      url: rendererUrl,
      loaded: false,
      adUnitCode
    });

    try {
      renderer.setRender(BB_RENDERER.outstreamRender);
    } catch (err) {
      logWarn(`${LOG_WARN_PREFIX}: Error tying to setRender on renderer`, err);
    }

    return renderer;
  },
  outstreamRender: function(bid) {
    bid.renderer.push(function() { BB_RENDERER.bootstrapPlayer(bid) });
  },
  getRendererId: function(pub, renderer) {
    return `${pub}-${renderer}`; // NB convention!
  }
};

const MEDIATYPE = [
  BANNER,
  VIDEO,
  NATIVE
]

let publisherId = 0;
let isInvalidNativeRequest = false;
let biddersList = ['pubmatic'];
const allBiddersList = ['all'];

export function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _parseSlotParam(paramName, paramValue) {
  if (!isStr(paramValue)) {
    paramValue && logWarn(LOG_WARN_PREFIX + 'Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

  switch (paramName) {
    case 'pmzoneid':
      return paramValue.split(',').slice(0, 50).map(id => id.trim()).join();
    case 'kadfloor':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lat':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lon':
      return parseFloat(paramValue) || UNDEFINED;
    case 'yob':
      return parseInt(paramValue) || UNDEFINED;
    default:
      return paramValue;
  }
}

function _cleanSlot(slotName) {
  if (isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  if (slotName) {
    logWarn(BIDDER_CODE + ': adSlot must be a string. Ignoring adSlot');
  }
  return '';
}

function _parseAdSlot(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;
  bid.params.adSlot = _cleanSlot(bid.params.adSlot);

  var slot = bid.params.adSlot;
  var splits = slot.split(':');

  slot = splits[0];
  if (splits.length == 2) {
    bid.params.adUnitIndex = splits[1];
  }
  // check if size is mentioned in sizes array. in that case do not check for @ in adslot
  splits = slot.split('@');
  bid.params.adUnit = splits[0];
  if (splits.length > 1) {
    // i.e size is specified in adslot, so consider that and ignore sizes array
    splits = splits.length == 2 ? splits[1].split('x') : splits.length == 3 ? splits[2].split('x') : [];
    if (splits.length != 2) {
      logWarn(LOG_WARN_PREFIX + 'AdSlot Error: adSlot not in required format');
      return;
    }
    bid.params.width = parseInt(splits[0], 10);
    bid.params.height = parseInt(splits[1], 10);
  }
  // Case : if Size is present in ad slot as well as in mediaTypes then ???
  if (bid.hasOwnProperty('mediaTypes') &&
         bid.mediaTypes.hasOwnProperty(BANNER) &&
          bid.mediaTypes.banner.hasOwnProperty('sizes')) {
    var i = 0;
    var sizeArray = [];
    for (;i < bid.mediaTypes.banner.sizes.length; i++) {
      if (bid.mediaTypes.banner.sizes[i].length === 2) { // sizes[i].length will not be 2 in case where size is set as fluid, we want to skip that entry
        sizeArray.push(bid.mediaTypes.banner.sizes[i]);
      }
    }
    bid.mediaTypes.banner.sizes = sizeArray;
    if (bid.mediaTypes.banner.sizes.length >= 1) {
      // set the first size in sizes array in bid.params.width and bid.params.height. These will be sent as primary size.
      // The rest of the sizes will be sent in format array.
      if (!bid.params.width && !bid.params.height) {
        bid.params.width = bid.mediaTypes.banner.sizes[0][0];
        bid.params.height = bid.mediaTypes.banner.sizes[0][1];
        bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
      } else if (bid.params.width == bid.mediaTypes.banner.sizes[0][0] && bid.params.height == bid.mediaTypes.banner.sizes[0][1]) {
        bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
      }
    }
  }
}

function _initConf(refererInfo) {
  return {
    // TODO: do the fallbacks make sense here?
    pageURL: refererInfo?.page || window.location.href,
    refURL: refererInfo?.ref || window.document.referrer
  };
}

function _handleCustomParams(params, conf) {
  if (!conf.kadpageurl) {
    conf.kadpageurl = conf.pageURL;
  }

  var key, value, entry;
  for (key in CUSTOM_PARAMS) {
    if (CUSTOM_PARAMS.hasOwnProperty(key)) {
      value = params[key];
      if (value) {
        entry = CUSTOM_PARAMS[key];

        if (typeof entry === 'object') {
          // will be used in future when we want to process a custom param before using
          // 'keyname': {f: function() {}}
          value = entry.f(value, conf);
        }

        if (isStr(value)) {
          conf[key] = value;
        } else {
          logWarn(LOG_WARN_PREFIX + 'Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
        }
      }
    }
  }
  return conf;
}


// TODO remove this function when the support for 1.1 is removed
/**
 * Copy of the function toOrtbNativeRequest from core native.js to handle the title len/length
 * and ext and mimes parameters from legacy assets.
 * @param {object} legacyNativeAssets
 * @returns an OpenRTB format of the same bid request
 */

function _assignRenderer(newBid, request) {
  let bidParams, context, adUnitCode;
  if (request.bidderRequest && request.bidderRequest.bids) {
    for (let bidderRequestBidsIndex = 0; bidderRequestBidsIndex < request.bidderRequest.bids.length; bidderRequestBidsIndex++) {
      if (request.bidderRequest.bids[bidderRequestBidsIndex].bidId === newBid.requestId) {
        bidParams = request.bidderRequest.bids[bidderRequestBidsIndex].params;

        if (FEATURES.VIDEO) {
          context = request.bidderRequest.bids[bidderRequestBidsIndex].mediaTypes[VIDEO].context;
        }
        adUnitCode = request.bidderRequest.bids[bidderRequestBidsIndex].adUnitCode;
      }
    }
    if (context && context === 'outstream' && bidParams && bidParams.outstreamAU && adUnitCode) {
      newBid.rendererCode = bidParams.outstreamAU;
      newBid.renderer = BB_RENDERER.newRenderer(newBid.rendererCode, adUnitCode);
    }
  }
}

/**
 * In case of adpod video context, assign prebiddealpriority to the dealtier property of adpod-video bid,
 * so that adpod module can set the hb_pb_cat_dur targetting key.
 * @param {*} newBid
 * @param {*} bid
 * @param {*} request
 * @returns
 */
export function assignDealTier(newBid, bid, request) {
  if (!bid?.ext?.prebiddealpriority || !FEATURES.VIDEO) return;
  const bidRequest = getBidRequest(newBid.requestId, [request.bidderRequest]);
  const videoObj = deepAccess(bidRequest, 'mediaTypes.video');
  if (videoObj?.context != ADPOD) return;

  const duration = bid?.ext?.video?.duration || videoObj?.maxduration;
  // if (!duration) return;
  newBid.video = {
    context: ADPOD,
    durationSeconds: duration,
    dealTier: bid.ext.prebiddealpriority
  };
}

function isNonEmptyArray(test) {
  if (isArray(test) === true) {
    if (test.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Prepare meta object to pass as params
 * @param {*} br : bidResponse
 * @param {*} bid : bids
 */
export function prepareMetaObject(br, bid, seat) {
  br.meta = {};

  if (bid.ext && bid.ext.dspid) {
    br.meta.networkId = bid.ext.dspid;
    br.meta.demandSource = bid.ext.dspid;
  }

  // NOTE: We will not recieve below fields from the translator response also not sure on what will be the key names for these in the response,
  // when we needed we can add it back.
  // New fields added, assignee fields name may change
  // if (bid.ext.networkName) br.meta.networkName = bid.ext.networkName;
  // if (bid.ext.advertiserName) br.meta.advertiserName = bid.ext.advertiserName;
  // if (bid.ext.agencyName) br.meta.agencyName = bid.ext.agencyName;
  // if (bid.ext.brandName) br.meta.brandName = bid.ext.brandName;
  if (bid.ext && bid.ext.dchain) {
    br.meta.dchain = bid.ext.dchain;
  }

  const advid = seat || (bid.ext && bid.ext.advid);
  if (advid) {
    br.meta.advertiserId = advid;
    br.meta.agencyId = advid;
    br.meta.buyerId = advid;
  }

  if (bid.adomain && isNonEmptyArray(bid.adomain)) {
    br.meta.advertiserDomains = bid.adomain;
    br.meta.clickUrl = bid.adomain[0];
    br.meta.brandId = bid.adomain[0];
  }

  if (bid.cat && isNonEmptyArray(bid.cat)) {
    br.meta.secondaryCatIds = bid.cat;
    br.meta.primaryCatId = bid.cat[0];
  }

  if (bid.ext && bid.ext.dsa && Object.keys(bid.ext.dsa).length) {
    br.meta.dsa = bid.ext.dsa;
  }
}

/**
 * returns, boolean value according to translator get request is enabled
 * and random value should be less than or equal to testGroupPercentage
 * @returns boolean
 */

// function getUniqueNumber(rangeEnd) {
//   return Math.floor(Math.random() * rangeEnd) + 1;
// }

export const spec = {
  code: BIDDER_CODE,
  gvlid: 76,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  aliases: [PUBMATIC_ALIAS],

  isBidRequestValid: bid => {
    if (bid && bid.params) {
      if (!isStr(bid.params.publisherId)) {
        logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be numeric (wrap it in quotes in your config). Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
        return false;
      }
      // video ad validation
      if (FEATURES.VIDEO && bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
        // bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array
        let mediaTypesVideoMimes = deepAccess(bid.mediaTypes, 'video.mimes');
        let paramsVideoMimes = deepAccess(bid, 'params.video.mimes');
        if (isNonEmptyArray(mediaTypesVideoMimes) === false && isNonEmptyArray(paramsVideoMimes) === false) {
          logWarn(LOG_WARN_PREFIX + 'Error: For video ads, bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array. Call to OpenBid will not be sent for ad unit:' + JSON.stringify(bid));
          return false;
        }

        if (!bid.mediaTypes[VIDEO].hasOwnProperty('context')) {
          logError(`${LOG_WARN_PREFIX}: no context specified in bid. Rejecting bid: `, bid);
          return false;
        }

        if (bid.mediaTypes[VIDEO].context === 'outstream' &&
          !isStr(bid.params.outstreamAU) &&
          !bid.hasOwnProperty('renderer') &&
          !bid.mediaTypes[VIDEO].hasOwnProperty('renderer')) {
          // we are here since outstream ad-unit is provided without outstreamAU and renderer
          // so it is not a valid video ad-unit
          // but it may be valid banner or native ad-unit
          // so if mediaType banner or Native is present then  we will remove media-type video and return true

          if (bid.mediaTypes.hasOwnProperty(BANNER) || bid.mediaTypes.hasOwnProperty(NATIVE)) {
            delete bid.mediaTypes[VIDEO];
            logWarn(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting mediatype Video of bid: `, bid);
            return true;
          } else {
            logError(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting bid: `, bid);
            return false;
          }
        }
      }
      return true;
    }
    return false;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {

	const data = converter.toORTB({ validBidRequests, bidderRequest });

    // convert Native ORTB definition to old-style prebid native definition
    // validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let serverRequest = {
      method: 'POST',
      url: ENDPOINT + '?source=ow-client',
      data: data,
      bidderRequest: bidderRequest
    };

    return serverRequest;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} response A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (response, request) => {
    const bids = converter.fromORTB({response: response.body, request: request.data}).bids;
    return bids;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent) => {
    let syncurl = '' + publisherId;

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    // CCPA
    if (uspConsent) {
      syncurl += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    // GPP Consent
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      syncurl += '&gpp=' + encodeURIComponent(gppConsent.gppString);
      syncurl += '&gpp_sid=' + encodeURIComponent(gppConsent?.applicableSections?.join(','));
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      syncurl += '&coppa=1';
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL_IFRAME + syncurl
      }];
    } else {
      return [{
        type: 'image',
        url: USER_SYNC_URL_IMAGE + syncurl
      }];
    }
  }
};

registerBidder(spec);
