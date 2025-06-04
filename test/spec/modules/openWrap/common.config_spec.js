import * as CONF from '../../../../modules/openWrap/conf.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as COMMON_CONFIG from '../../../../modules/openWrap/common.config.js';
import { expect } from 'chai';

describe('OpenWrap Core Module: common.config.js', function () {
  describe('#getGdprActionTimeout', function () {
    it('is a function', function () {
      expect(COMMON_CONFIG.getGdprActionTimeout).to.be.a('function');
    });

    it('should return 5000, as it is set to 5000 when getGdprActionTimeout is called', function () {
      CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_ACTION_TIMEOUT] = 5000;
      expect(COMMON_CONFIG.getGdprActionTimeout()).to.equal(5000);
    });

    it('should return default value for gdpr action timeout which is 0, as it is NOT set', function () {
      delete CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.GDPR_ACTION_TIMEOUT];
      expect(COMMON_CONFIG.getGdprActionTimeout()).to.equal(0);
    });
  });

  describe('setConsentConfig function', function () {
    let prebidConfig = {};
    const cmpApi = 'iab';
    const timeout = 2000;

    it('setConsentConfig a function', function () {
      expect(COMMON_CONFIG.setConsentConfig).to.be.a('function');
    });

    it('should set consent management config when its not present', function () {
      const expPrebidConfig = {
        consentManagement: {
          gpp: {
            cmpApi,
            timeout
          }
        }
      };
      const actPrebidConfig = COMMON_CONFIG.setConsentConfig(prebidConfig, 'gpp', cmpApi, timeout);
      expect(actPrebidConfig).to.be.deep.equal(expPrebidConfig);
    });

    it('should set consent management config when its present', function () {
      const prebidConfig = {
        consentManagement: {
          gdpr: {
            cmpApi,
            timeout
          }
        }
      };
      const expPrebidConfig = {
        consentManagement: {
          gdpr: {
            cmpApi,
            timeout
          },
          gpp: {
            cmpApi,
            timeout
          }
        }
      };
      const actPrebidConfig = COMMON_CONFIG.setConsentConfig(prebidConfig, 'gpp', cmpApi, timeout);
      expect(actPrebidConfig).to.be.deep.equal(expPrebidConfig);
    });
  });
});
