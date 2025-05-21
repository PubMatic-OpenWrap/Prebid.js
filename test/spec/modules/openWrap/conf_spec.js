import * as conf from '../../../../modules/openWrap/conf.js';
import { config } from '../../../../src/config.js';
import * as utils from '../../../../src/utils.js';

describe('OpenWrap Core Module: conf.js', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    sandbox.restore();
    utils.logError.restore();
  });

  describe('setOWConfig', function () {
    it('should set all configuration properties when valid config is provided', function () {
      const validConfig = {
        pwt: { key: 'value' },
        testConfigDetails: { test: true },
        test_pwt: { testKey: 'testValue' },
        adapters: { adapter1: {} },
        identityPartners: { partner1: {} },
        slotConfig: { slot1: {} },
        alias: { alias1: 'original1' },
        test_adapters: { testAdapter1: {} },
        test_identityPartners: { testPartner1: {} }
      };

      conf.setOWConfig(validConfig);

      expect(conf.pwt).to.deep.equal(validConfig.pwt);
      expect(conf.testConfigDetails).to.deep.equal(validConfig.testConfigDetails);
      expect(conf.test_pwt).to.deep.equal(validConfig.test_pwt);
      expect(conf.adapters).to.deep.equal(validConfig.adapters);
      expect(conf.identityPartners).to.deep.equal(validConfig.identityPartners);
      expect(conf.slotConfig).to.deep.equal(validConfig.slotConfig);
      expect(conf.alias).to.deep.equal(validConfig.alias);
      expect(conf.test_adapters).to.deep.equal(validConfig.test_adapters);
      expect(conf.test_identityPartners).to.deep.equal(validConfig.test_identityPartners);
    });

    it('should log error when config is not provided', function () {
      conf.setOWConfig(null);
      expect(utils.logError.calledWith('OpenWrap config not defined...')).to.be.true;
    });

    it('should log error when config is not an object', function () {
      conf.setOWConfig('not an object');
      expect(utils.logError.calledWith('OpenWrap config not defined...')).to.be.true;
    });

    it('should handle partial configuration', function () {
      const partialConfig = {
        pwt: { key: 'value' },
        adapters: { adapter1: {} }
      };

      conf.setOWConfig(partialConfig);

      expect(conf.pwt).to.deep.equal(partialConfig.pwt);
      expect(conf.adapters).to.deep.equal(partialConfig.adapters);
      expect(conf.testConfigDetails).to.deep.equal({});
      expect(conf.test_pwt).to.deep.equal({});
      expect(conf.identityPartners).to.deep.equal({});
      expect(conf.slotConfig).to.deep.equal({});
      expect(conf.alias).to.deep.equal({});
      expect(conf.test_adapters).to.deep.equal({});
      expect(conf.test_identityPartners).to.deep.equal({});
    });
  });

  describe('Prebid.js Config Integration', function () {
    it('should call setOWConfig when openWrap config is set through Prebid', function () {
      const owConfig = {
        pwt: { key: 'value' }
      };

      config.setConfig({
        openWrap: owConfig
      });

      expect(conf.pwt).to.deep.equal(owConfig.pwt);
    });
  });
});
