export const JSON_MAPPING = {
  PL_CODE: 'code',
  PL_SIZE: 'sizes',
  PL_BIDS: 'bids',
  BD_BIDDER: 'bidder',
  BD_ID: 'paramsd',
  BD_PL_ID: 'placementId',
  ADSERVER_TARGETING: 'adserverTargeting',
  BD_SETTING_STANDARD: 'standard'
};

export const FLOOR_SKIPPED_REASON = {
  NOT_FOUND: 'not_found',
  RANDOM: 'random'
};

export const DEBUG_MODE = 'pbjs_debug';

export const STATUS = {
  GOOD: 1
};

export const CB = {
  TYPE: {
    ALL_BIDS_BACK: 'allRequestedBidsBack',
    AD_UNIT_BIDS_BACK: 'adUnitBidsBack',
    BID_WON: 'bidWon',
    REQUEST_BIDS: 'requestBids'
  }
};

export const EVENTS = {
  AUCTION_INIT: 'auctionInit',
  AUCTION_TIMEOUT: 'auctionTimeout',
  AUCTION_END: 'auctionEnd',
  BID_ADJUSTMENT: 'bidAdjustment',
  BID_TIMEOUT: 'bidTimeout',
  BID_REQUESTED: 'bidRequested',
  BID_RESPONSE: 'bidResponse',
  BID_REJECTED: 'bidRejected',
  NO_BID: 'noBid',
  SEAT_NON_BID: 'seatNonBid',
  BID_WON: 'bidWon',
  BIDDER_DONE: 'bidderDone',
  BIDDER_ERROR: 'bidderError',
  SET_TARGETING: 'setTargeting',
  BEFORE_REQUEST_BIDS: 'beforeRequestBids',
  BEFORE_BIDDER_HTTP: 'beforeBidderHttp',
  REQUEST_BIDS: 'requestBids',
  ADD_AD_UNITS: 'addAdUnits',
  AD_RENDER_FAILED: 'adRenderFailed',
  AD_RENDER_SUCCEEDED: 'adRenderSucceeded',
  TCF2_ENFORCEMENT: 'tcf2Enforcement',
  AUCTION_DEBUG: 'auctionDebug',
  BID_VIEWABLE: 'bidViewable',
  STALE_RENDER: 'staleRender',
  BILLABLE_EVENT: 'billableEvent',
  IH_INIT: 'initIdentityHub',
  BID_ACCEPTED: 'bidAccepted',
  RUN_PAAPI_AUCTION: 'paapiRunAuction',
  PAAPI_BID: 'paapiBid',
  PAAPI_NO_BID: 'paapiNoBid',
  PAAPI_ERROR: 'paapiError'
};

export const AD_RENDER_FAILED_REASON = {
  PREVENT_WRITING_ON_MAIN_DOCUMENT: 'preventWritingOnMainDocument',
  NO_AD: 'noAd',
  EXCEPTION: 'exception',
  CANNOT_FIND_AD: 'cannotFindAd',
  MISSING_DOC_OR_ADID: 'missingDocOrAdid'
};

export const EVENT_ID_PATHS = {
  bidWon: 'adUnitCode'
};

export const GRANULARITY_OPTIONS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  AUTO: 'auto',
  DENSE: 'dense',
  CUSTOM: 'custom'
};
export const TARGETING_KEYS = '%%TG_KEYS%%';

export const DEFAULT_TARGETING_KEYS = {
  BIDDER: 'hb_bidder',
  AD_ID: 'hb_adid',
  PRICE_BUCKET: 'hb_pb',
  SIZE: 'hb_size',
  DEAL: 'hb_deal',
  SOURCE: 'hb_source',
  FORMAT: 'hb_format',
  UUID: 'hb_uuid',
  CACHE_ID: 'hb_cache_id',
  CACHE_HOST: 'hb_cache_host',
  ADOMAIN: 'hb_adomain',
  ACAT: 'hb_acat',
  CRID: 'hb_crid',
  DSP: 'hb_dsp'
};
export const NATIVE_KEYS = '%%TG_NATIVE_KEYS%%';

export const S2S = {
  SRC: 's2s',
  DEFAULT_ENDPOINT: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
  SYNCED_BIDDERS_KEY: 'pbjsSyncs'
};

export const BID_STATUS = {
  BID_TARGETING_SET: 'targetingSet',
  RENDERED: 'rendered',
  BID_REJECTED: 'bidRejected'
};

export const REFRESH_IDMODULES_LIST = {
  PRIMARY_MODULES: [
    'id5Id',
    'publinkId',
    'connectId',
    'liveIntentId'
  ],
  SCRIPT_BASED_MODULES: [
    'zeotapIdPlus',
    'identityLink',
    'publinkId'
  ]
};

export const MODULE_PARAM_TO_UPDATE_FOR_SSO = {
  id5Id: [
    {
      key: 'pd'
    }
  ],
  publinkId: [
    {
      key: 'e',
      hashType: 'MD5'
    }
  ],
  connectId: [
    {
      key: 'he',
      hashType: 'SHA256'
    }
  ],
  liveIntentId: [
    {
      key: 'emailHash',
      hashType: 'SHA256'
    }
  ]
};

export const REJECTION_REASON = {
  INVALID: 'Bid has missing or invalid properties',
  INVALID_REQUEST_ID: 'Invalid request ID',
  BIDDER_DISALLOWED: 'Bidder code is not allowed by allowedAlternateBidderCodes / allowUnknownBidderCodes',
  FLOOR_NOT_MET: 'Bid does not meet price floor',
  CANNOT_CONVERT_CURRENCY: 'Unable to convert currency',
  DSA_REQUIRED: 'Bid does not provide required DSA transparency info',
  DSA_MISMATCH: 'Bid indicates inappropriate DSA rendering method',
  PRICE_TOO_HIGH: 'Bid price exceeds maximum value'
};

export const PREBID_NATIVE_DATA_KEYS_TO_ORTB = {
  body: 'desc',
  body2: 'desc2',
  sponsoredBy: 'sponsored',
  cta: 'ctatext',
  rating: 'rating',
  address: 'address',
  downloads: 'downloads',
  likes: 'likes',
  phone: 'phone',
  price: 'price',
  salePrice: 'saleprice',
  displayUrl: 'displayurl'
};

export const NATIVE_ASSET_TYPES = {
  sponsored: 1,
  desc: 2,
  rating: 3,
  likes: 4,
  downloads: 5,
  price: 6,
  saleprice: 7,
  phone: 8,
  address: 9,
  desc2: 10,
  displayurl: 11,
  ctatext: 12
};

export const NATIVE_IMAGE_TYPES = {
  ICON: 1,
  MAIN: 3
};

export const NATIVE_KEYS_THAT_ARE_NOT_ASSETS = [
  'privacyIcon',
  'clickUrl',
  'sendTargetingKeys',
  'adTemplate',
  'rendererUrl',
  'type'
];

export const IH_LOGGER_STORAGE_KEY = 'IH_LGCL_TS';
export const FLOOR_VALUES = {
  NO_DATA: 'noData',
  AD_UNIT: 'adUnit',
  SET_CONFIG: 'setConfig',
  FETCH: 'fetch',
  SUCCESS: 'success',
  ERROR: 'error',
  TIMEOUT: 'timeout'
};

export const MESSAGES = {
  REQUEST: 'Prebid Request',
  RESPONSE: 'Prebid Response',
  NATIVE: 'Prebid Native',
  EVENT: 'Prebid Event'
};
