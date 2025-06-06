import {
  getConsentResolverConfigInstance,
  getConsentResolverConfig,
  setCMPTime,
  getGeoInfoWrapper,
  getConsentManagementConfig,
  handleGDPR,
  handleGPP,
  checkCMPsPresentOnPage,
  getCMPLookUpTimeout,
  configureGDPR,
  configureUSP,
  configureGPP,
  getCmpApiAndTimeout,
  CONSENT_CONSTANTS,
  CMP_APIs
} from '../../../../modules/openWrap/modules/consentConfigResolver.js';
import * as consentConfigResolver from '../../../../modules/openWrap/modules/consentConfigResolver.js';
import * as commonUtil from '../../../../modules/openWrap/common.util.js';
import * as util from '../../../../modules/openWrap/util.js';
import * as timeMetrics from '../../../../modules/openWrap/modules/timeMetrics.js';
import * as COMMON_CONFIG from '../../../../modules/openWrap/common.config.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';

describe('OpenWrap Core Module: ConsentConfigResolver.js', function() {
  let sandbox;
  let clock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();

    // Set up window.PWT
    window.PWT = window.PWT || {};
    window.PWT.cmConfig = {
      cmpPresent: 0,
      complianceSupport: []
    };

    // Stub timeMetrics methods
    sandbox.stub(timeMetrics, 'recordEntryTime');
    sandbox.stub(timeMetrics, 'recordExitTime');

    // Stub getGlobalOwObject to return window.PWT
    sandbox.stub(commonUtil, 'getGlobalOwObject').returns(window.PWT);

    // Completely stub getGeoInfo to avoid calling actual implementation
    sandbox.stub(commonUtil, 'getGeoInfo').callsFake(function(readFrom, callback) {
      if (callback) {
        callback(readFrom.GEO_SERVICE, { cc: 'US', sc: 'CA' });
      }
    });

    // Set up getDurationOf on window.PWT
    window.PWT.getDurationOf = sandbox.stub().returns(false);

    // Stub other potentially needed methods
    sandbox.stub(commonUtil, 'shouldThrottle').returns(false);
    sandbox.stub(util, 'isNumber').callsFake(value => typeof value === 'number');
  });

  afterEach(function() {
    sandbox.restore();
    clock.restore();
  });

  describe('getConsentResolverConfigInstance', function() {
    // We can't easily reset the singleton between tests in Sinon/Mocha without modifying the module internals
    // So we'll structure our tests to account for this limitation

    it('should return a ConsentResolverConfig instance', function() {
      const instance = getConsentResolverConfigInstance();
      
      // Verify it's an object with the expected methods
      expect(instance).to.be.an('object');
      expect(instance.reset).to.be.a('function');
      expect(instance.getConsentManagementEnabled).to.be.a('function');
      expect(instance.getProcessCompleted).to.be.a('function');
      expect(instance.getComplianceSupport).to.be.a('function');
      expect(instance.getPrebidCMConfig).to.be.a('function');
      expect(instance.setConsentManagementEnabled).to.be.a('function');
      expect(instance.setCmpPresent).to.be.a('function');
      expect(instance.setProcessCompleted).to.be.a('function');
      expect(instance.executeCallbackFunctions).to.be.a('function');
      expect(instance.setCmpId).to.be.a('function');
      expect(instance.setEnforcedConsentBasisOn).to.be.a('function');
      expect(instance.setGeoMatchWithCMP).to.be.a('function');
      expect(instance.setGeoInfo).to.be.a('function');
      expect(instance.setPrebidCMConfig).to.be.a('function');
      expect(instance.setComplianceSupport).to.be.a('function');
      expect(instance.getProperties).to.be.a('function');
      
      // Reset the instance for subsequent tests
      instance.reset();
    });

    it('should always return the same instance (singleton pattern)', function() {
      const instance1 = getConsentResolverConfigInstance();
      const instance2 = getConsentResolverConfigInstance();
      const instance3 = getConsentResolverConfigInstance();
      
      // All instances should be the same object reference
      expect(instance1).to.equal(instance2);
      expect(instance2).to.equal(instance3);
      
      // Modifying one instance should affect all others
      instance1.testProperty = 'test value';
      expect(instance2.testProperty).to.equal('test value');
      expect(instance3.testProperty).to.equal('test value');
      
      // Clean up for subsequent tests
      delete instance1.testProperty;
      instance1.reset();
    });

    it('should initialize the instance with default values', function() {
      const instance = getConsentResolverConfigInstance();
      
      // Make sure we start with a clean instance
      instance.reset();
      
      // Check that the config object is initialized with default values
      expect(instance.config).to.be.an('object');
      expect(instance.config.consentManagementEnabled).to.be.false;
      expect(instance.config.processCompleted).to.be.false;
      expect(instance.config.cmpPresent).to.be.false;
      expect(instance.config.complianceSupport).to.be.an('array').that.is.empty;
      expect(instance.config.cmpId).to.equal(0);
      expect(instance.config.geoInfo).to.be.an('object');
      expect(instance.config.prebidCMConfig).to.be.an('object');
      expect(instance.config.callbackFunctions).to.be.an('array').that.is.empty;
    });

    it('should maintain state between calls', function() {
      const instance1 = getConsentResolverConfigInstance();
      
      // Reset to ensure we start clean
      instance1.reset();
      
      // Modify the instance
      instance1.setConsentManagementEnabled(true);
      instance1.setCmpPresent(true);
      instance1.setCmpId(123);
      
      // Get another reference to the instance
      const instance2 = getConsentResolverConfigInstance();
      
      // Check that the state is maintained
      expect(instance2.getConsentManagementEnabled()).to.be.true;
      expect(instance2.config.cmpPresent).to.be.true;
      expect(instance2.config.cmpId).to.equal(123);
      
      // Reset for subsequent tests
      instance1.reset();
    });

    it('should reset the instance correctly', function() {
      const instance = getConsentResolverConfigInstance();
      
      // Modify the instance
      instance.setConsentManagementEnabled(true);
      instance.setCmpPresent(true);
      instance.setCmpId(123);
      instance.setComplianceSupport(1);
      
      // Reset the instance
      instance.reset();
      
      // Check that all values are reset to defaults
      expect(instance.getConsentManagementEnabled()).to.be.false;
      expect(instance.config.cmpPresent).to.be.false;
      expect(instance.config.cmpId).to.equal(0);
      expect(instance.config.complianceSupport).to.be.an('array').that.is.empty;
    });
  });

  describe('getConsentResolverConfig', function() {
    it('should return properties from the ConsentResolverConfig instance', function() {
      const instance = getConsentResolverConfigInstance();
      
      // Reset to ensure we start clean
      instance.reset();
      
      // Set some test values
      instance.setConsentManagementEnabled(true);
      instance.setCmpPresent(true);
      instance.setCmpId(123);
      instance.setComplianceSupport(1);
      instance.setComplianceSupport(2);
      instance.setEnforcedConsentBasisOn(1);
      instance.setGeoInfo(2, { sc: 'CA' });
      
      // Call the function
      const result = getConsentResolverConfig();
      
      // Verify the result contains the expected properties
      expect(result).to.be.an('object');
      expect(result.ccme).to.equal(1); // consentManagementEnabled converted to 1
      expect(result.ccmp).to.equal(1); // cmpPresent converted to 1
      expect(result.ccmps).to.deep.equal([1, 2]); // complianceSupport array
      expect(result.ccmpid).to.equal(123); // cmpId
      expect(result.csc).to.equal('CA'); // geoInfo.sc
      expect(result.cecbo).to.equal(1); // enforcedConsentBasisOn
      expect(result.crgdf).to.equal(2); // readGeoDataFrom
      
      // Reset for subsequent tests
      instance.reset();
    });

    it('should convert boolean values to 0/1 in the returned properties', function() {
      const instance = getConsentResolverConfigInstance();
      
      // Reset to ensure we start clean
      instance.reset();
      
      // Test with consentManagementEnabled = false
      instance.setConsentManagementEnabled(false);
      instance.setCmpPresent(false);
      
      let result = getConsentResolverConfig();
      expect(result.ccme).to.equal(0); // false converted to 0
      expect(result.ccmp).to.equal(0); // false converted to 0
      
      // Test with consentManagementEnabled = true
      instance.setConsentManagementEnabled(true);
      instance.setCmpPresent(true);
      
      result = getConsentResolverConfig();
      expect(result.ccme).to.equal(1); // true converted to 1
      expect(result.ccmp).to.equal(1); // true converted to 1
      
      // Reset for subsequent tests
      instance.reset();
    });

    it('should be accessible via the global object', function() {
      // Verify the function is attached to the global object
      expect(window.PWT.getConsentResolverConfig).to.equal(getConsentResolverConfig);
      
      // Call it through the global object and verify it works
      const result = window.PWT.getConsentResolverConfig();
      expect(result).to.be.an('object');
      expect(result).to.have.property('ccme');
      expect(result).to.have.property('ccmp');
      expect(result).to.have.property('ccmps');
    });
  });

  describe('setCMPTime', function() {
    afterEach(function() {
      // Reset the timeMetrics stub behavior for each test
      timeMetrics.getDurationOf.reset();
      timeMetrics.recordExitTime.reset();
    });

    it('should record exit time when getDurationOf returns falsy and timeExceeded is false', function() {
      // Setup timeMetrics.getDurationOf to return falsy
      timeMetrics.getDurationOf = sandbox.stub().returns(false);
      
      // Call the function with timeExceeded = false
      setCMPTime(false);
      
      // Verify getDurationOf was called with the correct key
      expect(timeMetrics.getDurationOf.calledWith('CMP_CALLING_TIME')).to.be.true;
      
      // Verify recordExitTime was called with the correct parameters
      expect(timeMetrics.recordExitTime.calledWith('CMP_CALLING_TIME', null)).to.be.true;
    });

    it('should record exit time with default timeout when getDurationOf returns falsy and timeExceeded is true', function() {
      // Setup timeMetrics.getDurationOf to return falsy
      timeMetrics.getDurationOf = sandbox.stub().returns(false);
      
      // Call the function with timeExceeded = true
      setCMPTime(true);
      
      // Verify getDurationOf was called with the correct key
      expect(timeMetrics.getDurationOf.calledWith('CMP_CALLING_TIME')).to.be.true;
      
      // Verify recordExitTime was called with the correct parameters (default timeout = 1500)
      expect(timeMetrics.recordExitTime.calledWith('CMP_CALLING_TIME', 1500)).to.be.true;
    });

    it('should not record exit time when getDurationOf returns truthy', function() {
      // Setup timeMetrics.getDurationOf to return truthy
      timeMetrics.getDurationOf = sandbox.stub().returns(true);
      
      // Call the function with timeExceeded = false
      setCMPTime(false);
      
      // Verify getDurationOf was called with the correct key
      expect(timeMetrics.getDurationOf.calledWith('CMP_CALLING_TIME')).to.be.true;
      
      // Verify recordExitTime was not called
      expect(timeMetrics.recordExitTime.called).to.be.false;
    });

    it('should handle edge cases for timeExceeded parameter', function() {
      // Setup timeMetrics.getDurationOf to return falsy
      timeMetrics.getDurationOf = sandbox.stub().returns(false);
      
      // Test with undefined
      setCMPTime(undefined);
      expect(timeMetrics.recordExitTime.lastCall.args[1]).to.equal(null);
      timeMetrics.recordExitTime.reset();
      
      // Test with null
      setCMPTime(null);
      expect(timeMetrics.recordExitTime.lastCall.args[1]).to.equal(null);
      timeMetrics.recordExitTime.reset();
      
      // Test with 0
      setCMPTime(0);
      expect(timeMetrics.recordExitTime.lastCall.args[1]).to.equal(null);
      timeMetrics.recordExitTime.reset();
      
      // Test with empty string
      setCMPTime('');
      expect(timeMetrics.recordExitTime.lastCall.args[1]).to.equal(null);
      timeMetrics.recordExitTime.reset();
      
      // Test with non-boolean truthy value
      setCMPTime('yes');
      expect(timeMetrics.recordExitTime.lastCall.args[1]).to.equal(1500);
    });
  });

  describe('handleGDPR', function() {
    beforeEach(function() {
      // Get a fresh instance and reset it
      const instance = getConsentResolverConfigInstance();
      instance.reset();
    });

    it('should set cmpId when pingReturnData contains cmpId', function() {
      // Call the function with valid pingReturnData
      handleGDPR({ cmpId: 123 }, true);
      
      // Verify cmpId was set correctly
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpId).to.equal(123);
    });

    it('should not set cmpId when pingReturnData is null or undefined', function() {
      // Set an initial value
      const instance = getConsentResolverConfigInstance();
      instance.setCmpId(456);
      
      // Call the function with null
      handleGDPR(null, true);
      expect(instance.config.cmpId).to.equal(0); // setCmpId sets to 0 for falsy values
      
      // Reset and try again with undefined
      instance.setCmpId(456);
      handleGDPR(undefined, true);
      expect(instance.config.cmpId).to.equal(0);
    });

    it('should not set cmpId when pingReturnData does not contain cmpId', function() {
      // Set an initial value
      const instance = getConsentResolverConfigInstance();
      instance.setCmpId(456);
      
      // Call the function with an object that doesn't have cmpId
      handleGDPR({}, true);
      expect(instance.config.cmpId).to.equal(0);
    });

    it('should ignore the success parameter', function() {
      // Call with success = false but valid pingReturnData
      handleGDPR({ cmpId: 789 }, false);
      
      // Verify cmpId was still set correctly
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpId).to.equal(789);
    });
  });

  describe('handleGPP', function() {
    beforeEach(function() {
      // Get a fresh instance and reset it
      const instance = getConsentResolverConfigInstance();
      instance.reset();
    });

    it('should set cmpId when pingReturnData contains pingData.cmpId', function() {
      // Call the function with valid pingReturnData
      handleGPP({ pingData: { cmpId: 123 } }, true);
      
      // Verify cmpId was set correctly
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpId).to.equal(123);
    });

    it('should not set cmpId when pingReturnData is null or undefined', function() {
      // Set an initial value
      const instance = getConsentResolverConfigInstance();
      instance.setCmpId(456);
      
      // Call the function with null
      handleGPP(null, true);
      expect(instance.config.cmpId).to.equal(0);
      
      // Reset and try again with undefined
      instance.setCmpId(456);
      handleGPP(undefined, true);
      expect(instance.config.cmpId).to.equal(0);
    });

    it('should not set cmpId when pingReturnData does not contain pingData', function() {
      // Set an initial value
      const instance = getConsentResolverConfigInstance();
      instance.setCmpId(456);
      
      // Call the function with an object that doesn't have pingData
      handleGPP({}, true);
      expect(instance.config.cmpId).to.equal(0);
    });

    it('should not set cmpId when pingData does not contain cmpId', function() {
      // Set an initial value
      const instance = getConsentResolverConfigInstance();
      instance.setCmpId(456);
      
      // Call the function with pingData that doesn't have cmpId
      handleGPP({ pingData: {} }, true);
      expect(instance.config.cmpId).to.equal(0);
    });

    it('should ignore the success parameter', function() {
      // Call with success = false but valid pingReturnData
      handleGPP({ pingData: { cmpId: 789 } }, false);
      
      // Verify cmpId was still set correctly
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpId).to.equal(789);
    });
  });

  describe('getCmpApiAndTimeout', function() {
    beforeEach(function() {
      // Stub COMMON_CONFIG methods
      sandbox.stub(COMMON_CONFIG, 'getCmpApi');
      sandbox.stub(COMMON_CONFIG, 'getTimeout');
    });

    it('should return an object with cmpApi and timeout properties', function() {
      // Setup stubs to return test values
      COMMON_CONFIG.getCmpApi.returns('iab');
      COMMON_CONFIG.getTimeout.returns(2000);
      
      // Call the function
      const result = getCmpApiAndTimeout();
      
      // Verify the result
      expect(result).to.be.an('object');
      expect(result).to.have.property('cmpApi', 'iab');
      expect(result).to.have.property('timeout', 2000);
    });

    it('should call getCmpApi with the correct constant', function() {
      // Call the function
      getCmpApiAndTimeout();
      
      // Verify getCmpApi was called with the correct constant
      expect(COMMON_CONFIG.getCmpApi.calledOnce).to.be.true;
      expect(COMMON_CONFIG.getCmpApi.args[0][0]).to.equal(CONSTANTS.CONFIG.CONSENT_MANAGEMENT_CMPAPI);
    });

    it('should call getTimeout with the correct constant and default value', function() {
      // Call the function
      getCmpApiAndTimeout();
      
      // Verify getTimeout was called with the correct constant and default value
      expect(COMMON_CONFIG.getTimeout.calledOnce).to.be.true;
      expect(COMMON_CONFIG.getTimeout.args[0][0]).to.equal(CONSTANTS.CONFIG.CONSENT_MANAGEMENT_TIMEOUT);
      expect(COMMON_CONFIG.getTimeout.args[0][1]).to.equal(1000);
    });
  });

  describe('configureGDPR', function() {
    beforeEach(function() {
      // Get a fresh instance and reset it
      const instance = getConsentResolverConfigInstance();
      instance.reset();
      
      // Stub isNumber to control its behavior
      sandbox.stub(commonUtil, 'isNumber');
    });

    it('should set prebidCMConfig with gdpr configuration', function() {
      // Call the function
      configureGDPR();
      
      // Get the instance and verify prebidCMConfig
      const instance = getConsentResolverConfigInstance();
      const gdprConfig = instance.config.prebidCMConfig.gdpr;
      
      // Verify the configuration
      expect(gdprConfig).to.be.an('object');
      expect(gdprConfig.defaultGdprScope).to.be.true;
      expect(gdprConfig.cmpApi).to.equal('iab');
      expect(gdprConfig.timeout).to.equal(1000);
    });

    it('should include actionTimeout when it exists in the global object', function() {
      // Setup global object with actionTimeout
      window.PWT.actionTimeout = 3000;
      commonUtil.isNumber.returns(true);
      
      // Call the function
      configureGDPR();
      
      // Get the instance and verify prebidCMConfig
      const instance = getConsentResolverConfigInstance();
      const gdprConfig = instance.config.prebidCMConfig.gdpr;
      
      // Verify actionTimeout was included
      expect(gdprConfig.actionTimeout).to.equal(3000);
    });

    it('should not include actionTimeout when it is not a number', function() {
      // Setup global object with non-numeric actionTimeout
      window.PWT.actionTimeout = 'not a number';
      commonUtil.isNumber.returns(false);
      
      // Call the function
      configureGDPR();
      
      // Get the instance and verify prebidCMConfig
      const instance = getConsentResolverConfigInstance();
      const gdprConfig = instance.config.prebidCMConfig.gdpr;
      
      // Verify actionTimeout was not included
      expect(gdprConfig.actionTimeout).to.be.undefined;
    });

    it('should not include actionTimeout when it does not exist in the global object', function() {
      // Ensure actionTimeout is not defined
      delete window.PWT.actionTimeout;
      
      // Call the function
      configureGDPR();
      
      // Get the instance and verify prebidCMConfig
      const instance = getConsentResolverConfigInstance();
      const gdprConfig = instance.config.prebidCMConfig.gdpr;
      
      // Verify actionTimeout was not included
      expect(gdprConfig.actionTimeout).to.be.undefined;
    });
  });

  describe('configureUSP', function() {
    beforeEach(function() {
      // Get a fresh instance and reset it
      const instance = getConsentResolverConfigInstance();
      instance.reset();
      
    });

    it('should set prebidCMConfig with usp configuration', function() {
      // Call the function
      configureUSP();
      
      // Get the instance and verify prebidCMConfig
      const instance = getConsentResolverConfigInstance();
      const uspConfig = instance.config.prebidCMConfig.usp;
      
      // Verify the configuration
      expect(uspConfig).to.be.an('object');
      expect(uspConfig.cmpApi).to.equal('iab');
      expect(uspConfig.timeout).to.equal(1000);
    });
  });

  describe('configureGPP', function() {
    beforeEach(function() {
      // Get a fresh instance and reset it
      const instance = getConsentResolverConfigInstance();
      instance.reset();
      
    });

    it('should set prebidCMConfig with gpp configuration', function() {
      // Call the function
      configureGPP();
      
      // Get the instance and verify prebidCMConfig
      const instance = getConsentResolverConfigInstance();
      const gppConfig = instance.config.prebidCMConfig.gpp;
      
      // Verify the configuration
      expect(gppConfig).to.be.an('object');
      expect(gppConfig.cmpApi).to.equal('iab');
      expect(gppConfig.timeout).to.equal(1000);
    });
  });

  describe('getCMPLookUpTimeout', function() {
    beforeEach(function() {
      // Reset the stub behavior for each test
      commonUtil.getGlobalOwObject.reset();
      // Note: We don't need to reset isNumber since it's already stubbed in the main beforeEach
    });

    it('should return the value from global object when it exists and is a number', function() {
      // Set up the global object with a custom timeout
      window.PWT.cmpLookUpTimeout = 2000;
      
      // Setup stubs to return expected values
      commonUtil.getGlobalOwObject.returns(window.PWT);
      // Use the existing stub behavior for isNumber
      util.isNumber.callsFake(() => true);
      
      // Call the function
      const result = getCMPLookUpTimeout();
      
      // Verify the result
      expect(result).to.equal(2000);
      
      // Verify getGlobalOwObject was called
      expect(commonUtil.getGlobalOwObject.called).to.be.true;
    });

    it('should return the default timeout when global object does not exist', function() {
      // Setup stubs to return null for global object
      commonUtil.getGlobalOwObject.returns(null);
      
      // Call the function
      const result = getCMPLookUpTimeout();
      
      // Verify the result is the default timeout
      expect(result).to.equal(CONSENT_CONSTANTS.DEFAULT_CMP_LOOK_UP_TIMEOUT);
      
      // Verify getGlobalOwObject was called
      expect(commonUtil.getGlobalOwObject.called).to.be.true;
    });

    it('should return the default timeout when cmpLookUpTimeout is not a number', function() {
      // Set up the global object with a non-numeric timeout
      window.PWT.cmpLookUpTimeout = 'not a number';
      
      // Setup stubs to return expected values
      commonUtil.getGlobalOwObject.returns(window.PWT);
      // Use the existing stub behavior for isNumber
      util.isNumber.callsFake(() => false);
      
      // Call the function
      const result = getCMPLookUpTimeout();
      
      // Verify the result is the default timeout
      expect(result).to.equal(CONSENT_CONSTANTS.DEFAULT_CMP_LOOK_UP_TIMEOUT);
      
      // Verify getGlobalOwObject was called
      expect(commonUtil.getGlobalOwObject.called).to.be.true;
    });

    it('should return the default timeout when cmpLookUpTimeout is not defined', function() {
      // Set up the global object without cmpLookUpTimeout
      delete window.PWT.cmpLookUpTimeout;
      
      // Setup stubs to return expected values
      commonUtil.getGlobalOwObject.returns(window.PWT);
      // Use the existing stub behavior for isNumber
      util.isNumber.callsFake(() => false);
      
      // Call the function
      const result = getCMPLookUpTimeout();
      
      // Verify the result is the default timeout
      expect(result).to.equal(CONSENT_CONSTANTS.DEFAULT_CMP_LOOK_UP_TIMEOUT);
      
      // Verify getGlobalOwObject was called
      expect(commonUtil.getGlobalOwObject.called).to.be.true;
    });
  });

  describe('getGeoInfoWrapper', function() {
    beforeEach(function() {
      // Reset the timeMetrics stubs
      timeMetrics.recordEntryTime.reset();
      timeMetrics.recordExitTime.reset();
      
      // Reset the commonUtil stubs
      commonUtil.getGeoInfo.reset();
      
      // Reset the crConfig instance
      const instance = getConsentResolverConfigInstance();
      instance.reset();
    });

    it('should record entry time with default timeout', function() {
      // Call the function
      getGeoInfoWrapper();
      
      // Verify recordEntryTime was called with the correct parameters
      expect(timeMetrics.recordEntryTime.calledOnce).to.be.true;
      expect(timeMetrics.recordEntryTime.calledWith('GEO_CALLING_TIME', 1500)).to.be.true;
    });

    it('should call getGeoInfo with the correct parameters', function() {
      // Call the function
      getGeoInfoWrapper();
      
      // Verify getGeoInfo was called with the correct parameters
      expect(commonUtil.getGeoInfo.calledOnce).to.be.true;
      expect(commonUtil.getGeoInfo.args[0][0]).to.equal(CONSENT_CONSTANTS.READ_GEO_DATA_FROM);
      expect(commonUtil.getGeoInfo.args[0][1]).to.be.a('function');
    });

    it('should set geo info and record exit time when callback is executed', function() {
      // Spy on setGeoInfo
      const instance = getConsentResolverConfigInstance();
      const setGeoInfoSpy = sandbox.spy(instance, 'setGeoInfo');
      
      // Call the function
      getGeoInfoWrapper();
      
      // Get the callback function
      const callback = commonUtil.getGeoInfo.args[0][1];
      
      // Execute the callback with test data
      const readFrom = 'GEO_SERVICE';
      const geoInfo = { cc: 'US', sc: 'CA' };
      callback(readFrom, geoInfo);
      
      // Verify setGeoInfo was called with the correct parameters
      expect(setGeoInfoSpy.calledOnce).to.be.true;
      expect(setGeoInfoSpy.calledWith(readFrom, geoInfo)).to.be.true;
      
      // Verify recordExitTime was called
      expect(timeMetrics.recordExitTime.calledOnce).to.be.true;
      expect(timeMetrics.recordExitTime.calledWith('GEO_CALLING_TIME')).to.be.true;
    });

    it('should handle different geo info data formats', function() {
      // Spy on setGeoInfo
      const instance = getConsentResolverConfigInstance();
      const setGeoInfoSpy = sandbox.spy(instance, 'setGeoInfo');
      
      // Call the function
      getGeoInfoWrapper();
      
      // Get the callback function
      const callback = commonUtil.getGeoInfo.args[0][1];
      
      // Test with minimal data
      callback('GEO_SERVICE', { cc: 'DE' });
      expect(setGeoInfoSpy.lastCall.args[1]).to.deep.equal({ cc: 'DE' });
      
      // Test with more fields
      callback('GEO_SERVICE', { cc: 'FR', sc: 'IDF', gc: 1, gsId: '123' });
      expect(setGeoInfoSpy.lastCall.args[1]).to.deep.equal({ 
        cc: 'FR', 
        sc: 'IDF', 
        gc: 1, 
        gsId: '123' 
      });
      
      // Test with empty object
      callback('GEO_SERVICE', {});
      expect(setGeoInfoSpy.lastCall.args[1]).to.deep.equal({});
    });
  });

  describe('checkCMPsPresentOnPage', function() {
    
    beforeEach(function() {
      // Reset the crConfig instance
      const instance = getConsentResolverConfigInstance();
      instance.reset();
      
    });

    

    it('should detect GDPR CMP and set up configuration', function() {
      // Mock the __tcfapi function
      window.__tcfapi = sandbox.stub();
      
      // Call the function
      checkCMPsPresentOnPage();
      
      // Verify the CMP was detected
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpPresent).to.be.true;
      expect(instance.config.complianceSupport).to.include(1); // GDPR
      
      // Verify addEventListener was called
      expect(window.__tcfapi.calledOnce).to.be.true;
      expect(window.__tcfapi.calledWith('addEventListener', 2, handleGDPR)).to.be.true;
      
    });

    it('should detect USP CMP and set up configuration', function() {
      // Mock the __uspapi function
      window.__uspapi = sandbox.stub();
      
      // Call the function
      checkCMPsPresentOnPage();
      
      // Verify the CMP was detected
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpPresent).to.be.true;
      expect(instance.config.complianceSupport).to.include(2); // USP
      
    });

    it('should detect GPP CMP and set up configuration', function() {
      // Mock the __gpp function
      window.__gpp = sandbox.stub();
      
      // Call the function
      checkCMPsPresentOnPage();
      
      // Verify the CMP was detected
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpPresent).to.be.true;
      expect(instance.config.complianceSupport).to.include(3); // GPP
      
      // Verify addEventListener was called
      expect(window.__gpp.calledOnce).to.be.true;
      expect(window.__gpp.calledWith('addEventListener', handleGPP)).to.be.true;
    });

    it('should detect CMP via locator frame', function() {
      // Create a frames object with a locator
      window.frames = {
        __tcfapiLocator: {}
      };
      
      // Call the function
      checkCMPsPresentOnPage();
      
      // Verify the CMP was detected
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpPresent).to.be.true;
      expect(instance.config.complianceSupport).to.include(1); // GDPR
    });

    it('should handle multiple CMPs on the page', function() {
      // Mock multiple CMP functions
      window.__tcfapi = sandbox.stub();
      window.__uspapi = sandbox.stub();
      window.__gpp = sandbox.stub();
      
          // Stub the prepareConfig methods
      const gdprPrepareConfigStub = sandbox.stub();
      const uspPrepareConfigStub = sandbox.stub();
      const gppPrepareConfigStub = sandbox.stub();
      CMP_APIs.GDPR.prepareConfig = gdprPrepareConfigStub;
      CMP_APIs.USP.prepareConfig = uspPrepareConfigStub;
      CMP_APIs.GPP.prepareConfig = gppPrepareConfigStub;
      
      // Call the function
      checkCMPsPresentOnPage();
      
      // Verify the CMPs were detected
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpPresent).to.be.true;
      expect(instance.config.complianceSupport).to.include(1); // GDPR
      expect(instance.config.complianceSupport).to.include(2); // USP
      expect(instance.config.complianceSupport).to.include(3); // GPP
      
      // Verify prepareConfig was called for each CMP
      expect(gdprPrepareConfigStub.calledOnce).to.be.true;
      expect(uspPrepareConfigStub.calledOnce).to.be.true;
      expect(gppPrepareConfigStub.calledOnce).to.be.true;
    });

    it('should handle no CMPs on the page', function() {
      // Ensure no CMP functions are defined
      delete window.__tcfapi;
      delete window.__uspapi;
      delete window.__gpp;
      delete window.frames.__tcfapiLocator;
      delete window.frames.__uspApiLocator;
      delete window.frames.__gppLocator;
      
      // Call the function
      checkCMPsPresentOnPage();
      
      // Verify no CMPs were detected
      const instance = getConsentResolverConfigInstance();
      expect(instance.config.cmpPresent).to.be.false;
      expect(instance.config.complianceSupport).to.be.empty;
    });
  });

  describe('getConsentManagementConfig', function() {
    let callbackSpy;
    let crConfigInstance;
    let originalGetGlobalOwObject;
    
    beforeEach(function() {
      // Reset the crConfig instance
      crConfigInstance = getConsentResolverConfigInstance();
      crConfigInstance.reset();
      
      // Create a spy for the callback function
      callbackSpy = sandbox.spy();
      
      // Stub getPrebidCMConfig to return an empty object
      sandbox.stub(crConfigInstance, 'getPrebidCMConfig').returns({});
      
      // Save original functions before stubbing
      originalGetGlobalOwObject = commonUtil.getGlobalOwObject;
      
      // Stub imported functions
      sandbox.stub(consentConfigResolver, 'checkCMPsPresentOnPage');
      sandbox.stub(consentConfigResolver, 'setCMPTime');
      sandbox.stub(consentConfigResolver, 'getGeoInfoWrapper');
      sandbox.stub(consentConfigResolver, 'getCMPLookUpTimeout').returns(100);
      
      // Stub COMMON_CONFIG.getConsentManagementEnabled
      sandbox.stub(COMMON_CONFIG, 'getConsentManagementEnabled');

    });
    
    afterEach(function() {
      // Restore original functions
      commonUtil.getGlobalOwObject = originalGetGlobalOwObject;
    });
    
    it('should execute callback immediately when consent management is disabled', function() {
      // Setup COMMON_CONFIG.getConsentManagementEnabled to return false
      COMMON_CONFIG.getConsentManagementEnabled.returns(false);
      
      // Call the function
      getConsentManagementConfig(callbackSpy);
      
      // Verify timeMetrics.recordEntryTime was called
      expect(timeMetrics.recordEntryTime.calledWith('CONSENT_CONFIG_RESOLVER_TIME')).to.be.true;
      
      // Verify callback was executed immediately
      expect(callbackSpy.calledOnce).to.be.true;
      
      // Verify timeMetrics.recordExitTime was called
      expect(timeMetrics.recordExitTime.calledWith('CONSENT_CONFIG_RESOLVER_TIME')).to.be.true;
      
      // Verify crConfig.setEnforcedConsentBasisOn was called with NONE
      expect(crConfigInstance.config.enforcedConsentBasisOn).to.equal(CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.NONE);
      
      // Verify crConfig.setProcessCompleted was called with true
      expect(crConfigInstance.config.processCompleted).to.be.true;
    });
    
    it('should set up CMP detection when consent management is enabled', function() {
      // Setup COMMON_CONFIG.getConsentManagementEnabled to return true
      COMMON_CONFIG.getConsentManagementEnabled.returns(true);
      
      // Call the function
      getConsentManagementConfig(callbackSpy);
      
      // Verify crConfig.setConsentManagementEnabled was called with true
      expect(crConfigInstance.config.consentManagementEnabled).to.be.true;
      
    });
    
    it('should execute callback with CMP source when CMP is found', function() {
      // Setup COMMON_CONFIG.getConsentManagementEnabled to return true
      COMMON_CONFIG.getConsentManagementEnabled.returns(true);

      window.__tcfapi = sandbox.stub();
      
      // Call the function
      getConsentManagementConfig(callbackSpy);
      
      // Verify callback was executed
      expect(callbackSpy.called).to.be.true;
      
      // Verify crConfig.setEnforcedConsentBasisOn was called with CMP
      expect(crConfigInstance.config.enforcedConsentBasisOn).to.equal(CONSENT_CONSTANTS.CONSENT_MANAGEMENT_SOURCE.CMP);
    });
      
    it('should only execute callback once even if CMP is found after timeout', function() {
      // Setup COMMON_CONFIG.getConsentManagementEnabled to return true
      COMMON_CONFIG.getConsentManagementEnabled.returns(true);
      
      // Replace getGlobalOwObject with a function that returns an object with CC and gc
      commonUtil.getGlobalOwObject = function() {
        return { CC: { gc: 1 } };
      };
      
      // Setup commonUtil.getKeyByValue to return 'GDPR'
      sandbox.stub(commonUtil, 'getKeyByValue').returns('GDPR');
      
      // Store original prepareConfig
      const originalPrepareConfig = CMP_APIs.GDPR.prepareConfig;
      
      // Setup CMP_APIs.GDPR.prepareConfig
      CMP_APIs.GDPR.prepareConfig = sandbox.stub();
      
      // Call the function
      getConsentManagementConfig(callbackSpy);
      
      // Fast-forward time to trigger timeout
      clock.tick(100);
      
      // Now simulate CMP found
      crConfigInstance.config.complianceSupport = [1]; // Add GDPR compliance directly
      
      // Fast-forward time to trigger recursive check
      clock.tick(50);
      
      // Verify callback was still only called once
      expect(callbackSpy.calledOnce).to.be.true;
      
      // Restore original prepareConfig
      CMP_APIs.GDPR.prepareConfig = originalPrepareConfig;
    });
    
    it('should clear timeout when CMP is found before timeout', function() {
      // Setup COMMON_CONFIG.getConsentManagementEnabled to return true
      COMMON_CONFIG.getConsentManagementEnabled.returns(true);
      
      // Setup checkCMPsPresentOnPage to simulate CMP found
      consentConfigResolver.checkCMPsPresentOnPage.callsFake(function() {
        crConfigInstance.config.complianceSupport = [1]; // Add GDPR compliance directly
      });
      
      // Call the function
      getConsentManagementConfig(callbackSpy);
      
      // Fast-forward time past timeout
      clock.tick(100);
      
      // Verify setCMPTime was not called (timeout was cleared)
      expect(consentConfigResolver.setCMPTime.called).to.be.false;
    });
  });
});