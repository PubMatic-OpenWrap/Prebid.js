import * as CONF from '../../../../modules/openWrap/conf.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as COMMON_CONFIG from '../../../../modules/openWrap/common.config.js';
import { expect } from 'chai';

describe('OpenWrap Core Module: common.config.js', function () {
  describe('#getConsentManagementEnabled', function () {
    it('is a function', function () {
      expect(COMMON_CONFIG.getConsentManagementEnabled).to.be.a('function');
    });

    it('should return true when consentManagementEnabled is set to 1', function () {
      CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_ENABLED] = "1";
      expect(COMMON_CONFIG.getConsentManagementEnabled()).to.be.true;
    });

    it('should return false when consentManagementEnabled is set to 0', function () {
      CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_ENABLED] = "0";
      expect(COMMON_CONFIG.getConsentManagementEnabled()).to.be.false;
    });

    it('should return false when consentManagementEnabled is not set', function () {
      delete CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_ENABLED];
      expect(COMMON_CONFIG.getConsentManagementEnabled()).to.be.false;
    });
  });

  describe('#getCmpApi', function () {
    it('is a function', function () {
      expect(COMMON_CONFIG.getCmpApi).to.be.a('function');
    });

    it('should return configured CMP API', function () {
      CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_CMPAPI] = 'iab';
      expect(COMMON_CONFIG.getCmpApi()).to.equal('iab');
    });

    it('should return default when not configured', function () {
      delete CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_CMPAPI];
      expect(COMMON_CONFIG.getCmpApi()).to.equal('iab');
    });
  });

  describe('#getTimeout', function () {
    it('is a function', function () {
      expect(COMMON_CONFIG.getTimeout).to.be.a('function');
    });

    it('should return configured timeout', function () {
      CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_TIMEOUT] = 2000;
      expect(COMMON_CONFIG.getTimeout(CONSTANTS.CONFIG.CONSENT_MANAGEMENT_TIMEOUT, 0)).to.equal(2000);
    });

    it('should return default when not configured', function () {
      delete CONF[CONSTANTS.CONFIG.COMMON][CONSTANTS.CONFIG.CONSENT_MANAGEMENT_TIMEOUT];
      expect(COMMON_CONFIG.getTimeout(CONSTANTS.CONFIG.CONSENT_MANAGEMENT_TIMEOUT, 0)).to.equal(0);
    });
  });
});
