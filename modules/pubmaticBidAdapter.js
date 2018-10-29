import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes';
const constants = require('src/constants.json');

const BIDDER_CODE = 'pubmatic';
const ENDPOINT = '//hbopenbid.pubmatic.com/translator?source=prebid-client';
const USYNCURL = '//ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=';
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const UNDEFINED = undefined;
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
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER
}
const NATIVE_CUSTOM_PARAMS = {
  'ver': DATA_TYPES.STRING,
  'layout': DATA_TYPES.NUMBER,
  'adUnit': DATA_TYPES.NUMBER,
  'context': DATA_TYPES.NUMBER,
  'contextsubtype': DATA_TYPES.NUMBER,
  'plcmttype': DATA_TYPES.NUMBER,
  'plcmtcnt': DATA_TYPES.NUMBER,
  'seq': DATA_TYPES.NUMBER,
  'assets': DATA_TYPES.ARRAY,
  'ext': DATA_TYPES.OBJECT
}
const NET_REVENUE = false;
const dealChannelValues = {
  1: 'PMP',
  5: 'PREF',
  6: 'PMPG'
};

let publisherId = 0;

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _parseSlotParam(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    paramValue && utils.logWarn('PubMatic: Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
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
  if (utils.isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  return '';
}

function _parseAdSlot(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;
  var sizesArrayExists = (bid.hasOwnProperty('sizes') && utils.isArray(bid.sizes) && bid.sizes.length >= 1);

  bid.params.adSlot = _cleanSlot(bid.params.adSlot);

  var slot = bid.params.adSlot;
  try {
    var splits = slot.split('@');
    // check if size is mentioned in sizes array. in that case do not check for @ in adslot
    slot = splits[0];
    if (splits.length == 2) {
      bid.params.adUnitIndex = splits[1].split(':').length == 2 ? splits[1].split(':')[1] : '0';
      splits = splits[1].split(':')[0].split('x');
      if (splits.length != 2) {
        utils.logWarn('AdSlot Error: adSlot not in required format');
        return;
      }
      bid.params.width = parseInt(splits[0]);
      bid.params.height = parseInt(splits[1]);
      delete bid.sizes;
    } else {
      if (!(sizesArrayExists)) {
        utils.logWarn('AdSlot Error: adSlot not in required format');
        return;
      }
      bid.params.width = parseInt(bid.sizes[0][0]);
      bid.params.height = parseInt(bid.sizes[0][1]);
      bid.params.adUnitIndex = slot.split(':').length > 1 ? slot.split(':')[slot.split(':').length - 1] : '0';
    }
    bid.params.adUnit = slot;
  } catch (e) {
    utils.logWarn('AdSlot Error: adSlot not in required format');
  }
}

function _initConf() {
  var conf = {};
  conf.pageURL = utils.getTopWindowUrl();
  conf.refURL = utils.getTopWindowReferrer();
  return conf;
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

        if (utils.isStr(value)) {
          conf[key] = value;
        } else {
          utils.logWarn('PubMatic: Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
        }
      }
    }
  }
  return conf;
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
      language: navigator.language
    },
    user: {},
    ext: {}
  };
}

// similar functionality as parseSlotParam. Check if the 2 functions can be clubbed.
function _checkParamDataType(key, value, datatype) {
  var errMsg = 'PubMatic: Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      if (!utils.isBoolean(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
    case DATA_TYPES.NUMBER:
      if (!utils.isNumber(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
    case DATA_TYPES.STRING:
      if (!utils.isStr(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
    case DATA_TYPES.ARRAY:
      if (!utils.isArray(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
    case DATA_TYPES.OBJECT:
      if (!utils.isObject(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
  }
}

function _createImpressionObject(bid, conf) {
  var impObj = {};
  var bannerObj = {};
  var videoObj = {};
  var nativeObj = {};
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];

  impObj = {
    id: bid.bidId,
    tagid: bid.params.adUnit,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: window.location.protocol === 'https:' ? 1 : 0,
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid)
    },
    bidfloorcur: bid.params.currency ? _parseSlotParam('currency', bid.params.currency) : DEFAULT_CURRENCY
  };

  if (bid.params.hasOwnProperty('video')) {
    var videoData = bid.params.video;

    for (var key in VIDEO_CUSTOM_PARAMS) {
      if (videoData.hasOwnProperty(key)) {
        videoObj[key] = _checkParamDataType(key, videoData[key], VIDEO_CUSTOM_PARAMS[key])
      }
    }
    // read playersize and assign to h and w.
    if (utils.isArray(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = bid.mediaTypes.video.playerSize[0][0];
      videoObj.h = bid.mediaTypes.video.playerSize[0][1];
    } else if (utils.isNumber(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = bid.mediaTypes.video.playerSize[0];
      videoObj.h = bid.mediaTypes.video.playerSize[1];
    }
    if (bid.params.video.hasOwnProperty('skippable')) {
      videoObj.ext = {
        'video_skippable': bid.params.video.skippable ? 1 : 0
      }
    }
    impObj.video = videoObj;
  } else if (bid.params.hasOwnProperty('native')) {
    var nativeData = bid.params.native;
    for (var nativekey in NATIVE_CUSTOM_PARAMS) {
      if (nativeData.hasOwnProperty(nativekey)) {
        nativeObj[key] = _checkParamDataType(nativekey, nativeData[nativekey], NATIVE_CUSTOM_PARAMS[nativekey])
      }
    }
    impObj.native = nativeObj;
  } else {
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: utils.inIframe() ? 0 : 1,
    }
    if (utils.isArray(sizes) && sizes.length > 1) {
      sizes = sizes.splice(1, sizes.length - 1);
      var format = [];
      sizes.forEach(size => {
        format.push({w: size[0], h: size[1]});
      });
      bannerObj.format = format;
    }
    impObj.banner = bannerObj;
  }
  return impObj;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: bid => {
    if (bid && bid.params) {
      if (!utils.isStr(bid.params.publisherId)) {
        utils.logWarn(BIDDER_CODE + ' Error: publisherId is mandatory and cannot be numeric. Call to OpenBid will not be sent.');
        return false;
      }
      if (!utils.isStr(bid.params.adSlot)) {
        utils.logWarn(BIDDER_CODE + ': adSlotId is mandatory and cannot be numeric. Call to OpenBid will not be sent.');
        return false;
      }
      // video ad validation
      if (bid.params.hasOwnProperty('video')) {
        if (!bid.params.video.hasOwnProperty('mimes') || !utils.isArray(bid.params.video.mimes) || bid.params.video.mimes.length === 0) {
          utils.logWarn(BIDDER_CODE + ': For video ads, mimes is mandatory and must specify atlease 1 mime value. Call to OpenBid will not be sent.');
          return false;
        }
      }
      if (bid.params.hasOwnProperty('native')) {
        if (!bid.params.native.hasOwnProperty('assets') || !utils.isArray(bid.params.native.assets) || bid.params.native.assets.length === 0) {
          utils.logWarn(BIDDER_CODE + ': For native ads, assets is mandatory and must specify atlease 1 asset value. Call to OpenBid will not be sent.');
          return false;
        }
        if (bid.params.native.hasOwnProperty('assets') && bid.params.native.assets.length > 0) {
          bid.params.native.assets.forEach(element => {
            if (!(element.hasOwnProperty('id') && element.id != null && util.isNumber(element.id))) {
              utils.logWarn(BIDDER_CODE + ': For native ads, assets id is mandatory and must specify asset id value. Call to OpenBid will not be sent.');
              return false;
            }
          });
        }
      }
      return true;
    }
    return false;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    var conf = _initConf();
    var payload = _createOrtbTemplate(conf);
    var bidCurrency = '';
    var dctr = '';
    var dctrLen;
    var dctrArr = [];
    validBidRequests.forEach(bid => {
      _parseAdSlot(bid);
      if (bid.params.hasOwnProperty('video')) {
        if (!(bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex)) {
          utils.logWarn(BIDDER_CODE + ': Skipping the non-standard adslot: ', bid.params.adSlot, bid);
          return;
        }
      } else if (bid.params.hasOwnProperty('native')) {
        // TODO : Check for valid ad slot in native
      } else {
        if (!(bid.params.width && bid.params.height && bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex)) {
          utils.logWarn(BIDDER_CODE + ': Skipping the non-standard adslot: ', bid.params.adSlot, bid);
          return;
        }
      }
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.transactionId;
      if (bidCurrency === '') {
        bidCurrency = bid.params.currency || undefined;
      } else if (bid.params.hasOwnProperty('currency') && bidCurrency !== bid.params.currency) {
        utils.logWarn(BIDDER_CODE + ': Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.currency = bidCurrency;
      // check if dctr is added to more than 1 adunit
      if (bid.params.hasOwnProperty('dctr') && utils.isStr(bid.params.dctr)) {
        dctrArr.push(bid.params.dctr);
      }
      payload.imp.push(_createImpressionObject(bid, conf));
    });

    if (payload.imp.length == 0) {
      return;
    }

    payload.site.publisher.id = conf.pubId.trim();
    publisherId = conf.pubId.trim();
    payload.ext.wrapper = {};
    payload.ext.wrapper.profile = parseInt(conf.profId) || UNDEFINED;
    payload.ext.wrapper.version = parseInt(conf.verId) || UNDEFINED;
    payload.ext.wrapper.wiid = conf.wiid || UNDEFINED;
    payload.ext.wrapper.wv = constants.REPO_AND_VERSION;
    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wp = 'pbjs';
    payload.user.gender = (conf.gender ? conf.gender.trim() : UNDEFINED);
    payload.user.geo = {};

    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.user.ext = {
        consent: bidderRequest.gdprConsent.consentString
      };

      payload.regs = {
        ext: {
          gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
        }
      };
    }

    payload.user.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.user.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.user.yob = _parseSlotParam('yob', conf.yob);
    payload.device.geo = {};
    payload.device.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.device.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.site.page = conf.kadpageurl.trim() || payload.site.page.trim();
    payload.site.domain = _getDomainFromURL(payload.site.page);

    // set dctr value in site.ext, if present in validBidRequests[0], else ignore
    if (validBidRequests[0].params.hasOwnProperty('dctr')) {
      dctr = validBidRequests[0].params.dctr;
      if (utils.isStr(dctr) && dctr.length > 0) {
        var arr = dctr.split('|');
        dctr = '';
        arr.forEach(val => {
          dctr += (val.length > 0) ? (val.trim() + '|') : '';
        });
        dctrLen = dctr.length;
        if (dctr.substring(dctrLen, dctrLen - 1) === '|') {
          dctr = dctr.substring(0, dctrLen - 1);
        }
        payload.site.ext = {
          key_val: dctr.trim()
        }
      } else {
        utils.logWarn(BIDDER_CODE + ': Ignoring param : dctr with value : ' + dctr + ', expects string-value, found empty or non-string value');
      }
      if (dctrArr.length > 1) {
        utils.logWarn(BIDDER_CODE + ': dctr value found in more than 1 adunits. Value from 1st adunit will be picked. Ignoring values from subsequent adunits');
      }
    } else {
      // Commenting out for prebid 1.21 release. Needs to be uncommented and changes from Prebid PR2941 to be pulled in.
      // utils.logWarn(BIDDER_CODE + ': dctr value not found in 1st adunit, ignoring values from subsequent adunits');
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload)
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} response A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (response, request) => {
    const bidResponses = [];
    var respCur = DEFAULT_CURRENCY;
    try {
      let requestData = JSON.parse(request.data);
      if (requestData && requestData.imp && requestData.imp.length > 0) {
        requestData.imp.forEach(impData => {
          bidResponses.push({
            requestId: impData.id,
            width: 0,
            height: 0,
            ttl: 300,
            ad: '',
            creativeId: 0,
            netRevenue: NET_REVENUE,
            cpm: 0,
            currency: respCur,
            referrer: utils.getTopWindowUrl()
          })
        });
      }
      if (response.body && response.body.seatbid && utils.isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        response.body.seatbid.forEach(seatbidder => {
          respCur = response.body.cur || respCur;
          seatbidder.bid &&
            utils.isArray(seatbidder.bid) &&
            seatbidder.bid.forEach(bid => {
              bidResponses.forEach(br => {
                if (br.requestId == bid.impid) {
                  br.requestId = bid.impid;
                  br.cpm = (parseFloat(bid.price) || 0).toFixed(2);
                  br.width = bid.w;
                  br.height = bid.h;
                  br.creativeId = bid.crid || bid.id;
                  br.dealId = bid.dealid;
                  br.currency = respCur;
                  br.netRevenue = NET_REVENUE;
                  br.ttl = 300;
                  br.referrer = utils.getTopWindowUrl();
                  br.ad = bid.adm;
                  let parsedRequest = JSON.parse(request.data);
                  if (parsedRequest.imp && parsedRequest.imp.length > 0) {
                    parsedRequest.imp.forEach(req => {
                      if (bid.impid === req.id && req.hasOwnProperty('video')) {
                        br.mediaType = 'video';
                        br.width = bid.hasOwnProperty('w') ? bid.w : req.video.w;
                        br.height = bid.hasOwnProperty('h') ? bid.h : req.video.h;
                        br.vastXml = bid.adm;
                      }
                      if (bid.impid === req.id && req.hasOwnProperty('native')) {
                        br.mediaType = 'native';
                        br.native = {
                          assets: []
                        }
                        bid.hasOwnProperty('native') && bid.native.hasOwnProperty('assets') && bid.native.assets.length > 0 && bid.native.assets.forEach(bidasset => {
                          req.native.assets.forEach(asset => {
                            if (bidasset.id == asset.id) {
                              br.native.assets.push(bidasset);
                            }
                          });
                        });
                      }
                    });
                  }
                  if (bid.ext && bid.ext.deal_channel) {
                    br['dealChannel'] = dealChannelValues[bid.ext.deal_channel] || null;
                  }
                }
              })
            });
        });
      }
    } catch (error) {
      utils.logError(error);
    }
    return bidResponses;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent) => {
    let syncurl = USYNCURL + publisherId;

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: syncurl
      }];
    } else {
      utils.logWarn('PubMatic: Please enable iframe based user sync.');
    }
  },

  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */
  transformBidParams: function(params, isOpenRtb) {
    return utils.convertTypes({
      'publisherId': 'string',
      'adSlot': 'string'
    }, params);
  }
};

registerBidder(spec);
