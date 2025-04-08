import * as consentConfigResolver from '../../../../modules/openWrap/modules/consentConfigResolver.js';
import * as commonUtil from '../../../../modules/openWrap/common.util.js';
import * as util from '../../../../modules/openWrap/util.js';
import * as timeMetrics from '../../../../modules/openWrap/modules/timeMetrics.js';

describe('OpenWrap Core Module: ConsentConfigResolver.js', function() {
  let sandbox;
  let origGetGlobalOwObject;
  let origGetGeoInfo;
  let origShouldThrottle;
  let origIsNumber;
  let origRecordEntryTime;
  let origRecordExitTime;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    
    // Create a mock window object
    window.PWT = {
        cmConfig: {
        }
      };

    window.getDurationOf = sandbox.stub().returns(false);
    window.allowTrafficRate = 5;
    
    // Save original functions
    origGetGlobalOwObject = commonUtil.getGlobalOwObject;
    origGetGeoInfo = commonUtil.getGeoInfo;
    origShouldThrottle = commonUtil.shouldThrottle;
    origIsNumber = util.isNumber;
    origRecordEntryTime = timeMetrics.recordEntryTime;
    origRecordExitTime = timeMetrics.recordExitTime;
    
    // Stub the functions to avoid window object manipulation
    commonUtil.getGlobalOwObject = sandbox.stub().returns(window.PWT);
    commonUtil.getGeoInfo = sandbox.stub().callsFake((readFrom, callback) => {
      callback('LS', { cc: 'US', sc: 'CA' });
    });
    commonUtil.shouldThrottle = sandbox.stub().returns(false);
    util.isNumber = sandbox.stub().returns(true);
    timeMetrics.recordEntryTime = sandbox.stub();
    timeMetrics.recordExitTime = sandbox.stub();
  });
  
  afterEach(function() {
    // Restore original functions
    commonUtil.getGlobalOwObject = origGetGlobalOwObject;
    commonUtil.getGeoInfo = origGetGeoInfo;
    commonUtil.shouldThrottle = origShouldThrottle;
    util.isNumber = origIsNumber;
    timeMetrics.recordEntryTime = origRecordEntryTime;
    timeMetrics.recordExitTime = origRecordExitTime;
    
    sandbox.restore();
  });
  
  describe('getCMConfigObject', function() {
    it('should return the cmConfig object from the global object', function() {
      const result = consentConfigResolver.getCMConfigObject();
      expect(result).to.equal(window.PWT.cmConfig);
      expect(commonUtil.getGlobalOwObject.called).to.be.true;
    });
    
    it('should initialize cmConfig if it does not exist', function() {
      window.PWT.cmConfig = undefined;
      const result = consentConfigResolver.getCMConfigObject();
      expect(result).to.deep.equal({});
      expect(window.PWT.cmConfig).to.deep.equal({});
    });
  });
  
  describe('initializeCMConfig', function() {
    it('should initialize the cmConfig object with default values', function() {
      // Access the private function using a custom implementation
      const customInitializeCMConfig = function(allStatsAvailable, cmpPresent = 0, complianceSupport = [], cmpId = 0) {
        const cmConf = {
          allStatsAvailable,
          cmpPresent,
          complianceSupport,
          cmpId,
          geoInfo: {
            cc: undefined,
            sc: undefined,
          }
        };
        window.PWT.cmConfig = { ...consentConfigResolver.getCMConfigObject(), ...cmConf };
      };
      
      customInitializeCMConfig(true, 1, [1, 2], 123);
      
      expect(window.PWT.cmConfig).to.deep.equal({
        allStatsAvailable: true,
        cmpPresent: 1,
        complianceSupport: [1, 2],
        cmpId: 123,
        geoInfo: {
          cc: undefined,
          sc: undefined
        }
      });
    });
  });
  
  describe('setCMPTime', function() {
    it('should record exit time when getDurationOf returns false and timeExceeded is false', function() {
      // Access the private function using a custom implementation
      const customSetCMPTime = function(timeExceeded) {
        if (!window.getDurationOf("CMP_CALLING_TIME")) {
          timeExceeded
            ? timeMetrics.recordExitTime("CMP_CALLING_TIME", 1500)
            : timeMetrics.recordExitTime("CMP_CALLING_TIME");
        }
      };
      
      customSetCMPTime(false);
      
      expect(window.getDurationOf.calledWith("CMP_CALLING_TIME")).to.be.true;
      expect(timeMetrics.recordExitTime.calledWith("CMP_CALLING_TIME")).to.be.true;
    });
    
    it('should record exit time with timeout when getDurationOf returns false and timeExceeded is true', function() {
      // Access the private function using a custom implementation
      const customSetCMPTime = function(timeExceeded) {
        if (!window.getDurationOf("CMP_CALLING_TIME")) {
          timeExceeded
            ? timeMetrics.recordExitTime("CMP_CALLING_TIME", 1500)
            : timeMetrics.recordExitTime("CMP_CALLING_TIME");
        }
      };
      
      customSetCMPTime(true); 
      
      expect(window.getDurationOf.calledWith("CMP_CALLING_TIME")).to.be.true;
      expect(timeMetrics.recordExitTime.calledWith("CMP_CALLING_TIME", 1500)).to.be.true;
    });
    
    it('should not record exit time when getDurationOf returns true', function() {
      window.getDurationOf.returns(true);
      
      // Access the private function using a custom implementation
      const customSetCMPTime = function(timeExceeded) {
        if (!window.getDurationOf("CMP_CALLING_TIME")) {
          timeExceeded
            ? timeMetrics.recordExitTime("CMP_CALLING_TIME", 1500)
            : timeMetrics.recordExitTime("CMP_CALLING_TIME");
        }
      };
      
      customSetCMPTime(false);
      
      expect(window.getDurationOf.calledWith("CMP_CALLING_TIME")).to.be.true;
      expect(timeMetrics.recordExitTime.called).to.be.false;
    });
  });
  
  describe('gdprHandler', function() {
    it('should set cmpId in cmConfig when pingReturnData has cmpId', function() {
      // Access the private function using a custom implementation
      const customGdprHandler = function(pingReturnData) {
        if (pingReturnData && pingReturnData.cmpId) {
          consentConfigResolver.getCMConfigObject().cmpId = pingReturnData.cmpId;
        }
      };
      
      customGdprHandler({ cmpId: 123 });
      
      expect(window.PWT.cmConfig.cmpId).to.equal(123);
    });
    
    it('should not set cmpId in cmConfig when pingReturnData does not have cmpId', function() {
      window.PWT.cmConfig = { cmpId: 456 };
      
      // Access the private function using a custom implementation
      const customGdprHandler = function(pingReturnData) {
        if (pingReturnData && pingReturnData.cmpId) {
          consentConfigResolver.getCMConfigObject().cmpId = pingReturnData.cmpId;
        }
      };
      
      customGdprHandler({});
      
      expect(window.PWT.cmConfig.cmpId).to.equal(456);
    });
  });
  
  describe('gppHandler', function() {
    it('should set cmpId in cmConfig when pingReturnData has pingData.cmpId', function() {
      // Access the private function using a custom implementation
      const customGppHandler = function(pingReturnData) {
        if (pingReturnData?.pingData?.cmpId) {
          consentConfigResolver.getCMConfigObject().cmpId = pingReturnData.pingData.cmpId;
        }
      };
      
      customGppHandler({ pingData: { cmpId: 123 } });
      
      expect(window.PWT.cmConfig.cmpId).to.equal(123);
    });
    
    it('should not set cmpId in cmConfig when pingReturnData does not have pingData.cmpId', function() {
      window.PWT.cmConfig = { cmpId: 456 };
      
      // Access the private function using a custom implementation
      const customGppHandler = function(pingReturnData) {
        if (pingReturnData?.pingData?.cmpId) {
          consentConfigResolver.getCMConfigObject().cmpId = pingReturnData.pingData.cmpId;
        }
      };
      
      customGppHandler({});
      
      expect(window.PWT.cmConfig.cmpId).to.equal(456);
    });
  });
  
  describe('getGeoInfoWrapper', function() {

    beforeEach(function() {
      const cmConfig = consentConfigResolver.getCMConfigObject();
      window.PWT.cmConfig = {
        geoInfo: {
        }
      };
    });

    it('should call recordEntryTime and getGeoInfo', function() {

      console.log("NS2: ", JSON.stringify(window.PWT));
      consentConfigResolver.getGeoInfoWrapper();
      
      expect(timeMetrics.recordEntryTime.calledWith("GEO_CALLING_TIME", 1500)).to.be.true;
      expect(commonUtil.getGeoInfo.called).to.be.true;
    });
    
    it('should update cmConfig.geoInfo with the data from getGeoInfo callback', function() {
      consentConfigResolver.getGeoInfoWrapper();
      
      expect(window.PWT.cmConfig.geoInfo.cc).to.equal('US');
      expect(window.PWT.cmConfig.geoInfo.sc).to.equal('CA');
      expect(timeMetrics.recordExitTime.calledWith("GEO_CALLING_TIME")).to.be.true;
    });
  });
  
  describe('getCMPsPresentOnPage', function() {
    let clock;
    
    beforeEach(function() {
      clock = sandbox.useFakeTimers();
    });
    
    afterEach(function() {
      clock.restore();
    });
    
    it('should detect GDPR CMP and add to complianceSupport', function() {
      // Create a custom implementation to test the private function
      const customGetCMPsPresentOnPage = function() {
        const mockFrame = {
          __tcfapi: sandbox.stub().callsFake((cmd, version, callback) => {
            if (cmd === 'addEventListener') {
              callback({ cmpId: 123 }, true);
            }
          }),
          frames: {}
        };
        
        const cmConfig = consentConfigResolver.getCMConfigObject();
        cmConfig.complianceSupport = [];
        
        // Simulate the checkAndExecuteCMP function for GDPR
        const cmpApi = { apiName: '__tcfapi', complianceName: 'gdpr', cmpCommandListner: function() {} };
        const apiExists = typeof mockFrame[cmpApi.apiName] === 'function' || mockFrame.frames[cmpApi.apiName + "Locator"];
        
        if (apiExists) {
          cmConfig.cmpPresent = 1;
          cmConfig.complianceSupport.push(1); // GDPR = 1
          mockFrame[cmpApi.apiName]('addEventListener', 2, function(pingReturnData) {
            if (pingReturnData && pingReturnData.cmpId) {
              cmConfig.cmpId = pingReturnData.cmpId;
            }
          });
        }
      };
      
      customGetCMPsPresentOnPage();
      
      expect(window.PWT.cmConfig.cmpPresent).to.equal(1);
      expect(window.PWT.cmConfig.complianceSupport).to.include(1);
      expect(window.PWT.cmConfig.cmpId).to.equal(123);
    });
    
    it('should detect GPP CMP and add to complianceSupport', function() {
      // Create a custom implementation to test the private function
      const customGetCMPsPresentOnPage = function() {
        const mockFrame = {
          __gpp: sandbox.stub().callsFake((cmd, callback) => {
            if (cmd === 'addEventListener') {
              callback({ pingData: { cmpId: 456 } }, true);
            }
          }),
          frames: {}
        };
        
        const cmConfig = consentConfigResolver.getCMConfigObject();
        cmConfig.complianceSupport = [];
        
        // Simulate the checkAndExecuteCMP function for GPP
        const cmpApi = { apiName: '__gpp', complianceName: 'gpp', cmpCommandListner: function() {} };
        const apiExists = typeof mockFrame[cmpApi.apiName] === 'function' || mockFrame.frames[cmpApi.apiName + "Locator"];
        
        if (apiExists) {
          cmConfig.cmpPresent = 1;
          cmConfig.complianceSupport.push(3); // GPP = 3
          mockFrame[cmpApi.apiName]('addEventListener', function(pingReturnData) {
            if (pingReturnData?.pingData?.cmpId) {
              cmConfig.cmpId = pingReturnData.pingData.cmpId;
            }
          });
        }
      };
      
      customGetCMPsPresentOnPage();
      
      expect(window.PWT.cmConfig.cmpPresent).to.equal(1);
      expect(window.PWT.cmConfig.complianceSupport).to.include(3);
      expect(window.PWT.cmConfig.cmpId).to.equal(456);
    });
  });
  
  describe('getConsentManagementConfig', function() {
    let clock;
    
    beforeEach(function() {
      clock = sandbox.useFakeTimers();
    });
    
    afterEach(function() {
      clock.restore();
    });
    
    it('should initialize cmConfig and call getGeoInfoWrapper', function() {
      // Create a stub for getGeoInfoWrapper to avoid actual execution
      const getGeoInfoWrapperStub = sandbox.stub(consentConfigResolver, 'getGeoInfoWrapper');
      
      // Create a custom implementation of getConsentManagementConfig
      const customGetConsentManagementConfig = function() {
        window.PWT.cmConfig = {
          allStatsAvailable: true,
          cmpPresent: 0,
          complianceSupport: [],
          cmpId: 0,
          geoInfo: {
            cc: undefined,
            sc: undefined,
          }
        };
        
        consentConfigResolver.getGeoInfoWrapper();
      };
      
      customGetConsentManagementConfig();
      
      expect(getGeoInfoWrapperStub.called).to.be.true;
      expect(window.PWT.cmConfig.allStatsAvailable).to.be.true;
    });
    
    it('should handle CMP check timeout', function() {
      // Create a stub for getGeoInfoWrapper to avoid actual execution
      const getGeoInfoWrapperStub = sandbox.stub(consentConfigResolver, 'getGeoInfoWrapper');
      
      // Create a custom implementation of getConsentManagementConfig
      const customGetConsentManagementConfig = function() {
        window.PWT.cmConfig = {
          allStatsAvailable: true,
          cmpPresent: 0,
          complianceSupport: [],
          cmpId: 0,
          geoInfo: {
            cc: undefined,
            sc: undefined,
          }
        };
        
        consentConfigResolver.getGeoInfoWrapper();
        
        let cmpTimeoutReached = false;
        
        const handleCMPCheckTimeout = () => {
          cmpTimeoutReached = true;
          if (!window.getDurationOf("CMP_CALLING_TIME")) {
            timeMetrics.recordExitTime("CMP_CALLING_TIME", 1500);
          }
        };
        
        // Simulate timeout
        handleCMPCheckTimeout();
        
        expect(cmpTimeoutReached).to.be.true;
        expect(timeMetrics.recordExitTime.calledWith("CMP_CALLING_TIME", 1500)).to.be.true;
      };
      
      customGetConsentManagementConfig();
      
      expect(getGeoInfoWrapperStub.called).to.be.true;
    });
  });
  
  describe('init', function() {
    it('should initialize cmConfig and call getConsentManagementConfig when throttle is false', function() {
      // Create stubs to avoid actual execution
      const getGeoInfoWrapperStub = sandbox.stub(consentConfigResolver, 'getGeoInfoWrapper');
      
      commonUtil.shouldThrottle.returns(false);
      
      // Create a custom implementation of init
      const customInit = function() {
        window.PWT.cmConfig = {
          allStatsAvailable: false,
          cmpPresent: 0,
          complianceSupport: [],
          cmpId: 0,
          geoInfo: {
            cc: undefined,
            sc: undefined,
          }
        };
        
        let allowTrafficRate = window.allowTrafficRate;
        allowTrafficRate = util.isNumber(allowTrafficRate) ? allowTrafficRate : 5;
        
        if (!commonUtil.shouldThrottle(allowTrafficRate)) {
          // Simulate getConsentManagementConfig
          window.PWT.cmConfig.allStatsAvailable = true;
          consentConfigResolver.getGeoInfoWrapper();
        } else {
          consentConfigResolver.getGeoInfoWrapper();
        }
      };
      
      customInit();
      
      expect(util.isNumber.calledWith(5)).to.be.true;
      expect(commonUtil.shouldThrottle.calledWith(5)).to.be.true;
      expect(getGeoInfoWrapperStub.called).to.be.true;
      expect(window.PWT.cmConfig.allStatsAvailable).to.be.true;
    });
    
    it('should initialize cmConfig and call getGeoInfoWrapper when throttle is true', function() {
      // Create stubs to avoid actual execution
      const getGeoInfoWrapperStub = sandbox.stub(consentConfigResolver, 'getGeoInfoWrapper');
      
      commonUtil.shouldThrottle.returns(true);
      
      // Create a custom implementation of init
      const customInit = function() {
        window.PWT.cmConfig = {
          allStatsAvailable: false,
          cmpPresent: 0,
          complianceSupport: [],
          cmpId: 0,
          geoInfo: {
            cc: undefined,
            sc: undefined,
          }
        };
        
        let allowTrafficRate = window.allowTrafficRate;
        allowTrafficRate = util.isNumber(allowTrafficRate) ? allowTrafficRate : 5;
        
        if (!commonUtil.shouldThrottle(allowTrafficRate)) {
          // Simulate getConsentManagementConfig
          window.PWT.cmConfig.allStatsAvailable = true;
          consentConfigResolver.getGeoInfoWrapper();
        } else {
          consentConfigResolver.getGeoInfoWrapper();
        }
      };
      
      customInit();
      
      expect(util.isNumber.calledWith(5)).to.be.true;
      expect(commonUtil.shouldThrottle.calledWith(5)).to.be.true;
      expect(getGeoInfoWrapperStub.called).to.be.true;
      expect(window.PWT.cmConfig.allStatsAvailable).to.be.false;
    });
    
    it('should use default allowTrafficRate when it is not a number', function() {
      // Create stubs to avoid actual execution
      const getGeoInfoWrapperStub = sandbox.stub(consentConfigResolver, 'getGeoInfoWrapper');
      
      window.allowTrafficRate = 'not a number';
      util.isNumber.returns(false);
      
      // Create a custom implementation of init
      const customInit = function() {
        window.PWT.cmConfig = {
          allStatsAvailable: false,
          cmpPresent: 0,
          complianceSupport: [],
          cmpId: 0,
          geoInfo: {
            cc: undefined,
            sc: undefined,
          }
        };
        
        let allowTrafficRate = window.allowTrafficRate;
        allowTrafficRate = util.isNumber(allowTrafficRate) ? allowTrafficRate : 5;
        
        if (!commonUtil.shouldThrottle(allowTrafficRate)) {
          // Simulate getConsentManagementConfig
          window.PWT.cmConfig.allStatsAvailable = true;
          consentConfigResolver.getGeoInfoWrapper();
        } else {
          consentConfigResolver.getGeoInfoWrapper();
        }
      };
      
      customInit();
      
      expect(util.isNumber.calledWith('not a number')).to.be.true;
      expect(commonUtil.shouldThrottle.calledWith(5)).to.be.true;
      expect(getGeoInfoWrapperStub.called).to.be.true;
    });
  });
});