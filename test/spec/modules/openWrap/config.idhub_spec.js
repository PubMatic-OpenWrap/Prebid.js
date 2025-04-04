import * as configIdhub from '../../../../modules/openWrap/config.idhub.js';
import * as conf from '../../../../modules/openWrap/conf.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';

describe('OpenWrap Core Module: config.idhub.js', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    // Reset config before each test
    conf.setOWConfig({
      pwt: {},
      [CONSTANTS.CONFIG.COMMON]: {}
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('GDPR Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.GDPR_CONSENT]: '1',
          [CONSTANTS.CONFIG.GDPR_CMPAPI]: 'iab',
          [CONSTANTS.CONFIG.GDPR_TIMEOUT]: '1000',
          [CONSTANTS.CONFIG.GDPR_AWC]: '1'
        }
      });
    });

    it('getGdpr should return correct consent status', function () {
      expect(configIdhub.getGdpr()).to.be.true;
    });

    it('getGdpr should return false when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getGdpr()).to.be.false;
    });

    it('getCmpApi should return configured CMP API', function () {
      expect(configIdhub.getCmpApi()).to.equal('iab');
    });

    it('getCmpApi should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getCmpApi()).to.equal(CONSTANTS.CONFIG.DEFAULT_GDPR_CMPAPI);
    });

    it('getGdprTimeout should return configured timeout', function () {
      expect(configIdhub.getGdprTimeout()).to.equal(1000);
    });

    it('getGdprTimeout should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getGdprTimeout()).to.equal(CONSTANTS.CONFIG.DEFAULT_GDPR_TIMEOUT);
    });

    it('getAwc should return correct AWC status', function () {
      expect(configIdhub.getAwc()).to.be.true;
    });

    it('getAwc should return false when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getAwc()).to.be.false;
    });
  });

  describe('User ID Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.COMMON.ENABLE_USER_ID]: '1',
          [CONSTANTS.COMMON.IDENTITY_ONLY]: '1',
          [CONSTANTS.COMMON.IDENTITY_CONSUMERS]: 'Prebid'
        },
        [CONSTANTS.COMMON.IDENTITY_PARTNERS]: {
          partner1: { enabled: true }
        }
      });
    });

    it('isUserIdModuleEnabled should return correct status', function () {
      expect(configIdhub.isUserIdModuleEnabled()).to.equal(1);
    });

    it('isUserIdModuleEnabled should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.isUserIdModuleEnabled()).to.equal(0);
    });

    it('getIdentityPartners should return configured partners', function () {
      expect(configIdhub.getIdentityPartners()).to.deep.equal({
        partner1: { enabled: true }
      });
    });

    it('isIdentityOnly should return correct status', function () {
      expect(configIdhub.isIdentityOnly()).to.equal(1);
    });

    it('isIdentityOnly should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.isIdentityOnly()).to.equal(0);
    });

    it('getIdentityConsumers should return lowercase consumers', function () {
      expect(configIdhub.getIdentityConsumers()).to.equal('prebid');
    });

    it('getIdentityConsumers should return empty string when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getIdentityConsumers()).to.equal('');
    });
  });

  describe('CCPA Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.CCPA_CONSENT]: '1',
          [CONSTANTS.CONFIG.CCPA_CMPAPI]: 'iab',
          [CONSTANTS.CONFIG.CCPA_TIMEOUT]: '2000'
        }
      });
    });

    it('getCCPA should return correct consent status', function () {
      expect(configIdhub.getCCPA()).to.be.true;
    });

    it('getCCPA should return false when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getCCPA()).to.be.false;
    });

    it('getCCPACmpApi should return configured CMP API', function () {
      expect(configIdhub.getCCPACmpApi()).to.equal('iab');
    });

    it('getCCPACmpApi should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getCCPACmpApi()).to.equal(CONSTANTS.CONFIG.DEFAULT_CCPA_CMPAPI);
    });

    it('getCCPATimeout should return configured timeout', function () {
      expect(configIdhub.getCCPATimeout()).to.equal(2000);
    });

    it('getCCPATimeout should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getCCPATimeout()).to.equal(CONSTANTS.CONFIG.DEFAULT_CCPA_TIMEOUT);
    });
  });

  describe('GPP Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.GPP_CONSENT]: '1',
          [CONSTANTS.CONFIG.GPP_CMPAPI]: 'custom',
          [CONSTANTS.CONFIG.GPP_TIMEOUT]: '3000'
        }
      });
    });

    it('getGppConsent should return correct consent status', function () {
      expect(configIdhub.getGppConsent()).to.be.true;
    });

    it('getGppConsent should return false when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getGppConsent()).to.be.false;
    });

    it('getGppCmpApi should return configured CMP API', function () {
      expect(configIdhub.getGppCmpApi()).to.equal('custom');
    });

    it('getGppCmpApi should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getGppCmpApi()).to.equal(CONSTANTS.CONFIG.DEFAULT_GPP_CMPAPI);
    });

    it('getGppTimeout should return configured timeout', function () {
      expect(configIdhub.getGppTimeout()).to.equal(3000);
    });

    it('getGppTimeout should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getGppTimeout()).to.equal(CONSTANTS.CONFIG.DEFAULT_GPP_TIMEOUT);
    });
  });

  describe('Profile and Publisher Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        pwt: {
          [CONSTANTS.CONFIG.PROFILE_ID]: '123',
          [CONSTANTS.CONFIG.PROFILE_VERSION_ID]: '456',
          [CONSTANTS.CONFIG.PUBLISHER_ID]: '789',
          [CONSTANTS.CONFIG.SSO_ENABLED]: '1'
        }
      });
    });

    it('getProfileID should return configured profile ID', function () {
      expect(configIdhub.getProfileID()).to.equal('123');
    });

    it('getProfileID should return default when not configured', function () {
      conf.setOWConfig({ pwt: {} });
      expect(configIdhub.getProfileID()).to.equal('0');
    });

    it('getProfileDisplayVersionID should return configured version ID', function () {
      expect(configIdhub.getProfileDisplayVersionID()).to.equal('456');
    });

    it('getProfileDisplayVersionID should return default when not configured', function () {
      conf.setOWConfig({ pwt: {} });
      expect(configIdhub.getProfileDisplayVersionID()).to.equal('0');
    });

    it('getPublisherId should return configured publisher ID', function () {
      expect(configIdhub.getPublisherId()).to.equal('789');
    });

    it('getPublisherId should return default when not configured', function () {
      conf.setOWConfig({ pwt: {} });
      expect(configIdhub.getPublisherId()).to.equal('0');
    });

    it('isSSOEnabled should return correct status', function () {
      expect(configIdhub.isSSOEnabled()).to.be.true;
    });

    it('isSSOEnabled should return false when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.isSSOEnabled()).to.be.false;
    });
  });

  describe('Analytics Configuration', function () {
    beforeEach(function () {
      conf.setOWConfig({
        [CONSTANTS.CONFIG.COMMON]: {
          [CONSTANTS.CONFIG.ENABLE_PB_IH_ANALYTICS]: '1',
          [CONSTANTS.COMMON.IH_ANALYTICS_ADAPTER_EXPIRY]: '3600',
          [CONSTANTS.COMMON.PBJS_NAMESPACE]: 'customPbjs',
          [CONSTANTS.COMMON.OWVERSION]: '1.0.0',
          [CONSTANTS.COMMON.PBVERSION]: '2.0.0'
        }
      });
    });

    it('isPubMaticIHAnalyticsEnabled should return correct status', function () {
      expect(configIdhub.isPubMaticIHAnalyticsEnabled()).to.equal(1);
    });

    it('isPubMaticIHAnalyticsEnabled should return 1 when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.isPubMaticIHAnalyticsEnabled()).to.equal(1);
    });

    it('getIHAnalyticsAdapterExpiry should return configured expiry', function () {
      expect(configIdhub.getIHAnalyticsAdapterExpiry()).to.equal(3600);
    });

    it('getIHAnalyticsAdapterExpiry should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getIHAnalyticsAdapterExpiry()).to.equal(CONSTANTS.COMMON.IH_ANALYTICS_ADAPTER_DEFAULT_EXPIRY);
    });

    it('getPBJSNamespace should return configured namespace', function () {
      expect(configIdhub.getPBJSNamespace()).to.equal('customPbjs');
    });

    it('getPBJSNamespace should return default when not configured', function () {
      conf.setOWConfig({ [CONSTANTS.CONFIG.COMMON]: {} });
      expect(configIdhub.getPBJSNamespace()).to.equal('pbjs');
    });

    it('getOwVersion should return correct version', function () {
      expect(configIdhub.getOwVersion()).to.equal('1.0.0');
    });

    it('getPrebidVersion should return correct version', function () {
      expect(configIdhub.getPrebidVersion()).to.equal('2.0.0');
    });
  });
});