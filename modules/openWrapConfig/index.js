import { getGlobal } from "../../src/prebidGlobal";

var pwt = {
  pid: "42461",
  gcv: "172",
  pdvid: "1",
  pubid: "5890",
  dataURL: "t.pubmatic.com/wl?",
  winURL: "t.pubmatic.com/wt?",
  owv: "parmodule_1",
  pbv: "v4.43.0",
  reduceCodeSize: "1",
  metaDataPattern: 0,
  sendAllBids: "0",
  adserver: "CUSTOM",
  gdpr: "0",
  cmp: 0,
  gdprTimeout: 0,
  awc: 0,
  platform: "display",
  refreshInterval: 0,
  priceGranularity: 0,
  adServerCurrency: 0,
  singleImpression: "1",
  identityEnabled: "0",
  identityConsumers: 0,
  ccpa: "0",
  ccpaCmpApi: 0,
  ccpaTimeout: 0,
  sChain: "0",
  sChainObj: 0,
  auTimeout: "5000",
  t: "5000",
  ssTimeout: 0,
  prebidObjName: 0,
  pubAnalyticsAdapter: "1",
  usePBJSKeys: "0",
  abTestEnabled: "0",
  testGroupSize: 0,
  testType: 0,
  granularityMultiplier: 0,
  floorPriceModuleEnabled: "0",
  floorSource: 0,
  floorAuctionDelay: 0,
  jsonUrl: 0,
  rev_share: 0,
  timeout: 0,
  throttle: 0,
  serverSideEnabled: 0,
  video: 0,
  "in-app": 0,
  autoRefreshAdslots: 0,
  adPodsEnabled: 0,
  videoLengths: 0,
  videoLengthMatching: 0,
  ssoEnabled: "0"
};

// singleImpression is used to enable feature of sending single impression for multiple size ad slot earlier there were multiple impression for multiple sizes

// below is the config for test purpose only
var testConfigDetails = {
  'testGroupSize': 99
};

// below is the config for test purpose only
// eslint-disable-next-line camelcase
var test_pwt = {
  't': 5000
};
var adapters = {
  pubmatic: {
    rev_share: '0.0',
    throttle: '100',
    publisherId: '156209',
    kgp: '_W_x_H_@_W_x_H_:_AUI_'
  },
  audienceNetwork: {
    rev_share: '0.0',
    throttle: '100',
    kgp: '_DIV_',
    klm: {
      'Div_1': {
        placementId: '8801674'
      },
      'Div-2': {
        placementId: '8801685'
      }
    }
  },
  sekindoUM: {
    rev_share: '0.0',
    throttle: '100',
    kgp: '_DIV_',
    klm: {
      'Div_1': {
        spaceId: 14071
      },
      'Div-2': {
        spaceId: 14071
      }
    }
  },
  appnexus: {
    rev_share: '0.0',
    throttle: '100',
    kgp: '_DIV_',
    klm: {
      'Div_1': {
        placementId: '8801674',
        'video.mimes': '',
        'video.minduration': ''
      },
      'Div-2': {
        placementId: '8801685'
      }
    }
  },
  pulsepoint: {
    cp: '521732',
    rev_share: '0.0',
    throttle: '100',
    kgp: '_DIV_',
    klm: {
      'Div_1': {
        ct: '76835'
      },
      'Div-2': {
        ct: '147007'
      }
    }
  },
  rubicon: {
    accountId: '10998',
    rev_share: '0.0',
    timeout: '1000',
    throttle: '100',
    pt: 0,
    serverSideEnabled: '0',
    amp: 0,
    video: 0,
    'in-app': 0,
    kgp_rx: '_AU_@_DIV_@_W_x_H_',
    klm_rx: [{
      rx: {
        DIV: '.*',
        AU: '^/43743431/DMDemo',
        SIZE: '728x90'
      },
      rx_config: {
        zoneId: '869224',
        siteId: '178620',
        floor: '0'
      }
    }]
  }
};
var identityPartners = {
  pubCommonId: {
    name: 'pubCommonId',
    'storage.type': 'cookie',
    'storage.name': '_myPubCommonId',
    'storage.expires': '1825'
  },
  identityLink: {
    name: 'identityLink',
    'params.pid': '23',
    'storage.type': 'cookie',
    'params.loadAts': 'true',
    // or false// boolean default is false,
    'params.placementID': '23',
    'params.storageType': 'localstorage',
    'params.detectionType': 'scrapeAndUrl',
    'params.urlParameter': 'eparam',
    'params.cssSelectors': ['input[type=text]', 'input[type=email]'],
    'params.logging': 'info',
    'storage.name': 'somenamevalue',
    'storage.expires': '60'
  },
  criteo: {
    name: 'criteo'
  },
  unifiedId: {
    name: 'unifiedId',
    'params.url': 'https://match.adsrvr.org/track/rid?ttd_pid=PubMatic&fmt=json',
    'storage.type': 'cookie',
    'storage.name': '_myUnifiedId',
    'storage.expires': '1825'
  }
};

/// AD UNIT AU1
// Read Config File and Get Video Config
// 1. Video Config is available
// 2. Check if Defaut Video is Enabled or not
// 3. Generate Config of slot based on KGP of Default Video it would be _AU_ // AU1
// 4. Loop on slotConfig for that generated slot config in pt.3
// 5. DIV1 -> Apply based on condtions (enabled,)
// 6. DIV5 -> It will increase Latency

var slotConfig = {
  configPattern: "_AU_",
  config: {
    "/43743431/QAVideo": {
      banner: {
        enabled: !1
      },
      video: {
        config: {
          battr: [6, 7],
          skipafter: 15,
          maxduration: 50,
          context: "instream",
          //instream
          playerSize: [640, 480],
          skip: 1,
          connectiontype: [1, 2, 6],
          skipmin: 10,
          minduration: 10,
          mimes: ["video/mp4", "video/x-flv"],
          durationRangeSec: [10, 20, 100]
        },
        enabled: !0
      }
    }
  }
};

getGlobal().setConfig({
  openWrap: {pwt, testConfigDetails, test_pwt, adapters, identityPartners, slotConfig}
});

