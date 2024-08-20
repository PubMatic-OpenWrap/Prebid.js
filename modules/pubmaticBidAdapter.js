import { getBidRequest, logWarn, isBoolean, isStr, isArray, inIframe, mergeDeep, deepAccess, isNumber, deepSetValue, logInfo, logError, deepClone, uniques, isPlainObject, isInteger, parseQueryStringParameters, generateUUID } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE, ADPOD } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { bidderSettings } from '../src/bidderSettings.js';
import { NATIVE_IMAGE_TYPES, NATIVE_KEYS_THAT_ARE_NOT_ASSETS, NATIVE_KEYS, NATIVE_ASSET_TYPES } from '../src/constants.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

let conf = {};
let blockedIabCategories = allowedIabCategories = [];

const converter = ortbConverter({
	context: {
        netRevenue: true,
        ttl: 300
    },
	imp(buildImp, bidRequest, context) {
		const { kadfloor, currency, adSlot, deals, dctr } = bidRequest.params;
		const { adUnitCode, mediaType } = bidRequest;
		const imp = buildImp(bidRequest, context);
		if (deals) addPMPDeals(imp, deals);
		if (dctr) addDealCustomTargetings(imp, dctr);
		imp.bidfloor = _parseSlotParam('kadfloor', kadfloor),
		imp.bidfloorcur = currency ? _parseSlotParam('currency', currency) : DEFAULT_CURRENCY;
		setFloorInImp(imp, bidRequest);
		if (imp.hasOwnProperty('banner')) updateBannerImp(imp.banner);
		if (imp.hasOwnProperty('video')) updateVideoImp(imp.video, mediaType?.video, adUnitCode);
		if (imp.hasOwnProperty('native')) updateNativeImp(imp, mediaType?.native);
		setImpTagId(imp, adSlot);
		imp.secure = 1;
		imp.pos = 0;
		imp.displaymanager = 'Prebid.js',
    	imp.displaymanagerver = '$prebid.version$'
		return imp;
	},
	request(buildRequest, imps, bidderRequest, context) {
		const request = buildRequest(imps, bidderRequest, context);
		if (blockedIabCategories.length || request.bcat) {
			request.bcat = validateBlockedCategories([...blockedIabCategories, ...request.bcat]);
		}
		if (allowedIabCategories.length || request.acat) {
			request.bcat = validateAllowedCategories([...allowedIabCategories, ...request.acat]);
		}
		reqLevelParams(request);
		updateUserSiteDevice(request);
		addExtenstionParams(request);
		return request;
	},
	bidResponse(buildBidResponse, bid, context) {
		const bidResponse = buildBidResponse(bid, context);
		updateResponseWithCustomFields(bidResponse, bid, context);
		const { mediaType } = bidResponse;
		const { params, adUnitCode, mediaTypes } = context?.bidRequest;
		if (mediaType === VIDEO) {
			const { context, maxduration } = mediaTypes[mediaType];
			if (context === 'outstream' && params.outstreamAU && adUnitCode) {
				bidResponse.rendererCode = params.outstreamAU;
				bidResponse.renderer = BB_RENDERER.newRenderer(bidResponse.rendererCode, adUnitCode);
			}
			assignDealTier(bidResponse, context, maxduration);
		}
		return bidResponse;
	},
	overrides: {
		imp: {
			bidfloor: false
		}
	}
});

const updateNativeImp = (imp, nativeParams) => {
	if (!nativeParams.ortb) {
		
	} else {
		let nativeConfig = JSON.parse(imp.native.request);
		const { assets } = nativeConfig;
		const isValidAsset = asset => asset.title || asset.img || asset.data || asset.video;
		if (!assets?.length || !assets.some(isValidAsset)) {
			logWarn(`${LOG_WARN_PREFIX}: Native assets object is empty or contains invalid objects`);
			delete imp.native;
			return;
		}
		imp.native.request = JSON.stringify({ ver: '1.2', nativeConfig});
	}	
}

const updateVideoImp = (videoImp, videoParams, adUnitCode) => {
	if (!videoParams || (!videoImp.w && !videoImp.h)) {
        videoImp = UNDEFINED;
        logWarn(`${LOG_WARN_PREFIX}Error: Missing ${!videoParams ? 'video config params' : 'video size params (playersize or w&h)'} for adunit: ${adUnitCode} with mediaType set as video. Ignoring video impression in the adunit.`);
        return;
    }
    
    if (!videoImp.battr) {
        videoImp.battr = videoParams.battr;
    }
}

/**
 * In case of adpod video context, assign prebiddealpriority to the dealtier property of adpod-video bid,
 * so that adpod module can set the hb_pb_cat_dur targetting key.
 * @param {*} bid
 * @param {*} context
 * @param {*} maxduration
 * @returns
 */
const assignDealTier = (bid, context, maxduration) => {
	if (!bid?.ext?.prebiddealpriority || !FEATURES.VIDEO) return;
	if (context != ADPOD) return;
  
	const duration = bid?.ext?.video?.duration || maxduration;
	// if (!duration) return;
	bid.video = {
	  context: ADPOD,
	  durationSeconds: duration,
	  dealTier: bid.ext.prebiddealpriority
	};
}

const setFloorInImp = (imp, bid) => {
	let bidFloor = -1;
	if (typeof bid.getFloor === 'function' && !config.getConfig('pubmatic.disableFloors')) {
		[BANNER, VIDEO, NATIVE].forEach(mediaType => {
			if (!imp.hasOwnProperty(mediaType)) return;

			const sizes = mediaType === 'banner' 
				? imp[mediaType]?.format.map(({ w, h }) => [w, h]) 
				: ['*'];
	
			sizes.forEach(size => {
				const floorInfo = bid.getFloor({ currency: imp.bidfloorcur, mediaType, size });
				logInfo(LOG_WARN_PREFIX, 'floor from floor module returned for mediatype:', mediaType, ' and size:', size, ' is: currency', floorInfo.currency, 'floor', floorInfo.floor);
			
				if (floorInfo?.currency === imp.bidfloorcur && !isNaN(parseInt(floorInfo.floor))) {
					const mediaTypeFloor = parseFloat(floorInfo.floor);
					logInfo(LOG_WARN_PREFIX, 'floor from floor module:', mediaTypeFloor, 'previous floor value', bidFloor, 'Min:', Math.min(mediaTypeFloor, bidFloor));
					bidFloor = bidFloor === -1 ? mediaTypeFloor : Math.min(mediaTypeFloor, bidFloor);
					logInfo(LOG_WARN_PREFIX, 'new floor value:', bidFloor);
				}
			});
		});
	}
	// Determine the highest value between imp.bidfloor and the floor from the floor module.
	// Since we're using Math.max, it's safe if no floor is returned from the floor module, as bidFloor defaults to -1.
	if (imp.bidfloor) {
		logInfo(LOG_WARN_PREFIX, 'Comparing floors:', 'from floor module:', bidFloor, 'impObj.bidfloor:', imp.bidfloor, 'Max:', Math.max(bidFloor, imp.bidfloor));
		bidFloor = Math.max(bidFloor, imp.bidfloor);
	}
	
	// Set imp.bidfloor only if bidFloor is greater than 0.
	imp.bidfloor = (bidFloor > 0) ? bidFloor : UNDEFINED;
	logInfo(LOG_WARN_PREFIX, 'Updated imp.bidfloor:', imp.bidfloor);
}

const addDealCustomTargetings = (imp, dctr) => {
	if (isStr(dctr) && dctr.length > 0) {
		const arr = dctr.split('|').filter(val => val.trim().length > 0);
		dctr = arr.map(val => val.trim()).join('|');
		imp.ext['key_val'] = dctr;
	} else {
      logWarn(LOG_WARN_PREFIX + 'Ignoring param : dctr with value : ' + dctr + ', expects string-value, found empty or non-string value');
    }
}

const addPMPDeals = (imp, deals) => {
	if (!isArray(deals)) {
		logWarn(`${LOG_WARN_PREFIX}Error: bid.params.deals should be an array of strings.`);
		return;
	}
	deals.forEach(deal => {
		if (typeof deal === 'string' && deal.length > 3) {
		  if (!imp.pmp) {
			imp.pmp = { private_auction: 0, deals: [] };
		  }
		  imp.pmp.deals.push({ id: deal });
		} else {
		  logWarn(`${LOG_WARN_PREFIX}Error: deal-id present in array bid.params.deals should be a string with more than 3 characters length, deal-id ignored: ${dealId}`);
		}
	});
}

const validateAllowedCategories = (acat) => {
	return acat
    .filter(item => {
		if (typeof item === 'string') {
			return true;
		} else {
			logWarn(LOG_WARN_PREFIX + 'acat: Each category should be a string, ignoring category: ' + item);
		}
	})
    .map(item => item.trim());
}

const validateBlockedCategories = (bcats) => {
  const droppedCategories = bcats.filter(item => typeof item !== 'string' || item.length < 3);
  logWarn(LOG_WARN_PREFIX + 'bcat: Each category must be a string with a length greater than 3, ignoring' + droppedCategories); 
  return [...new Set(bcats.filter(item => typeof item === 'string' && item.length >= 3))];
}

const updateBannerImp = (bannerObj) => {
	const primarySize = bannerObj.format.shift(); 
	bannerObj.w = primarySize.w;
	bannerObj.h = primarySize.h;
}

const setImpTagId = (imp, adSlot) => {
	const splits = adSlot.split(':')[0].split('@');
    imp.tagid = splits[0];
}

const reqLevelParams = (req) => {
	deepSetValue(req, 'at', AUCTION_TYPE);
	deepSetValue(req, 'cur', [DEFAULT_CURRENCY]);
};
  
const updateUserSiteDevice = (req) => {
	const { gender, yob, pubId } = conf;
	if (req.device) {
		req.device.js = 1;
		req.device.connectiontype = getConnectionType();
	}
	req.user = {
		gender: gender ? gender.trim() : UNDEFINED,
		yob: _parseSlotParam('yob', yob),
	}
	req.site.publisher.id = pubId;
}

const updateResponseWithCustomFields = (res, bid, ctx) => {
	const { ortbRequest, seatbid } = ctx;
	res.referrer = ortbRequest.site.ref || "";
	res.sspID = res.partnerImpId = bid.id || "";
	res.ad = bid.adm;
	res.pm_dspid = bid.ext?.dspid ? bid.ext.dspid : null;
	res.pm_seat = seatbid.seat;
	if (bid.dealid) {
		res.dealChannel = bid.ext?.deal_channel ? dealChannel[bid.ext.deal_channel] || null : 'PMP';
	}

	if (seatbid.ext?.buyid) {
		res.adserverTargeting = { "hb_buyid_pubmatic": seatbid.ext.buyid }
	}

	// If `bid.ext.marketplace` is set in the server response,
	// submit the bid to Prebid using the marketplace name.
	if (bid.ext?.marketplace) {
		res.bidderCode = bid.ext.marketplace;
	}

	// add meta fields
	// NOTE: We will not recieve below fields from the translator response also not sure on what will be the key names for these in the response,
	// when we needed we can add it back.
	// New fields added, assignee fields name may change
	// if (bid.ext.networkName) res.meta.networkName = bid.ext.networkName;
	// if (bid.ext.advertiserName) res.meta.advertiserName = bid.ext.advertiserName;
	// if (bid.ext.agencyName) res.meta.agencyName = bid.ext.agencyName;
	// if (bid.ext.brandName) res.meta.brandName = bid.ext.brandName;
	if (bid.ext) {
		const { dspid, dchain, advid: extAdvid, dsa } = bid.ext;
		if (dspid) res.meta.networkId = res.meta.demandSource = dspid;
		if (dchain) res.meta.dchain = dchain;
		if (dsa && Object.keys(dsa).length) res.meta.dsa = dsa;
	}
	
	const advid = seatbid.seat || bid.ext?.advid;
	if (advid) res.meta.advertiserId = res.meta.agencyId = res.meta.buyerId = advid;
	
	if (isNonEmptyArray(bid.adomain)) {
	res.meta.clickUrl = res.meta.brandId = bid.adomain[0];
	}
	
	if (isNonEmptyArray(bid.cat)) {
	res.meta.secondaryCatIds = bid.cat;
	res.meta.primaryCatId = bid.cat[0];
	}
}

const addExtenstionParams = (req) => {
	const { profId, verId, wiid } = conf;
	req.ext = {
		epoch: new Date().getTime(), // Sending epoch timestamp in request.ext object
		wrapper: {
			profile: parseInt(profId),
			version: parseInt(verId),
			wiid: wiid,
			wv: $$REPO_AND_VERSION$$,
			transactionId: '',
			wp: 'pbjs'
		}
	}
}

const getConnectionType = () => {
	let connection = window.navigator && (window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection);
	const types = { ethernet: 1, wifi: 2, 'slow-2g': 4, '2g': 4, '3g': 5, '4g': 6 };
  	return types[connection?.effectiveType] || 0;
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
const MSG_VIDEO_PLCMT_MISSING = 'Video.plcmt param missing';

const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url	
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '' // OpenWrap Wrapper Impression ID
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

const NATIVE_ASSET_IMAGE_TYPE = {
  'ICON': 1,
  'IMAGE': 3
}

const NET_REVENUE = true;
const dealChannel = {
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

  const parsers = {
    pmzoneid: () => paramValue.split(',').slice(0, 50).map(id => id.trim()).join(),
    kadfloor: () => parseFloat(paramValue),
    lat: () => parseFloat(paramValue),
    lon: () => parseFloat(paramValue),
    yob: () => parseInt(paramValue)
  };
  return parsers[paramName]?.() || paramValue;
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

function _createOrtbTemplate(conf) {
  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ua: navigator.userAgent,
      js: 1,
      dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: navigator.language,
      connectiontype: getDeviceConnectionType()
    },
    user: {},
    ext: {}
  };
}

function _checkParamDataType(key, value, datatype) {
  var errMsg = 'Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  var functionToExecute;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      functionToExecute = isBoolean;
      break;
    case DATA_TYPES.NUMBER:
      functionToExecute = isNumber;
      break;
    case DATA_TYPES.STRING:
      functionToExecute = isStr;
      break;
    case DATA_TYPES.ARRAY:
      functionToExecute = isArray;
      break;
  }
  if (functionToExecute(value)) {
    return value;
  }
  logWarn(LOG_WARN_PREFIX + errMsg);
  return UNDEFINED;
}

// TODO delete this code when removing native 1.1 support
const PREBID_NATIVE_DATA_KEYS_TO_ORTB = {
  'desc': 'desc',
  'desc2': 'desc2',
  'body': 'desc',
  'body2': 'desc2',
  'sponsoredBy': 'sponsored',
  'cta': 'ctatext',
  'rating': 'rating',
  'address': 'address',
  'downloads': 'downloads',
  'likes': 'likes',
  'phone': 'phone',
  'price': 'price',
  'salePrice': 'saleprice',
  'displayUrl': 'displayurl',
  'saleprice': 'saleprice',
  'displayurl': 'displayurl'
};

const PREBID_NATIVE_DATA_KEY_VALUES = Object.values(PREBID_NATIVE_DATA_KEYS_TO_ORTB);

// TODO remove this function when the support for 1.1 is removed
/**
 * Copy of the function toOrtbNativeRequest from core native.js to handle the title len/length
 * and ext and mimes parameters from legacy assets.
 * @param {object} legacyNativeAssets
 * @returns an OpenRTB format of the same bid request
 */
export function toOrtbNativeRequest(legacyNativeAssets) {
  if (!legacyNativeAssets && !isPlainObject(legacyNativeAssets)) {
    logWarn(`${LOG_WARN_PREFIX}: Native assets object is empty or not an object: ${legacyNativeAssets}`);
    isInvalidNativeRequest = true;
    return;
  }
  const ortb = {
    ver: '1.2',
    assets: []
  };
  for (let key in legacyNativeAssets) {
    // skip conversion for non-asset keys
    if (NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key)) continue;
    if (!NATIVE_KEYS.hasOwnProperty(key) && !PREBID_NATIVE_DATA_KEY_VALUES.includes(key)) {
      logWarn(`${LOG_WARN_PREFIX}: Unrecognized native asset code: ${key}. Asset will be ignored.`);
      continue;
    }

    const asset = legacyNativeAssets[key];
    let required = 0;
    if (asset.required && isBoolean(asset.required)) {
      required = Number(asset.required);
    }
    const ortbAsset = {
      id: ortb.assets.length,
      required
    };
    // data cases
    if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
      ortbAsset.data = {
        type: NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]]
      }
      if (asset.len || asset.length) {
        ortbAsset.data.len = asset.len || asset.length;
      }
      if (asset.ext) {
        ortbAsset.data.ext = asset.ext;
      }
    // icon or image case
    } else if (key === 'icon' || key === 'image') {
      ortbAsset.img = {
        type: key === 'icon' ? NATIVE_IMAGE_TYPES.ICON : NATIVE_IMAGE_TYPES.MAIN,
      }
      // if min_width and min_height are defined in aspect_ratio, they are preferred
      if (asset.aspect_ratios) {
        if (!isArray(asset.aspect_ratios)) {
          logWarn(`${LOG_WARN_PREFIX}: image.aspect_ratios was passed, but it's not a an array: ${asset.aspect_ratios}`);
        } else if (!asset.aspect_ratios.length) {
          logWarn(`${LOG_WARN_PREFIX}: image.aspect_ratios was passed, but it's empty: ${asset.aspect_ratios}`);
        } else {
          const { min_width: minWidth, min_height: minHeight } = asset.aspect_ratios[0];
          if (!isInteger(minWidth) || !isInteger(minHeight)) {
            logWarn(`${LOG_WARN_PREFIX}: image.aspect_ratios min_width or min_height are invalid: ${minWidth}, ${minHeight}`);
          } else {
            ortbAsset.img.wmin = minWidth;
            ortbAsset.img.hmin = minHeight;
          }
          const aspectRatios = asset.aspect_ratios
            .filter((ar) => ar.ratio_width && ar.ratio_height)
            .map(ratio => `${ratio.ratio_width}:${ratio.ratio_height}`);
          if (aspectRatios.length > 0) {
            ortbAsset.img.ext = {
              aspectratios: aspectRatios
            }
          }
        }
      }

      ortbAsset.img.w = asset.w || asset.width;
      ortbAsset.img.h = asset.h || asset.height;
      ortbAsset.img.wmin = asset.wmin || asset.minimumWidth || (asset.minsizes ? asset.minsizes[0] : UNDEFINED);
      ortbAsset.img.hmin = asset.hmin || asset.minimumHeight || (asset.minsizes ? asset.minsizes[1] : UNDEFINED);

      // if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin
      if (asset.sizes) {
        if (asset.sizes.length !== 2 || !isInteger(asset.sizes[0]) || !isInteger(asset.sizes[1])) {
          logWarn(`${LOG_WARN_PREFIX}: image.sizes was passed, but its value is not an array of integers: ${asset.sizes}`);
        } else {
          logInfo(`${LOG_WARN_PREFIX}: if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin`);
          ortbAsset.img.w = asset.sizes[0];
          ortbAsset.img.h = asset.sizes[1];
          delete ortbAsset.img.hmin;
          delete ortbAsset.img.wmin;
        }
      }
      asset.ext && (ortbAsset.img.ext = asset.ext);
      asset.mimes && (ortbAsset.img.mimes = asset.mimes);
    // title case
    } else if (key === 'title') {
      ortbAsset.title = {
        // in openRTB, len is required for titles, while in legacy prebid was not.
        // for this reason, if len is missing in legacy prebid, we're adding a default value of 140.
        len: asset.len || asset.length || 140
      }
      asset.ext && (ortbAsset.title.ext = asset.ext);
    // all extensions to the native bid request are passed as is
    } else if (key === 'ext') {
      ortbAsset.ext = asset;
      // in `ext` case, required field is not needed
      delete ortbAsset.required;
    }
    ortb.assets.push(ortbAsset);
  }

  if (ortb.assets.length < 1) {
    logWarn(`${LOG_WARN_PREFIX}: Could not find any valid asset`);
    isInvalidNativeRequest = true;
    return;
  }

  return ortb;
}

export function checkVideoPlacement(videoData, adUnitCode) {
  // Check for video.placement property. If property is missing display log message.
  if (FEATURES.VIDEO && !deepAccess(videoData, 'plcmt')) {
    logWarn(MSG_VIDEO_PLCMT_MISSING + ' for ' + adUnitCode);
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

const _handleCustomParams = (params, conf) => {
	Object.keys(CUSTOM_PARAMS).forEach(key => {
	  const value = params[key];
	  if (value) {
		if (isStr(value)) {
		  conf[key] = value;
		} else {
		  logWarn(`${LOG_WARN_PREFIX}Ignoring param: ${key} with value: ${CUSTOM_PARAMS[key]}, expects string value, found ${typeof value}`);
		}
	  }
	});
	return conf;
};


export const spec = {
  code: BIDDER_CODE,
  gvlid: 76,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  aliases: [PUBMATIC_ALIAS],
  /**
   * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
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
	const { page, ref } = bidderRequest?.refererInfo;
	const { publisherId, profId, verId } = bidderRequest?.bids[0]?.params;
	const wiid = generateUUID();
	conf = {
		pageURL: page || window.location.href,
		refURL: ref || window.document.referrer,
		pubId : publisherId,
		kadpageurl: page || window.location.href,
		profId: profId,
		verId: verId
	}
	validBidRequests.forEach(originalBid => {
		originalBid.params.wiid = originalBid.params.wiid || bidderRequest.auctionId || wiid;
		bid = deepClone(originalBid);
		_handleCustomParams(bid.params, conf);
		conf.transactionId = bid.ortb2Imp?.ext?.tid;
		const { bcat, acat } = bid.params;
		if(bcat) {
			blockedIabCategories = blockedIabCategories.concat(bcat);
		}
		if(acat) {
			allowedIabCategories = allowedIabCategories.concat(acat);
		}
	})
	const data = converter.toORTB({ validBidRequests, bidderRequest });

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
	console.log('##########', bids);
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
