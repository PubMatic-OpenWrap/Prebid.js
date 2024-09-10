import { logWarn, isStr, isArray, deepAccess, deepSetValue, isBoolean, isInteger, logInfo, logError, deepClone, uniques, generateUUID } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE, ADPOD } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { bidderSettings } from '../src/bidderSettings.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {NATIVE_ASSET_TYPES, NATIVE_IMAGE_TYPES, PREBID_NATIVE_DATA_KEYS_TO_ORTB, NATIVE_KEYS_THAT_ARE_NOT_ASSETS, NATIVE_KEYS} from '../src/constants.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

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
const PUBLICATION = 'pubmatic'; // Your publication on Blue Billywig, potentially with environment (e.g. publication.bbvms.com or publication.test.bbvms.com)
const RENDERER_URL = 'https://pubmatic.bbvms.com/r/'.concat('$RENDERER', '.js'); // URL of the renderer application
const MSG_VIDEO_PLCMT_MISSING = 'Video.plcmt param missing';
const PREBID_NATIVE_DATA_KEY_VALUES = Object.values(PREBID_NATIVE_DATA_KEYS_TO_ORTB);
const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '' // OpenWrap Wrapper Impression ID
};
const NET_REVENUE = true;
const dealChannel = {
  1: 'PMP',
  5: 'PREF',
  6: 'PMPG'
};

let conf = {};
let blockedIabCategories = []; 
let allowedIabCategories = [];
let pubId = 0;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  imp(buildImp, bidRequest, context) {
    const { kadfloor, currency, adSlot, deals, dctr, pmzoneid, hashedKey } = bidRequest.params;
    const { adUnitCode, mediaTypes } = bidRequest;
    const imp = buildImp(bidRequest, context);
    if (deals) addPMPDeals(imp, deals);
    if (dctr) addDealCustomTargetings(imp, dctr);
    if (imp.hasOwnProperty('banner')) updateBannerImp(imp.banner);
    if (imp.hasOwnProperty('video')) updateVideoImp(imp.video, mediaTypes?.video, adUnitCode);
    if (imp.hasOwnProperty('native')) updateNativeImp(imp, mediaTypes?.native);
    if (pmzoneid) imp.ext.pmZoneId = pmzoneid;
    imp.bidfloor = _parseSlotParam('kadfloor', kadfloor),
    imp.bidfloorcur = currency ? _parseSlotParam('currency', currency) : DEFAULT_CURRENCY;
    setFloorInImp(imp, bidRequest);
    setImpTagId(imp, adSlot.trim(), hashedKey);
    setImpFields(imp);
    // Deleting igs & pappi object to pass sanity
    if (imp.ext?.igs) delete imp.ext.igs;
    if (imp.ext?.paapi) delete imp.ext.paapi;
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    if (blockedIabCategories.length || request.bcat) {
	  const validatedBCategories = validateBlockedCategories([...(blockedIabCategories || []), ...(request.bcat || [])]);
      if (validatedBCategories.length) request.bcat = validatedBCategories;
    }
    if (allowedIabCategories.length || request.acat) {
	  const validatedACategories = validateAllowedCategories([...(allowedIabCategories || []), ...(request.acat || [])]);
      if (validatedACategories.length) request.acat = validatedACategories;
    }
    reqLevelParams(request);
    updateUserSiteDevice(request);
    addExtenstionParams(request);
    const marketPlaceEnabled = bidderRequest?.bidderCode
  		? bidderSettings.get(bidderRequest.bidderCode, 'allowAlternateBidderCodes') : undefined;
    if (marketPlaceEnabled) updateRequestExt(request, bidderRequest);
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    updateResponseWithCustomFields(bidResponse, bid, context);
    const { mediaType, playerWidth, playerHeight } = bidResponse;
    const { params, adUnitCode, mediaTypes } = context?.bidRequest;
    if (mediaType === VIDEO) {
      if (!bidResponse.width) bidResponse.width = playerWidth;
      if (!bidResponse.height) bidResponse.height = playerHeight;
      const { context, maxduration } = mediaTypes[mediaType];
      if (context === 'outstream' && params.outstreamAU && adUnitCode) {
        bidResponse.rendererCode = params.outstreamAU;
        bidResponse.renderer = BB_RENDERER.newRenderer(bidResponse.rendererCode, adUnitCode);
      }
      assignDealTier(bidResponse, context, maxduration);
    }
    if (mediaType === NATIVE && bid.adm) {
      try {
        const adm = JSON.parse(bid.adm.replace(/\\/g, ''));
        bidResponse.native = { ortb: { ...adm.native } };
      } catch (ex) {
        logWarn(`${LOG_WARN_PREFIX}Error: Cannot parse native response for ad response: ${newBid.adm}`);
        return;
      }
      bidResponse.width = bid.w || DEFAULT_WIDTH;
      bidResponse.height = bid.h || DEFAULT_HEIGHT;
    }
    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    // Adding a zero bid for each no-bid
    const { imp, site } = context?.ortbRequest;
    const impIds = imp.map(impObj => impObj.id);
    const responseIds = bidResponses.map(response => response.requestId);
    const noBidImps = impIds.filter(id => !responseIds.includes(id));
    noBidImps.forEach(noBidImp => {
      bidResponses.push({
        requestId: noBidImp,
        width: 0,
        height: 0,
        ttl: 300,
        ad: '',
        creativeId: 0,
        netRevenue: NET_REVENUE,
        cpm: 0,
        currency: ortbResponse.cur || DEFAULT_CURRENCY,
        referrer: site?.ref || ''
      })
    })
    return buildResponse(bidResponses, ortbResponse, context);
  },
  overrides: {
    imp: {
      bidfloor: false
    },
    bidResponse: {
      native: false
    }
  }
});

const handleImageProperties = asset => {
  const imgProps = {};
  if (asset.aspect_ratios && isArray(asset.aspect_ratios) && asset.aspect_ratios.length) {
	  const { min_width: minWidth, min_height: minHeight } = asset.aspect_ratios[0];
	  if (isInteger(minWidth) && isInteger(minHeight)) {
      imgProps.wmin = minWidth;
      imgProps.hmin = minHeight;
	  }
	  imgProps.ext = { aspectratios: asset.aspect_ratios.filter(({ ratio_width, ratio_height }) => ratio_width && ratio_height).map(({ ratio_width, ratio_height }) => `${ratio_width}:${ratio_height}`) };
  }
  imgProps.w = asset.w || asset.width;
  imgProps.h = asset.h || asset.height;
  if (asset.sizes && asset.sizes.length === 2 && isInteger(asset.sizes[0]) && isInteger(asset.sizes[1])) {
	  imgProps.w = asset.sizes[0];
	  imgProps.h = asset.sizes[1];
	  delete imgProps.wmin;
	  delete imgProps.hmin;
  }
  asset.ext && (imgProps.ext = asset.ext);
  asset.mimes && (imgProps.mimes = asset.mimes);
  return imgProps;
}

const toOrtbNativeRequest = legacyNativeAssets => {
  const ortb = { ver: '1.2', assets: [] };
  	for (let key in legacyNativeAssets) {
    if (NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key)) continue;
    if (!NATIVE_KEYS.hasOwnProperty(key) && !PREBID_NATIVE_DATA_KEY_VALUES.includes(key)) {
      logWarn(`${LOG_WARN_PREFIX}: Unrecognized asset: ${key}. Ignored.`);
      continue;
    }

    const asset = legacyNativeAssets[key];
    const required = asset.required && isBoolean(asset.required) ? 1 : 0;
    const ortbAsset = { id: ortb.assets.length, required };

    if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
      ortbAsset.data = { type: NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]], ...asset.len && { len: asset.len }, ...asset.ext && { ext: asset.ext } };
    } else if (key === 'icon' || key === 'image') {
      ortbAsset.img = {
        type: key === 'icon' ? NATIVE_IMAGE_TYPES.ICON : NATIVE_IMAGE_TYPES.MAIN,
        ...handleImageProperties(asset)
      };
    } else if (key === 'title') {
      ortbAsset.title = { len: asset.len || 140, ...asset.ext && { ext: asset.ext } };
    } else if (key === 'ext') {
      ortbAsset.ext = asset;
      delete ortbAsset.required;
    }
    ortb.assets.push(ortbAsset);
  	}
  	return ortb;
}

const setImpFields = imp => {
  imp.secure = 1;
  imp.displaymanager ||= 'Prebid.js';
  imp.displaymanagerver ||= '$prebid.version$';
  const gptAdSlot = imp.ext?.data?.adserver?.adslot;
  if (gptAdSlot) imp.ext.dfp_ad_unit_code = gptAdSlot;
  // Delete ext.data in case of no-adserver
  if (imp.ext?.data && Object.keys(imp.ext.data).length === 0) delete imp.ext.data
}

const setFloorInImp = (imp, bid) => {
  let bidFloor = -1;
  if (typeof bid.getFloor === 'function' && !config.getConfig('pubmatic.disableFloors')) {
    [BANNER, VIDEO, NATIVE].forEach(mediaType => {
      if (!imp.hasOwnProperty(mediaType)) return;

      const sizes = (mediaType === 'banner'
        ? imp[mediaType]?.format?.map(({ w, h }) => [w, h])
        : ['*']) || ['*'];

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

const updateBannerImp = (bannerObj) => {
  const primarySize = bannerObj.format.shift();
  if (bannerObj.format && bannerObj.format.length === 0) delete bannerObj.format;
  bannerObj.w = primarySize.w;
  bannerObj.h = primarySize.h;
  bannerObj.pos = 0;
}

const setImpTagId = (imp, adSlot, hashedKey) => {
  const splits = adSlot.split(':')[0].split('@');
  imp.tagid = hashedKey || splits[0];
}

const updateNativeImp = (imp, nativeParams) => {
  // Adding ext & mimes to pass sanity starts here
  if (!nativeParams?.ortb) {
    imp.native.request = JSON.stringify(toOrtbNativeRequest(nativeParams));
  }
  // Adding ext & mimes to pass sanity ends here
  // delete native.ver to pass sanity
  if (imp.native?.ver) delete imp.native.ver;
  if (nativeParams?.ortb) {
    let nativeConfig = JSON.parse(imp.native.request);
    const { assets } = nativeConfig;
    if (!assets?.some(asset => asset.title || asset.img || asset.data || asset.video)) {
      logWarn(`${LOG_WARN_PREFIX}: Native assets object is empty or contains invalid objects`);
      delete imp.native;
    } else {
      imp.native.request = JSON.stringify({ ver: '1.2', ...nativeConfig });
    }
  }
}

const updateVideoImp = (videoImp, videoParams, adUnitCode) => {
  if (!deepAccess(videoParams, 'plcmt')) {
    logWarn(MSG_VIDEO_PLCMT_MISSING + ' for ' + adUnitCode);
  };
  if (!videoParams || (!videoImp.w && !videoImp.h)) {
    videoImp = UNDEFINED;
    logWarn(`${LOG_WARN_PREFIX}Error: Missing ${!videoParams ? 'video config params' : 'video size params (playersize or w&h)'} for adunit: ${adUnitCode} with mediaType set as video. Ignoring video impression in the adunit.`);
    return;
  }
  if (!videoImp.battr) {
    videoImp.battr = videoParams.battr;
  }
  // Deleting skipafter, skipmin, playbackend, delivery & pos to pass sanity
  if (videoImp.skipafter) delete videoImp.skipafter;
  if (videoImp.skipmin) delete videoImp.skipmin;
  if (videoImp.playbackend) delete videoImp.playbackend;
  if (videoImp.delivery) delete videoImp.delivery;
  if (videoImp.pos) delete videoImp.pos;
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

const updateRequestExt = (req, bidderRequest) => {
  const allBiddersList = ['all'];
  let allowedBiddersList = bidderSettings.get(bidderRequest.bidderCode, 'allowedAlternateBidderCodes');
  const biddersList = isArray(allowedBiddersList)
    ? allowedBiddersList.map(val => val.trim().toLowerCase()).filter(uniques)
    : allBiddersList;
  req.ext.marketplace = {
    allowedbidders: biddersList.includes('*') ? allBiddersList : ['pubmatic', ...biddersList],
  }
}

const reqLevelParams = (req) => {
  deepSetValue(req, 'at', AUCTION_TYPE);
  deepSetValue(req, 'cur', [DEFAULT_CURRENCY]);
  req.test = window.location.href.includes('pubmaticTest=true') ? 1 : undefined;
  if (req.source && !Object.keys(req.source).length) delete req.source;
};

const updateUserSiteDevice = (req) => {
  const { gender, yob, pubId, refURL } = conf;
  const { user } = req;
  if (req.device) Object.assign(req.device, { js: 1, connectiontype: getConnectionType() });
  req.user = {
    ...req.user,
    gender: user?.gender || gender?.trim() || UNDEFINED,
    yob: user?.yob || _parseSlotParam('yob', yob)
  };
  // Deleting user.ext to pass sanity
  if (req.user?.ext?.eids) {
    const { eids } = req.user.ext;
    const hasMoreProps = Object.keys(req.user.ext).length > 1;
    req.user.eids = eids;
    hasMoreProps ? delete req.user.ext.eids : delete req.user.ext;
  }

  // Deleting device.ext to pass sanity
  delete req.device.ext;
  // adding geo if its empty need to check with QA and delete if not required to pass sanity
  req.user.geo ||= {};
  if (req.site?.publisher) {
    req.site.ref = req.site.ref || refURL;
    req.site.publisher.id = pubId;
  }
}

const updateResponseWithCustomFields = (res, bid, ctx) => {
  const { ortbRequest, seatbid } = ctx;
  res.referrer = ortbRequest.site.ref || '';
  res.sspID = res.partnerImpId = bid.id || '';
  res.ad = bid.adm;
  res.pm_dspid = bid.ext?.dspid ? bid.ext.dspid : null;
  res.pm_seat = seatbid.seat;
  if (!res.creativeId) res.creativeId = bid.id;
  if (bid.dealid) {
    res.dealChannel = bid.ext?.deal_channel ? dealChannel[bid.ext.deal_channel] || null : 'PMP';
  }
  if (seatbid.ext?.buyid) {
    res.adserverTargeting = { 'hb_buyid_pubmatic': seatbid.ext.buyid }
  }
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
  const { profId, verId, wiid, transactionId } = conf;
  req.ext = {
    epoch: new Date().getTime(), // Sending epoch timestamp in request.ext object
    wrapper: {
      profile: parseInt(profId),
      version: parseInt(verId),
      wiid: wiid,
      wv: $$REPO_AND_VERSION$$,
      transactionId,
      wp: 'pbjs'
    }
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

const validateAllowedCategories = (acat) => {
	return [...new Set(
	  acat
		.filter(item => {
		  if (typeof item === 'string') {
			return true;
		  } else {
			logWarn(LOG_WARN_PREFIX + 'acat: Each category should be a string, ignoring category: ' + item);
		  }
		})
		.map(item => item.trim())
	)];
};

const validateBlockedCategories = (bcats) => {
  bcats = bcats.map(item => typeof item === 'string' ? item.trim() : item);
  const droppedCategories = bcats.filter(item => typeof item !== 'string' || item.length < 3);
  logWarn(LOG_WARN_PREFIX + 'bcat: Each category must be a string with a length greater than 3, ignoring ' + droppedCategories);
  return [...new Set(bcats.filter(item => typeof item === 'string' && item.length >= 3))];
}

const getConnectionType = () => {
  let connection = window.navigator && (window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection);
  const types = { ethernet: 1, wifi: 2, 'slow-2g': 4, '2g': 4, '3g': 5, '4g': 6 };
  	return types[connection?.effectiveType] || 0;
}

// BB stands for Blue BillyWig
const BB_RENDERER = {
  bootstrapPlayer: function(bid) {
    const config = {
      code: bid.adUnitCode,
      vastXml: bid.vastXml || null,
      vastUrl: bid.vastUrl || null,
    };

    if (!config.vastXml && !config.vastUrl) {
      logWarn(`${LOG_WARN_PREFIX}: No vastXml or vastUrl on bid, bailing...`);
      return;
    }

    const rendererId = BB_RENDERER.getRendererId(PUBLICATION, bid.rendererCode);
    const ele = document.getElementById(bid.adUnitCode); // NB convention

    const renderer = window.bluebillywig.renderers.find(r => r._id === rendererId);
    if (renderer) renderer.bootstrap(config, ele);
    else logWarn(`${LOG_WARN_PREFIX}: Couldn't find a renderer with ${rendererId}`);
  },

  newRenderer: function(rendererCode, adUnitCode) {
    const rendererUrl = RENDERER_URL.replace('$RENDERER', rendererCode);
    const renderer = Renderer.install({ url: rendererUrl, loaded: false, adUnitCode });
    try {
      renderer.setRender(BB_RENDERER.outstreamRender);
    } catch (err) {
      logWarn(`${LOG_WARN_PREFIX}: Error tying to setRender on renderer`, err);
    }
    return renderer;
  },

  outstreamRender: function(bid) {
    bid.renderer.push(() => BB_RENDERER.bootstrapPlayer(bid));
  },

  getRendererId: function(pub, renderer) {
    return `${pub}-${renderer}`; // NB convention!
  }
};

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
    if (!(bid && bid.params)) return false;
    const { publisherId, video } = bid.params;
    const mediaTypes = bid.mediaTypes || {};
    const videoMediaTypes = mediaTypes[VIDEO] || {};
    if (!isStr(publisherId)) {
      logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be numeric (wrap it in quotes in your config). Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
      return false;
    }

    if (FEATURES.VIDEO && mediaTypes.hasOwnProperty(VIDEO)) {
      // bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array
      const mediaTypesVideoMimes = deepAccess(bid, 'mediaTypes.video.mimes');
      const paramsVideoMimes = deepAccess(bid, 'params.video.mimes');

      if (!isNonEmptyArray(mediaTypesVideoMimes) && !isNonEmptyArray(paramsVideoMimes)) {
        logWarn(LOG_WARN_PREFIX + 'Error: For video ads, bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array. Call to OpenBid will not be sent for ad unit:' + JSON.stringify(bid));
        return false;
      }
      if (!videoMediaTypes.context) {
        logError(`${LOG_WARN_PREFIX}: No context specified in bid. Rejecting bid: `, bid);
        return false;
      }
      if (videoMediaTypes.context === 'outstream' && !isStr(bid.params.outstreamAU) &&
        !bid.renderer && !videoMediaTypes.renderer) {
        if (mediaTypes.hasOwnProperty(BANNER) || mediaTypes.hasOwnProperty(NATIVE)) {
          delete mediaTypes[VIDEO];
          logWarn(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting mediatype Video of bid: `, bid);
          return true;
        }
        logError(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting bid: `, bid);
      		return false;
      }
    }
    return true;
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
    pubId = publisherId;
    const wiid = generateUUID();
	let bid;
	blockedIabCategories = [];
	allowedIabCategories = [];
    conf = {
      pageURL: page || window.location.href,
      refURL: ref || window.document.referrer,
      pubId: publisherId,
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
      if (bcat) {
        blockedIabCategories = blockedIabCategories.concat(bcat);
      }
      if (acat) {
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
    const { bids } = converter.fromORTB({ response: response.body, request: request.data });
    const fledgeAuctionConfigs = deepAccess(response.body, 'ext.fledge_auction_configs');
    if (fledgeAuctionConfigs) {
      return {
		  bids,
		  paapi: Object.entries(fledgeAuctionConfigs).map(([bidId, cfg]) => ({
          bidId,
          config: { auctionSignals: {}, ...cfg }
		  }))
      };
    }
    return bids;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent) => {
    let syncurl = pubId;

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
	  syncurl += `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`;
    }

    // CCPA
    if (uspConsent) {
      syncurl += `&us_privacy=${encodeURIComponent(uspConsent)}`;
    }

    // GPP Consent
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
	  syncurl += `&gpp=${encodeURIComponent(gppConsent.gppString)}&gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`;
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      syncurl += '&coppa=1';
    }

    const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
    const url = (type === 'iframe' ? USER_SYNC_URL_IFRAME : USER_SYNC_URL_IMAGE) + syncurl;
    return [{ type, url }];
  }
};

registerBidder(spec);
