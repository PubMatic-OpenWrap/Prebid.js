import * as configModule from '../../../../modules/openWrap/config.js';
import * as conf from '../../../../modules/openWrap/conf.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as util from '../../../../modules/openWrap/util.js';

describe('OpenWrap Core Module: config.js', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    // Reset config before each test
    conf.setOWConfig({
      pwt: {},
      adapters: {},
      testConfigDetails: {},
      test_pwt: {},
      identityPartners: {},
      slotConfig: {},
      alias: {},
      test_adapters: {},
      test_identityPartners: {}
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Publisher Configuration', function () {
    it('getPublisherId should return default "0" when pubid is not set', function () {
      expect(configModule.getPublisherId()).to.equal('0');
    });

    it('getPublisherId should return configured pubid', function () {
      conf.setOWConfig({
        pwt: { pubid: '12345' }
      });
      expect(configModule.getPublisherId()).to.equal('12345');
    });

    it('getTimeout should return default 1000 when not configured', function () {
      expect(configModule.getTimeout()).to.equal(1000);
    });

    it('getTimeout should return configured timeout value', function () {
      conf.setOWConfig({
        pwt: { t: '2000' }
      });
      expect(configModule.getTimeout()).to.equal(2000);
    });
  });

  describe('Adapter Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        adapters: {
          testAdapter: {
            rev_share: '20',
            throttle: '30',
            serverSideEnabled: '1',
            pt: '1'
          }
        }
      });
    });

    it('getAdapterRevShare should calculate correct revenue share', function () {
      expect(configModule.getAdapterRevShare('testAdapter')).to.equal(0.8); // 1 - 20/100
    });

    it('getAdapterRevShare should return 1 for unconfigured adapter', function () {
      expect(configModule.getAdapterRevShare('nonexistentAdapter')).to.equal(1);
    });

    it('getAdapterThrottle should return correct throttle value', function () {
      expect(configModule.getAdapterThrottle('testAdapter')).to.equal(70); // 100 - 30
    });

    it('isServerSideAdapter should identify server-side adapters', function () {
      expect(configModule.isServerSideAdapter('testAdapter')).to.be.true;
    });

    it('getBidPassThroughStatus should return correct status', function () {
      expect(configModule.getBidPassThroughStatus('testAdapter')).to.equal(1);
    });
  });

  describe('GDPR Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        pwt: {},
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.GDPR_CONSENT]: '1',
          [CONSTANTS.CONFIG.GDPR_CMPAPI]: 'iab',
          [CONSTANTS.CONFIG.GDPR_TIMEOUT]: '1000',
          [CONSTANTS.CONFIG.GDPR_AWC]: '1'
        }
      });
    });

    it('getGdpr should return correct consent status', function () {
      expect(configModule.getGdpr()).to.be.true;
    });

    it('getCmpApi should return configured CMP API', function () {
      expect(configModule.getCmpApi()).to.equal('iab');
    });

    it('getGdprTimeout should return configured timeout', function () {
      expect(configModule.getGdprTimeout()).to.equal(1000);
    });

    it('getAwc should return correct AWC status', function () {
      expect(configModule.getAwc()).to.be.true;
    });
  });

  describe('Profile Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        pwt: {
          [CONSTANTS.CONFIG.PROFILE_ID]: 'profile123',
          [CONSTANTS.CONFIG.PROFILE_VERSION_ID]: 'version123'
        }
      });
    });

    it('getProfileID should return configured profile ID', function () {
      expect(configModule.getProfileID()).to.equal('profile123');
    });

    it('getProfileDisplayVersionID should return configured version ID', function () {
      expect(configModule.getProfileDisplayVersionID()).to.equal('version123');
    });
  });

  describe('Prebid Adapter', function () {
    it('should add Prebid adapter with default configuration', function () {
      configModule.addPrebidAdapter();
      const adapters = conf.adapters;
      expect(adapters[CONSTANTS.COMMON.PARENT_ADAPTER_PREBID]).to.exist;
      expect(adapters[CONSTANTS.COMMON.PARENT_ADAPTER_PREBID][CONSTANTS.CONFIG.REV_SHARE]).to.equal('0.0');
      expect(adapters[CONSTANTS.COMMON.PARENT_ADAPTER_PREBID][CONSTANTS.CONFIG.THROTTLE]).to.equal('100');
    });
  });

  describe('Namespace Configuration', function () {
    it('getOverrideNamespace should handle missing configuration', function () {
      expect(configModule.getOverrideNamespace('testKey', 'default', 'fallback')).to.equal('fallback');
    });

    it('getOverrideNamespace should return configured value', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          testKey: 'customNamespace'
        }
      });
      expect(configModule.getOverrideNamespace('testKey', 'default', 'fallback')).to.equal('customNamespace');
    });
  });

  describe('Server-Side Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        pwt: {
          usePBSAdapter: '1',
          ssTimeout: '300',
          marketplaceBidders: 'bidder1,bidder2'
        }
      });
    });

    it('usePBSAdapter should return correct status', function () {
      expect(configModule.usePBSAdapter()).to.be.true;
    });

    it('getTimeoutForPBSRequest should return configured timeout', function () {
      expect(configModule.getTimeoutForPBSRequest()).to.equal(300);
    });

    it('getMarketplaceBidders should return correct bidders array', function () {
      expect(configModule.getMarketplaceBidders()).to.deep.equal(['bidder1', 'bidder2']);
    });
  });

  describe('Version Information', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.OWVERSION]: '1.0.0',
          [CONSTANTS.COMMON.PBVERSION]: '2.0.0'
        }
      });
    });

    it('getOWVersion should return correct OpenWrap version', function () {
      expect(configModule.getOWVersion()).to.equal('1.0.0');
    });

    it('getPrebidVersion should return correct Prebid version', function () {
      expect(configModule.getPrebidVersion()).to.equal('2.0.0');
    });
  });

  describe('GPP Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.GPP_CONSENT]: '1',
          [CONSTANTS.CONFIG.GPP_CMPAPI]: 'custom',
          [CONSTANTS.CONFIG.GPP_TIMEOUT]: '2000'
        }
      });
    });

    it('getGppConsent should return correct consent status', function () {
      expect(configModule.getGppConsent()).to.be.true;
    });

    it('getGppCmpApi should return configured CMP API', function () {
      expect(configModule.getGppCmpApi()).to.equal('custom');
    });

    it('getGppTimeout should return configured timeout', function () {
      expect(configModule.getGppTimeout()).to.equal(2000);
    });
  });

  describe('Targeting Configuration', function () {
    it('shouldClearTargeting should return true by default', function () {
      window.PWT = { };
      expect(configModule.shouldClearTargeting()).to.be.true;
    });

    it('shouldClearTargeting should respect window.PWT setting', function () {
      window.PWT = { shouldClearTargeting: false };
      expect(configModule.shouldClearTargeting()).to.be.false;
      delete window.PWT;
    });
  });

  describe('AB Testing Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        pwt: {
          abTestEnabled: '1',
          bidPoolingEnabled: '1'
        },
        testConfigDetails: {
          testType: 'bidpooling',
          testGroups: {
            'group1': { bidPooling: true }
          }
        },
        test_pwt: {
          t: '3000'
        },
        test_adapters: {
          testAdapter: { rev_share: '30' }
        },
        test_identityPartners: {
          testPartner: { enabled: true }
        }
      });
    });

    it('isAbTestEnabled should detect enabled test', function () {
      expect(configModule.isAbTestEnabled()).to.be.true;
    });

    it('getTestPWTConfig should return test PWT config', function () {
      expect(configModule.getTestPWTConfig()).to.deep.equal({ t: '3000' });
    });

    it('getTestGroupDetails should return test group details', function () {
      expect(configModule.getTestGroupDetails()).to.deep.equal({
        testType: 'bidpooling',
        testGroups: {
          'group1': { bidPooling: true }
        }
      });
    });

    it('getTestPartnerConfig should return test adapter config', function () {
      expect(configModule.getTestPartnerConfig()).to.deep.equal({
        testAdapter: { rev_share: '30' }
      });
    });

    it('getTestIdentityPartners should return test identity partners', function () {
      expect(configModule.getTestIdentityPartners()).to.deep.equal({
        testPartner: { enabled: true }
      });
    });

    it('isBidPoolingEnabled should detect enabled bid pooling', function () {
      configModule.updateABTestConfig();
      expect(configModule.isBidPoolingEnabled()).to.be.true;
    });
  });

  describe('Partner Configuration', function () {
    it('forEachBidderAlias should iterate over aliases', function () {
      conf.setOWConfig({
        alias: {
          alias1: 'original1',
          alias2: { name: 'original2' }
        }
      });

      const aliases = {};
      configModule.forEachBidderAlias((aliasName, original) => {
        aliases[aliasName] = original;
      });

      expect(aliases).to.deep.equal({
        alias1: 'original1',
        alias2: { name: 'original2' }
      });
    });

    it('getAdapterNameForAlias should return correct adapter name', function () {
      conf.setOWConfig({
        alias: {
          alias1: 'original1',
          alias2: { name: 'original2' }
        }
      });

      expect(configModule.getAdapterNameForAlias('alias1')).to.equal('original1');
      expect(configModule.getAdapterNameForAlias('alias2')).to.equal('original2');
      expect(configModule.getAdapterNameForAlias('nonexistent')).to.equal('nonexistent');
    });
  });

  describe('SSO and Server Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        adapters: {
          adapter1: { serverSideEnabled: '1' },
          adapter2: { serverSideEnabled: '0' },
          pubmatic: { serverSideEnabled: '1' },
          pubmaticAlias: { serverSideEnabled: '1' }
        },
        alias: {
          pubmaticAlias: { name: 'pubmatic' }
        },
        pwt: {
          ssTimeout: '800',
          ssoEnabled: '1'
        }
      });
    });

    it('isSSOEnabled should detect enabled SSO', function () {
      expect(configModule.isSSOEnabled()).to.be.true;
    });

    it('getServerEnabledAdaptars should return server-side adapters', function () {
      const serverAdapters = configModule.getServerEnabledAdaptars();
      expect(serverAdapters).to.include('adapter1');
      expect(serverAdapters).to.not.include('adapter2');
    });

    it('getTimeoutForPBSRequest should handle timeout boundaries', function () {
      // Test minimum timeout
      conf.setOWConfig({ pwt: { ssTimeout: '0' } });
      expect(configModule.getTimeoutForPBSRequest()).to.equal(CONSTANTS.TIMEOUT_CONFIG.MinTimeout);

      // Test maximum timeout
      conf.setOWConfig({ pwt: { ssTimeout: '10000' } });
      expect(configModule.getTimeoutForPBSRequest()).to.equal(CONSTANTS.TIMEOUT_CONFIG.MaxTimeout);

      // Test valid timeout
      conf.setOWConfig({ pwt: { ssTimeout: '300' } });
      expect(configModule.getTimeoutForPBSRequest()).to.equal(300);
    });

    it('getPubMaticAndAlias should return PubMatic and its aliases', function () {
      const pubmaticBidders = configModule.getPubMaticAndAlias(['pubmatic', 'pubmaticAlias', 'other']);
      expect(pubmaticBidders).to.include('pubmatic');
      expect(pubmaticBidders).to.include('pubmaticAlias');
      expect(pubmaticBidders).to.not.include('other');
    });
  });

  describe('Macro and Utility Functions', function () {
    beforeEach(function () {
      conf.setOWConfig({
        pwt: {
          [CONSTANTS.CONFIG.PROFILE_ID]: 123,
          [CONSTANTS.CONFIG.PROFILE_VERSION_ID]: 456
        }
      });
    });

    it('createMacros should return correct macro values', function () {
      const macros = configModule.createMacros();
      expect(macros).to.deep.equal({
        '[PLATFORM]': util.getDevicePlatform().toString(),
        '[PROFILE_ID]': '123',
        '[PROFILE_VERSION]': '456'
      });
    });

    it('getMergedConfig should correctly merge configurations', function () {
      const toObject = {
        key1: 'value1',
        key2: { nested1: 'old' }
      };
      const fromObject = {
        key2: { nested2: 'new' },
        key3: ['array']
      };

      const merged = configModule.getMergedConfig(toObject, fromObject);
      expect(merged).to.deep.equal({
        key1: 'value1',
        key2: { nested1: 'old' },
        key3: ['array']
      });
    });
  });

  describe('Basic Configuration', function () {
    it('getSendAllBidsStatus should return correct status', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.SEND_ALL_BIDS]: '1'
        }
      });
      expect(configModule.getSendAllBidsStatus()).to.equal(1);

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.SEND_ALL_BIDS]: '0'
        }
      });
      expect(configModule.getSendAllBidsStatus()).to.equal(0);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getSendAllBidsStatus()).to.equal(0);
    });

    it('getDisableAjaxTimeout should return correct status', function () {
      conf.setOWConfig({
        pwt: {
          [CONSTANTS.CONFIG.DISABLE_AJAX_TIMEOUT]: true
        }
      });
      expect(configModule.getDisableAjaxTimeout()).to.be.true;

      conf.setOWConfig({
        pwt: {
          [CONSTANTS.CONFIG.DISABLE_AJAX_TIMEOUT]: false
        }
      });
      expect(configModule.getDisableAjaxTimeout()).to.be.false;

      // Test default value
      conf.setOWConfig({
        pwt: {}
      });
      expect(configModule.getDisableAjaxTimeout()).to.be.true;
    });

    it('forEachAdapter should iterate over adapters', function () {
      conf.setOWConfig({
        adapters: {
          adapter1: { config: 'value1' },
          adapter2: { config: 'value2' }
        }
      });

      const adapters = {};
      configModule.forEachAdapter((adapterID, adapterConfig) => {
        adapters[adapterID] = adapterConfig;
      });

      expect(adapters).to.deep.equal({
        adapter1: { config: 'value1' },
        adapter2: { config: 'value2' }
      });
    });
  });

  describe('Feature Configuration', function () {
    it('getAdServerCurrency should return correct currency', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.AD_SERVER_CURRENCY]: 'USD'
        }
      });

      expect(configModule.getAdServerCurrency()).to.equal('USD');
    });

    it('isSingleImpressionSettingEnabled should return correct status', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.SINGLE_IMPRESSION]: '1'
        }
      });
      expect(configModule.isSingleImpressionSettingEnabled()).to.equal(1);

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.SINGLE_IMPRESSION]: '0'
        }
      });
      expect(configModule.isSingleImpressionSettingEnabled()).to.equal(0);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.isSingleImpressionSettingEnabled()).to.equal(
        parseInt(CONSTANTS.CONFIG.DEFAULT_SINGLE_IMPRESSION)
      );
    });

    it('isUserIdModuleEnabled should return correct status', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.ENABLE_USER_ID]: '1'
        }
      });
      expect(configModule.isUserIdModuleEnabled()).to.equal(1);

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.ENABLE_USER_ID]: '0'
        }
      });
      expect(configModule.isUserIdModuleEnabled()).to.equal(0);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.isUserIdModuleEnabled()).to.equal(
        parseInt(CONSTANTS.CONFIG.DEFAULT_USER_ID_MODULE)
      );
    });

    it('getIdentityConsumers should return correct consumers', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.IDENTITY_CONSUMERS]: 'PREBID,GAM'
        }
      });
      expect(configModule.getIdentityConsumers()).to.equal('prebid,gam');

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getIdentityConsumers()).to.equal('');
    });

    it('getSlotConfiguration should return correct configuration', function () {
      const slotConfig = {
        div1: { sizes: [[300, 250]] },
        div2: { sizes: [[728, 90]] }
      };

      conf.setOWConfig({
        [CONSTANTS.COMMON.SLOT_CONFIG]: slotConfig
      });

      expect(configModule.getSlotConfiguration()).to.deep.equal(slotConfig);
    });
  });

  describe('CCPA Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.CCPA_CONSENT]: '1',
          [CONSTANTS.CONFIG.CCPA_CMPAPI]: 'iab',
          [CONSTANTS.CONFIG.CCPA_TIMEOUT]: '1000'
        }
      });
    });

    it('getCCPA should return correct consent status', function () {
      expect(configModule.getCCPA()).to.be.true;

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.CCPA_CONSENT]: '0'
        }
      });
      expect(configModule.getCCPA()).to.be.false;

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getCCPA()).to.equal(CONSTANTS.CONFIG.DEFAULT_CCPA_CONSENT === '1');
    });

    it('getCCPACmpApi should return configured CMP API', function () {
      expect(configModule.getCCPACmpApi()).to.equal('iab');

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getCCPACmpApi()).to.equal(CONSTANTS.CONFIG.DEFAULT_CCPA_CMPAPI);
    });

    it('getCCPATimeout should return configured timeout', function () {
      expect(configModule.getCCPATimeout()).to.equal(1000);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getCCPATimeout()).to.equal(CONSTANTS.CONFIG.DEFAULT_CCPA_TIMEOUT);
    });
  });

  describe('Floor Price Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.FLOOR_PRICE_MODULE_ENABLED]: '1',
          [CONSTANTS.CONFIG.FLOOR_SOURCE]: 'nofloors',
          [CONSTANTS.CONFIG.FLOOR_JSON_URL]: 'https://example.com/floors.json',
          [CONSTANTS.CONFIG.FLOOR_AUCTION_DELAY]: '200',
          [CONSTANTS.CONFIG.FLOOR_ENFORCE_JS]: CONSTANTS.COMMON.HARD_FLOOR
        }
      });
    });

    it('isFloorPriceModuleEnabled should return correct status', function () {
      expect(configModule.isFloorPriceModuleEnabled()).to.be.true;

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.FLOOR_PRICE_MODULE_ENABLED]: '0'
        }
      });
      expect(configModule.isFloorPriceModuleEnabled()).to.be.false;
    });

    it('getFloorSource should return correct source', function () {
      expect(configModule.getFloorSource()).to.equal('nofloors');
    });

    it('getFloorJsonUrl should return correct URL', function () {
      expect(configModule.getFloorJsonUrl()).to.equal('https://example.com/floors.json');
    });

    it('getFloorAuctionDelay should return correct delay', function () {
      expect(configModule.getFloorAuctionDelay()).to.equal(200);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getFloorAuctionDelay()).to.equal(CONSTANTS.CONFIG.DEFAULT_FLOOR_AUCTION_DELAY);
    });

    it('getFloorType should return correct type', function () {
      expect(configModule.getFloorType()).to.be.true;

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.FLOOR_ENFORCE_JS]: 'soft'
        }
      });
      expect(configModule.getFloorType()).to.be.false;

      // Test with missing configuration
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getFloorType()).to.be.false;
    });
  });

  describe('Analytics and Prebid Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.ENABLE_PB_PM_ANALYTICS]: '1',
          [CONSTANTS.CONFIG.USE_PREBID_KEYS]: '1',
          [CONSTANTS.COMMON.PBJS_NAMESPACE]: 'customPbjs',
          [CONSTANTS.COMMON.PRICE_GRANULARITY]: 'medium',
          [CONSTANTS.COMMON.GRANULARITY_MULTIPLIER]: '2.5'
        }
      });
    });

    it('isPrebidPubMaticAnalyticsEnabled should return correct status', function () {
      expect(configModule.isPrebidPubMaticAnalyticsEnabled()).to.be.true;

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.ENABLE_PB_PM_ANALYTICS]: '0'
        }
      });
      expect(configModule.isPrebidPubMaticAnalyticsEnabled()).to.be.false;
    });

    it('isUsePrebidKeysEnabled should return correct status', function () {
      expect(configModule.isUsePrebidKeysEnabled()).to.be.true;

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.USE_PREBID_KEYS]: '0'
        }
      });
      expect(configModule.isUsePrebidKeysEnabled()).to.be.false;
    });

    it('getPBJSNamespace should return correct namespace', function () {
      expect(configModule.getPBJSNamespace()).to.equal('customPbjs');

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getPBJSNamespace()).to.equal('pbjs');
    });

    it('getPriceGranularityBuckets should return correct buckets', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.PRICE_GRANULARITY_BUCKETS]: {
            ranges: [
              { max: 5, increment: 0.05 },
              { max: 20, increment: 0.1 }
            ]
          }
        }
      });

      const result = configModule.getPriceGranularityBuckets();
      expect(result).to.deep.equal({
        buckets: [
          { max: 5, increment: 0.05 },
          { max: 20, increment: 0.1 }
        ]
      });

      // Test null case
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getPriceGranularityBuckets()).to.be.null;
    });

    it('getGranularityMultiplier should return correct multiplier', function () {
      expect(configModule.getGranularityMultiplier()).to.equal(2.5);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getGranularityMultiplier()).to.equal(1);
    });
  });

  describe('PBS and Server Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        pwt: {
          usePBSAdapter: '1',
          marketplaceBidders: 'bidder1,bidder2'
        }
      });
    });

    it('usePBSAdapter should return correct status', function () {
      expect(configModule.usePBSAdapter()).to.be.true;

      conf.setOWConfig({
        pwt: {
          usePBSAdapter: '0'
        }
      });
      expect(configModule.usePBSAdapter()).to.be.false;
    });

    it('getMarketplaceBidders should return correct bidders', function () {
      expect(configModule.getMarketplaceBidders()).to.deep.equal(['bidder1', 'bidder2']);

      // Test with no marketplaceBidders
      conf.setOWConfig({
        pwt: {}
      });
      expect(configModule.getMarketplaceBidders()).to.be.false;
    });

    it('getSchainObject should return correct object', function () {
      const schainObj = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'example.com', sid: '123' }]
      };

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.SCHAINOBJECT]: schainObj
        }
      });

      expect(configModule.getSchainObject()).to.deep.equal(schainObj);

      // Test null case
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getSchainObject()).to.be.null;
    });

    it('isSchainEnabled should return correct status', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.SCHAIN]: '1'
        }
      });
      expect(configModule.isSchainEnabled()).to.equal(1);

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.SCHAIN]: '0'
        }
      });
      expect(configModule.isSchainEnabled()).to.equal(0);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.isSchainEnabled()).to.equal(0);
    });
  });

  describe('AB Testing Implementation', function () {
    it('updateABTestConfig should not apply test configuration when random number exceeds group size', function () {
      sandbox.stub(configModule, 'isAbTestEnabled').returns(true);
      sandbox.stub(util, 'getRandomNumberBelow100').returns(30);

      const testGroupDetails = { testGroupSize: 20 };
      sandbox.stub(configModule, 'getTestGroupDetails').returns(testGroupDetails);

      sandbox.stub(configModule, 'updatePWTConfig');

      configModule.updateABTestConfig();

      expect(configModule.updatePWTConfig.called).to.be.false;
    });
  });

  describe('GPP Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.GPP_CONSENT]: '1',
          [CONSTANTS.CONFIG.GPP_CMPAPI]: 'iab',
          [CONSTANTS.CONFIG.GPP_TIMEOUT]: '1500'
        }
      });
    });

    it('getGppConsent should return correct consent status', function () {
      expect(configModule.getGppConsent()).to.be.true;

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.GPP_CONSENT]: '0'
        }
      });
      expect(configModule.getGppConsent()).to.be.false;

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getGppConsent()).to.equal(CONSTANTS.CONFIG.DEFAULT_GPP_CONSENT === '1');
    });

    it('getGppCmpApi should return configured CMP API', function () {
      expect(configModule.getGppCmpApi()).to.equal('iab');

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getGppCmpApi()).to.equal(CONSTANTS.CONFIG.DEFAULT_GPP_CMPAPI);
    });

    it('getGppTimeout should return configured timeout', function () {
      expect(configModule.getGppTimeout()).to.equal(1500);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.getGppTimeout()).to.equal(CONSTANTS.CONFIG.DEFAULT_GPP_TIMEOUT);
    });
  });

  describe('Identity Configuration', function () {
    it('isIdentityOnly should return correct status', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.IDENTITY_ONLY]: '1'
        }
      });
      expect(configModule.isIdentityOnly()).to.equal(1);

      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.IDENTITY_ONLY]: '0'
        }
      });
      expect(configModule.isIdentityOnly()).to.equal(0);

      // Test default value
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {}
      });
      expect(configModule.isIdentityOnly()).to.equal(
        parseInt(CONSTANTS.CONFIG.DEFAULT_IDENTITY_ONLY)
      );
    });
  });

  describe('Partner Configuration Update', function () {
    let logStub, isOwnPropertyStub, isObjectStub, getMergedConfigStub;
    before(function () {
      logStub = sinon.stub(util, 'log');
      isOwnPropertyStub = sinon.stub(util, 'isOwnProperty').callsFake((obj, key) => Object.prototype.hasOwnProperty.call(obj, key));
      isObjectStub = sinon.stub(util, 'isObject').callsFake(obj => typeof obj === 'object' && obj !== null && !Array.isArray(obj));
      getMergedConfigStub = sinon.stub(configModule, 'getMergedConfig').callsFake((to, from) => ({ ...to, ...from }));
      // Ensure window.PWT exists for the test
      if (typeof window === 'undefined') global.window = {};
      window.PWT = window.PWT || {};
    });
    after(function () {
      logStub.restore();
      isOwnPropertyStub.restore();
      isObjectStub.restore();
      getMergedConfigStub.restore();
      // Cleanup window.PWT only
      if (window.PWT) delete window.PWT;
    });

    it('updatePartnerConfig should handle empty test configuration', function () {
      const testConfig = null;
      const controlConfig = { adapter1: { key1: 'value1' } };

      const result = configModule.updatePartnerConfig(testConfig, controlConfig);

      expect(result).to.equal(controlConfig);
    });

    it('updatePartnerConfig should handle empty control configuration', function () {
      const testConfig = { adapter1: { key1: 'value1' } };
      const controlConfig = null;

      const result = configModule.updatePartnerConfig(testConfig, controlConfig);

      expect(result).to.equal(controlConfig);
    });

    it('updatePartnerConfig should update testConfig with merged values and set testGroupId when both configs are present and valid', function () {
      // Arrange
      const testConfig = { adapter1: { key1: 'value1' } };
      const controlConfig = { adapter1: { key1: 'value1' } };
      // Act
      const result = configModule.updatePartnerConfig(testConfig, controlConfig);
      // Assert
      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[0]).to.equal(CONSTANTS.MESSAGES.M31);
      expect(JSON.parse(logStub.firstCall.args[1])).to.deep.equal(testConfig);
      expect(result).to.equal(testConfig);
      expect(result.adapter1).to.deep.equal({ key1: 'value1' });
      expect(window.PWT.testGroupId).to.equal(1);
    });
  });

  describe('Merged Configuration', function () {
    it('getMergedConfig should correctly merge objects', function () {
      const toObject = {
        key1: 'value1',
        key2: { nested1: 'old' }
      };

      const fromObject = {
        key3: 'value3',
        key4: { nested2: 'new' },
        key5: ['array']
      };

      sandbox.stub(util, 'isObject')
        .withArgs(fromObject.key4).returns(true)
        .withArgs(fromObject.key5).returns(false);

      sandbox.stub(util, 'isArray')
        .withArgs(fromObject.key5).returns(true);

      const result = configModule.getMergedConfig(toObject, fromObject);

      expect(result).to.deep.equal({
        key1: 'value1',
        key2: { nested1: 'old' },
        key3: 'value3',
        key4: { nested2: 'new' },
        key5: ['array']
      });
    });
  });

  describe('Additional Configuration Tests', function () {
    it('isServerSideAdapter should handle missing adapter', function () {
      expect(configModule.isServerSideAdapter('nonexistentAdapter')).to.be.false;
    });

    it('isServerSideAdapter should handle adapter without serverSideEnabled property', function () {
      conf.setOWConfig({
        adapters: {
          testAdapter: {
            rev_share: '20'
          }
        }
      });

      expect(configModule.isServerSideAdapter('testAdapter')).to.be.false;
    });

    it('getBidPassThroughStatus should handle missing adapter', function () {
      expect(configModule.getBidPassThroughStatus('nonexistentAdapter')).to.equal(0);
    });

    it('getBidPassThroughStatus should handle adapter without pt property', function () {
      conf.setOWConfig({
        adapters: {
          testAdapter: {
            rev_share: '20'
          }
        }
      });

      expect(configModule.getBidPassThroughStatus('testAdapter')).to.equal(0);
    });
  });

  describe('getIdentityPartners', function () {
    afterEach(function () {
      delete conf.identityPartners;
    });

    it('should return the configured identity partners', function () {
      const partners = { id5: {}, sharedId: {} };
      conf.identityPartners = partners;
      expect(configModule.getIdentityPartners()).to.deep.equal(partners);
    });

    it('should return undefined if identity partners are not set', function () {
      delete conf.identityPartners;
      expect(configModule.getIdentityPartners()).to.equal(undefined);
    });
  });

  describe('getAdServer', function () {
    afterEach(function () {
      delete conf.adserver;
    });

    it('should return the configured ad server', function () {
      conf.adserver = 'dfp';
      expect(configModule.getAdServer()).to.equal('dfp');
    });

    it('should return undefined if ad server is not set', function () {
      delete conf.adserver;
      expect(configModule.getAdServer()).to.equal(undefined);
    });
  });

  describe('getPriceGranularity', function () {
    it('should return the configured price granularity when set to a standard value', function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.PRICE_GRANULARITY]: 'medium'
        }
      });
      expect(configModule.getPriceGranularity()).to.equal('medium');
    });

    it('should return null when price granularity is not set', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configModule.getPriceGranularity()).to.equal(null);
    });

    it('should return transformed buckets when price granularity is custom and buckets are defined', function () {
      const customBuckets = {
        ranges: [
          { max: 5, increment: 0.5 },
          { max: 10, increment: 1 }
        ],
        precision: 2
      };
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.PRICE_GRANULARITY]: CONSTANTS.COMMON.PRICE_GRANULARITY_CUSTOM,
          [CONSTANTS.COMMON.PRICE_GRANULARITY_BUCKETS]: customBuckets
        }
      });
      const result = configModule.getPriceGranularity();
      expect(result).to.have.property('buckets');
      expect(result.buckets).to.deep.equal(customBuckets.ranges);
      expect(result.precision).to.equal(2);
    });

    it('should log warning and return null when price granularity is custom but buckets are missing', function () {
      const logWarningStub = sinon.stub(util, 'logWarning');
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.PRICE_GRANULARITY]: CONSTANTS.COMMON.PRICE_GRANULARITY_CUSTOM
        }
      });
      const result = configModule.getPriceGranularity();
      expect(result).to.equal(null);
      expect(logWarningStub.calledOnce).to.be.true;
      logWarningStub.restore();
    });
  });

  describe('getNativeConfiguration', function () {
    afterEach(function () {
      delete conf.nativeConfig;
    });

    it('should return the configured native media type config', function () {
      const nativeConfig = { image: { required: true }, title: { len: 80 } };
      conf.nativeConfig = nativeConfig;
      expect(configModule.getNativeConfiguration()).to.deep.equal(nativeConfig);
    });

    it('should return undefined if native media type config is not set', function () {
      delete conf.nativeConfig;
      expect(configModule.getNativeConfiguration()).to.equal(undefined);
    });
  });

  describe('enableBidpoolingIfApplicable', function () {
    let originalPwt;
    beforeEach(function () {
      // Save and reset conf.pwt before each test
      originalPwt = JSON.parse(JSON.stringify(conf.pwt));
      if (!conf.pwt) conf.pwt = {};
    });
    afterEach(function () {
      // Restore conf.pwt after each test
      conf.pwt = JSON.parse(JSON.stringify(originalPwt));
    });

    it('should enable bid pooling if testType matches BID_POOLING', function () {
      const testGroupDetails = { testType: CONSTANTS.COMMON.BID_POOLING };
      delete conf.pwt[CONSTANTS.COMMON.BID_POOLING_ENABLED];
      configModule.enableBidpoolingIfApplicable(testGroupDetails);
      expect(conf.pwt[CONSTANTS.COMMON.BID_POOLING_ENABLED])
        .to.equal(CONSTANTS.COMMON.ENABLED_BID_POOLING);
    });

    it('should not enable bid pooling if testType does not match BID_POOLING', function () {
      const testGroupDetails = { testType: 'not-bid-pooling' };
      delete conf.pwt[CONSTANTS.COMMON.BID_POOLING_ENABLED];
      configModule.enableBidpoolingIfApplicable(testGroupDetails);
      expect(conf.pwt[CONSTANTS.COMMON.BID_POOLING_ENABLED]).to.be.undefined;
    });

    it('should not enable bid pooling if testGroupDetails is missing testType', function () {
      const testGroupDetails = {};
      configModule.enableBidpoolingIfApplicable(testGroupDetails);
      expect(conf.pwt[CONSTANTS.COMMON.BID_POOLING_ENABLED]).to.be.undefined;
    });

    it('should not mutate unrelated config properties', function () {
      conf.pwt.otherProperty = 'shouldRemain';
      const testGroupDetails = { testType: 'not-bid-pooling' };
      configModule.enableBidpoolingIfApplicable(testGroupDetails);
      expect(conf.pwt.otherProperty).to.equal('shouldRemain');
    });
  });

  describe('updatePWTConfig', function () {
    let sandbox;
    let originalConfig;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
      // Use deep clone to preserve the original state
      originalConfig = JSON.parse(JSON.stringify(conf.pwt));
      if (!conf.pwt) conf.pwt = {};
      // Clear TEST_PWT and pwt config
      conf[CONSTANTS.COMMON.TEST_PWT] = undefined;
      conf.pwt = { foo: 'bar', bar: 'baz' };
    });
    afterEach(function () {
      sandbox.restore();
      conf.pwt = JSON.parse(JSON.stringify(originalConfig));
      conf[CONSTANTS.COMMON.TEST_PWT] = undefined;
    });

    it('should update config.pwt keys with testConfig values and log', function () {
      // Arrange
      const testConfig = { foo: 'updated', bar: 'baz2', notPresent: 'no' };
      conf[CONSTANTS.COMMON.TEST_PWT] = testConfig;
      const logStub = sandbox.stub(util, 'log');
      // Act
      configModule.updatePWTConfig();
      // Assert
      expect(conf.pwt.foo).to.equal('updated');
      expect(conf.pwt.bar).to.equal('baz2');
      // Should not add new keys not present in config.pwt
      expect(conf.pwt.notPresent).to.be.undefined;
      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[0]).to.equal(CONSTANTS.MESSAGES.M30);
      expect(JSON.parse(logStub.firstCall.args[1])).to.deep.equal(testConfig);
    });

    it('should not update config if testConfig is empty', function () {
      conf[CONSTANTS.COMMON.TEST_PWT] = {};
      const logStub = sandbox.stub(util, 'log');
      configModule.updatePWTConfig();
      expect(conf.pwt).to.deep.equal({ foo: 'bar', bar: 'baz' });
      expect(logStub.called).to.be.false;
    });

    it('should not update config if testConfig is undefined', function () {
      conf[CONSTANTS.COMMON.TEST_PWT] = undefined;
      const logStub = sandbox.stub(util, 'log');
      configModule.updatePWTConfig();
      expect(conf.pwt).to.deep.equal({ foo: 'bar', bar: 'baz' });
      expect(logStub.called).to.be.false;
    });

    it('should skip keys not present in config.pwt', function () {
      conf[CONSTANTS.COMMON.TEST_PWT] = { notPresent: 'no' };
      configModule.updatePWTConfig();
      expect(conf.pwt.notPresent).to.be.undefined;
    });
  });

  describe('initConfig', function () {
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
      // Stub all side-effect functions
      sandbox.stub(configModule, 'updateABTestConfig');
      sandbox.stub(configModule, 'addPrebidAdapter');
      sandbox.stub(util, 'forEachOnObject').callsFake((obj, cb) => {
        // Call cb for each key/value in obj
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cb(key, obj[key]);
          }
        }
      });
      // Set up adapters and constants for slot-level param propagation
      conf.adapters = {
        testAdapter: {
          param1: 'value1',
          param2: 'value2',
          klm: {
            slot1: {},
            slot2: {}
          }
        }
      };
      // Add KEY_LOOKUP_MAP to constants
      CONSTANTS.CONFIG.KEY_LOOKUP_MAP = 'klm';
    });
    afterEach(function () {
      sandbox.restore();
    });

    it('should propagate adapter-level params to slot-level config', function () {
      configModule.initConfig();
      // Slot-level params should be set
      expect(conf.adapters.testAdapter.klm.slot1.param1).to.equal('value1');
      expect(conf.adapters.testAdapter.klm.slot1.param2).to.equal('value2');
      expect(conf.adapters.testAdapter.klm.slot2.param1).to.equal('value1');
      expect(conf.adapters.testAdapter.klm.slot2.param2).to.equal('value2');
    });
  });
});
