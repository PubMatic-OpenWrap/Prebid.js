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
          abTestEnabled: "1",
          bidPoolingEnabled: "1"
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
});