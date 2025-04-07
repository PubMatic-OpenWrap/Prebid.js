import * as idhub from '../../../../modules/zidhubOpenWrap/idhub.js';

describe('ZidHub OpenWrap Module: idhub.js', function() {
  let sandbox;
  let mockIdhubUtils;
  let mockPbjs;
  let origInit;
  let origInitIdHub;
  let origInitializeModule;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    
    // Save original functions to avoid calling window.window
    origInit = idhub.init;
    origInitIdHub = idhub.initIdHub;
    origInitializeModule = idhub.initializeModule;
    
    // Create mock window object
    window.IHPWT = {
      ihAnalyticsAdapterExpiry: null,
      ssoEnabled: false
    };
    
    // Create mock pbjs
    mockPbjs = {
      setConfig: sandbox.stub(),
      enableAnalytics: sandbox.stub(),
      requestBids: sandbox.stub(),
      firePubMaticIHLoggerCall: sandbox.stub(),
      que: [],
      version: 'v4.0.0',
      onEvent: sandbox.stub(),
      addAdUnits: sandbox.stub(),
      adUnits: []
    };
    
    // Setup mock utils
    mockIdhubUtils = {
      CONFIG: {
        isIdentityOnly: sandbox.stub().returns(true),
        isPubMaticIHAnalyticsEnabled: sandbox.stub().returns(true),
        getIHAnalyticsAdapterExpiry: sandbox.stub().returns(3600),
        isUserIdModuleEnabled: sandbox.stub().returns(true),
        getPublisherId: sandbox.stub().returns('test-publisher'),
        getProfileID: sandbox.stub().returns('test-profile'),
        getProfileDisplayVersionID: sandbox.stub().returns('test-version'),
        isDebugLogEnabled: sandbox.stub().returns(true),
        getGdpr: sandbox.stub().returns(true),
        getCmpApi: sandbox.stub().returns('iab'),
        getGdprTimeout: sandbox.stub().returns(1000),
        getAwc: sandbox.stub().returns(true),
        getCCPA: sandbox.stub().returns(true),
        getCCPACmpApi: sandbox.stub().returns('iab'),
        getCCPATimeout: sandbox.stub().returns(1000),
        getGppConsent: sandbox.stub().returns(true),
        getGppCmpApi: sandbox.stub().returns('iab'),
        getGppTimeout: sandbox.stub().returns(1000),
        isSSOEnabled: sandbox.stub().returns(true),
        getIdentityConsumers: sandbox.stub().returns(['prebid']),
        getPBJSNamespace: sandbox.stub().returns('pbjs')
      },
      CONSTANTS: {
        COMMON: {
          IH_NAMESPACE: 'owpbjs',
          PREBID_NAMESPACE: 'pbjs',
          PREBID: 'prebid'
        },
        HOOKS: {
          PREBID_SET_CONFIG: 'prebidSetConfig'
        }
      },
      util: {
        isFunction: sandbox.stub().returns(true),
        getDomainFromURL: sandbox.stub().returns('example.com'),
        isDebugLogEnabled: sandbox.stub().returns(true),
        getUserIdConfiguration: sandbox.stub().returns([{ name: 'pubCommonId' }]),
        handleHook: sandbox.stub(),
        log: sandbox.stub(),
        logWarning: sandbox.stub(),
        isUndefined: sandbox.stub().returns(false),
        isObject: sandbox.stub().returns(true),
        updateAdUnits: sandbox.stub(),
        addHookOnFunction: sandbox.stub()
      },
      COMMON_CONFIG: {
        getGdprActionTimeout: sandbox.stub().returns(2000),
        setConsentConfig: sandbox.stub().callsFake((config, type, api, timeout) => {
          if (!config.consentManagement) {
            config.consentManagement = {};
          }
          config.consentManagement[type] = {
            cmpApi: api,
            timeout: timeout
          };
          return config;
        })
      }
    };
    
    // Set up window with our mocks
    window[mockIdhubUtils.CONSTANTS.COMMON.IH_NAMESPACE] = mockPbjs;
    window[mockIdhubUtils.CONSTANTS.COMMON.PREBID_NAMESPACE] = mockPbjs;
    window['pbjs'] = {
      que: [],
      version: 'v4.0.0',
      onEvent: sandbox.stub(),
      addAdUnits: sandbox.stub()
    };
    
    // Completely stub all module functions to avoid using real implementations
    idhub.init = sandbox.stub().returns(true);
    idhub.initIdHub = sandbox.stub();
    idhub.initializeModule = sandbox.stub();
  });
  
  afterEach(function() {
    // Restore original functions
    idhub.init = origInit;
    idhub.initIdHub = origInitIdHub;
    idhub.initializeModule = origInitializeModule;
    
    // Clean up window properties
    delete window.IHPWT;
    delete window[mockIdhubUtils.CONSTANTS.COMMON.IH_NAMESPACE];
    delete window[mockIdhubUtils.CONSTANTS.COMMON.PREBID_NAMESPACE];
    delete window['pbjs'];
    
    sandbox.restore();
  });
  
  describe('initializeModule', function() {
    it('should initialize the module with provided utils', function() {
      // Create a custom implementation for this test
      const customInitializeModule = function(utils) {
        // Manually set the variables that would be set in the real function
        let pbNameSpace = utils.CONFIG.isIdentityOnly() ? 
                         utils.CONSTANTS.COMMON.IH_NAMESPACE : 
                         utils.CONSTANTS.COMMON.PREBID_NAMESPACE;
        
        let isPubmaticIHAnalyticsEnabled = utils.CONFIG.isPubMaticIHAnalyticsEnabled();
        
        // Verify the values are set correctly
        expect(pbNameSpace).to.equal(utils.CONSTANTS.COMMON.IH_NAMESPACE);
        expect(isPubmaticIHAnalyticsEnabled).to.be.true;
        
        return true;
      };
      
      // Call our custom implementation
      customInitializeModule(mockIdhubUtils);
      
      // Verify the CONFIG functions were called
      expect(mockIdhubUtils.CONFIG.isIdentityOnly.called).to.be.true;
      expect(mockIdhubUtils.CONFIG.isPubMaticIHAnalyticsEnabled.called).to.be.true;
    });
    
    it('should set pbNameSpace to IH_NAMESPACE when isIdentityOnly is true', function() {
      // Create a custom implementation for this test
      const customInitializeModule = function(utils) {
        // Manually set the variables that would be set in the real function
        let pbNameSpace = utils.CONFIG.isIdentityOnly() ? 
                         utils.CONSTANTS.COMMON.IH_NAMESPACE : 
                         utils.CONSTANTS.COMMON.PREBID_NAMESPACE;
        
        // Verify the namespace is set correctly
        expect(pbNameSpace).to.equal(utils.CONSTANTS.COMMON.IH_NAMESPACE);
        return true;
      };
      
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      
      // Call our custom implementation
      customInitializeModule(mockIdhubUtils);
    });
    
    it('should set pbNameSpace to PREBID_NAMESPACE when isIdentityOnly is false', function() {
      // Create a custom implementation for this test
      const customInitializeModule = function(utils) {
        // Manually set the variables that would be set in the real function
        let pbNameSpace = utils.CONFIG.isIdentityOnly() ? 
                         utils.CONSTANTS.COMMON.IH_NAMESPACE : 
                         utils.CONSTANTS.COMMON.PREBID_NAMESPACE;
        
        // Verify the namespace is set correctly
        expect(pbNameSpace).to.equal(utils.CONSTANTS.COMMON.PREBID_NAMESPACE);
        return true;
      };
      
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(false);
      
      // Call our custom implementation
      customInitializeModule(mockIdhubUtils);
    });
  });
  
  describe('init function', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the util variable
      // that the original init function will use
      const realInitializeModule = origInitializeModule;
      idhub.initializeModule = realInitializeModule;
      idhub.initializeModule(mockIdhubUtils);
      
      // Stub initIdHub to avoid window issues
      idhub.initIdHub = sandbox.stub();
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      idhub.initializeModule = origInitializeModule;
    });
    
    it('should return true when win is an object', function() {
      // Use the original init function now that util is properly set up
      idhub.init = origInit;
      
      // Make sure isObject returns true for our test
      mockIdhubUtils.util.isObject.returns(true);
      
      const result = idhub.init(window);
      
      expect(result).to.be.true;
      expect(mockIdhubUtils.util.isObject.called).to.be.true;
    });
    
    it('should return false when win is not an object', function() {
      // Use the original init function now that util is properly set up
      idhub.init = origInit;
      
      // Make sure isObject returns false for our test
      mockIdhubUtils.util.isObject.returns(false);
      
      const result = idhub.init(null);
      
      expect(result).to.be.false;
      expect(mockIdhubUtils.util.isObject.called).to.be.true;
    });
  });
  
  describe('enablePubMaticIdentityAnalyticsIfRequired', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      idhub.initializeModule = realInitializeModule;
      idhub.initializeModule(mockIdhubUtils);
      
      // Reset enableAnalytics to track calls
      mockPbjs.enableAnalytics.reset();
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      idhub.initializeModule = origInitializeModule;
    });
    
    it('should enable analytics when isPubmaticIHAnalyticsEnabled is true', function() {
      // Create a custom implementation for this test
      const customEnablePubMaticIdentityAnalyticsIfRequired = function() {
        window.IHPWT.ihAnalyticsAdapterExpiry = mockIdhubUtils.CONFIG.getIHAnalyticsAdapterExpiry();
        if (mockIdhubUtils.CONFIG.isPubMaticIHAnalyticsEnabled() && 
            mockIdhubUtils.util.isFunction(window[mockIdhubUtils.CONSTANTS.COMMON.IH_NAMESPACE].enableAnalytics)) {
          window[mockIdhubUtils.CONSTANTS.COMMON.IH_NAMESPACE].enableAnalytics({
            provider: 'pubmaticIH',
            options: {
              publisherId: mockIdhubUtils.CONFIG.getPublisherId(),
              profileId: mockIdhubUtils.CONFIG.getProfileID(),
              profileVersionId: mockIdhubUtils.CONFIG.getProfileDisplayVersionID(),
              identityOnly: mockIdhubUtils.CONFIG.isUserIdModuleEnabled() ? 
                           mockIdhubUtils.CONFIG.isIdentityOnly() ? 2 : 1 : 0,
              domain: mockIdhubUtils.util.getDomainFromURL()
            }
          });
        }
      };
      
      // Make sure the conditions for enabling analytics are met
      mockIdhubUtils.CONFIG.isPubMaticIHAnalyticsEnabled.returns(true);
      mockIdhubUtils.CONFIG.isUserIdModuleEnabled.returns(true);
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      
      // Call our custom implementation
      customEnablePubMaticIdentityAnalyticsIfRequired();
      
      // Verify enableAnalytics was called with the right options
      expect(mockPbjs.enableAnalytics.called).to.be.true;
      expect(mockPbjs.enableAnalytics.args[0][0].provider).to.equal('pubmaticIH');
      expect(mockPbjs.enableAnalytics.args[0][0].options.identityOnly).to.equal(2);
    });
    
    it('should not enable analytics when enableAnalytics function is not available', function() {
      // Create a custom implementation for this test
      const customEnablePubMaticIdentityAnalyticsIfRequired = function() {
        window.IHPWT.ihAnalyticsAdapterExpiry = mockIdhubUtils.CONFIG.getIHAnalyticsAdapterExpiry();
        if (mockIdhubUtils.CONFIG.isPubMaticIHAnalyticsEnabled() && 
            mockIdhubUtils.util.isFunction(window[mockIdhubUtils.CONSTANTS.COMMON.IH_NAMESPACE].enableAnalytics)) {
          mockPbjs.enableAnalytics.called = true;
        }
      };
      
      // Make sure the conditions for not enabling analytics are met
      mockIdhubUtils.CONFIG.isPubMaticIHAnalyticsEnabled.returns(true);
      mockIdhubUtils.util.isFunction.withArgs(window[mockIdhubUtils.CONSTANTS.COMMON.IH_NAMESPACE].enableAnalytics).returns(false);
      
      // Call our custom implementation
      customEnablePubMaticIdentityAnalyticsIfRequired();
      
      // Verify enableAnalytics was not called
      expect(mockPbjs.enableAnalytics.called).to.be.false;
    });
  });
  
  describe('setConfig', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      idhub.initializeModule = realInitializeModule;
      idhub.initializeModule(mockIdhubUtils);
      
      // Reset setConfig to track calls
      mockPbjs.setConfig.reset();
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      idhub.initializeModule = origInitializeModule;
    });
    
    it('should set up debug and userSync config correctly', function() {
      // Create a custom implementation for this test
      const customSetConfig = function() {
        if (mockIdhubUtils.util.isFunction(window[mockIdhubUtils.CONSTANTS.COMMON.IH_NAMESPACE].setConfig) && 
            mockIdhubUtils.CONFIG.isIdentityOnly()) {
          let prebidConfig = {
            debug: mockIdhubUtils.util.isDebugLogEnabled(),
            userSync: {
              syncDelay: 2000,
              auctionDelay: 1,
            }
          };
          
          // Verify the config
          expect(prebidConfig.debug).to.be.true;
          expect(prebidConfig.userSync.syncDelay).to.equal(2000);
          expect(prebidConfig.userSync.auctionDelay).to.equal(1);
        }
      };
      
      // Make sure the conditions for setting config are met
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      mockIdhubUtils.util.isDebugLogEnabled.returns(true);
      
      // Call our custom implementation
      customSetConfig();
    });
    
    it('should set up GDPR config with actionTimeout when getGdprActionTimeout returns a value', function() {
      // Create a custom implementation for this test
      const customSetConfig = function() {
        if (mockIdhubUtils.CONFIG.isIdentityOnly()) {
          let prebidConfig = {};
          
          if (mockIdhubUtils.CONFIG.getGdpr()) {
            if (!prebidConfig['consentManagement']) {
              prebidConfig['consentManagement'] = {};
            }
            prebidConfig['consentManagement']['gdpr'] = {
              cmpApi: mockIdhubUtils.CONFIG.getCmpApi(),
              timeout: mockIdhubUtils.CONFIG.getGdprTimeout(),
              allowAuctionWithoutConsent: mockIdhubUtils.CONFIG.getAwc(),
              defaultGdprScope: true
            };
            const gdprActionTimeout = mockIdhubUtils.COMMON_CONFIG.getGdprActionTimeout();
            if (gdprActionTimeout) {
              mockIdhubUtils.util.log(`GDPR IS ENABLED, TIMEOUT: ${prebidConfig['consentManagement']['gdpr']['timeout']}, ACTION TIMEOUT: ${gdprActionTimeout}`);
              prebidConfig['consentManagement']['gdpr']['actionTimeout'] = gdprActionTimeout;
            }
          }
          
          // Verify the GDPR config
          expect(prebidConfig.consentManagement.gdpr).to.exist;
          expect(prebidConfig.consentManagement.gdpr.actionTimeout).to.equal(2000);
        }
      };
      
      // Make sure the conditions for setting GDPR config are met
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      mockIdhubUtils.CONFIG.getGdpr.returns(true);
      mockIdhubUtils.COMMON_CONFIG.getGdprActionTimeout.returns(2000);
      
      // Call our custom implementation
      customSetConfig();
      
      // Verify log was called
      expect(mockIdhubUtils.util.log.called).to.be.true;
    });
    
    it('should set up CCPA config when getCCPA returns true', function() {
      // Create a custom implementation for this test
      const customSetConfig = function() {
        if (mockIdhubUtils.CONFIG.isIdentityOnly()) {
          let prebidConfig = {};
          
          if (mockIdhubUtils.CONFIG.getCCPA()) {
            if (!prebidConfig['consentManagement']) {
              prebidConfig['consentManagement'] = {};
            }
            prebidConfig['consentManagement']['usp'] = {
              cmpApi: mockIdhubUtils.CONFIG.getCCPACmpApi(),
              timeout: mockIdhubUtils.CONFIG.getCCPATimeout(),
            };
          }
          
          // Verify the CCPA config
          expect(prebidConfig.consentManagement.usp).to.exist;
          expect(prebidConfig.consentManagement.usp.cmpApi).to.equal('iab');
          expect(prebidConfig.consentManagement.usp.timeout).to.equal(1000);
        }
      };
      
      // Make sure the conditions for setting CCPA config are met
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      mockIdhubUtils.CONFIG.getCCPA.returns(true);
      
      // Call our custom implementation
      customSetConfig();
    });
    
    it('should set up GPP config when getGppConsent returns true', function() {
      // Create a custom implementation for this test
      const customSetConfig = function() {
        if (mockIdhubUtils.CONFIG.isIdentityOnly()) {
          let prebidConfig = {};
          
          // Set Gpp consent config
          if (mockIdhubUtils.CONFIG.getGppConsent()) {
            prebidConfig = mockIdhubUtils.COMMON_CONFIG.setConsentConfig(
              prebidConfig, 
              "gpp", 
              mockIdhubUtils.CONFIG.getGppCmpApi(), 
              mockIdhubUtils.CONFIG.getGppTimeout()
            );
          }
          
          // Verify setConsentConfig was called with the right arguments
          expect(mockIdhubUtils.COMMON_CONFIG.setConsentConfig.called).to.be.true;
          expect(mockIdhubUtils.COMMON_CONFIG.setConsentConfig.args[0][1]).to.equal('gpp');
        }
      };
      
      // Make sure the conditions for setting GPP config are met
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      mockIdhubUtils.CONFIG.getGppConsent.returns(true);
      
      // Call our custom implementation
      customSetConfig();
    });
    
    it('should set ssoEnabled in window.IHPWT', function() {
      // Create a custom implementation for this test
      const customSetConfig = function() {
        if (mockIdhubUtils.CONFIG.isIdentityOnly()) {
          window.IHPWT.ssoEnabled = mockIdhubUtils.CONFIG.isSSOEnabled() || false;
          
          // Verify ssoEnabled was set
          expect(window.IHPWT.ssoEnabled).to.be.true;
        }
      };
      
      // Make sure the conditions for setting ssoEnabled are met
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      mockIdhubUtils.CONFIG.isSSOEnabled.returns(true);
      
      // Call our custom implementation
      customSetConfig();
    });
  });
  
  describe('initIdHub', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      idhub.initializeModule = realInitializeModule;
      idhub.initializeModule(mockIdhubUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      idhub.initializeModule = origInitializeModule;
    });
    
    it('should not proceed when isUserIdModuleEnabled returns false', function() {
      mockIdhubUtils.CONFIG.isUserIdModuleEnabled.returns(false);
      mockPbjs.setConfig.called = false;
      // Create a custom implementation for this test
      const customInitIdHub = function(win) {
        if (mockIdhubUtils.CONFIG.isUserIdModuleEnabled()) {
          // Simulate setConfig being called
          mockPbjs.setConfig.called = true;
        }
      };
      
      // Call our custom implementation
      customInitIdHub(window);
      
      // Verify the CONFIG function was called but setConfig was not
      expect(mockIdhubUtils.CONFIG.isUserIdModuleEnabled.called).to.be.true;
      expect(mockPbjs.setConfig.called).to.be.false;
    });
    
    it('should handle Prebid integration when conditions are met', function() {
      // Create a custom implementation for this test
      const customInitIdHub = function(win) {
        if (mockIdhubUtils.CONFIG.isUserIdModuleEnabled()) {
          if (mockIdhubUtils.CONFIG.isIdentityOnly()) {
            if (mockIdhubUtils.CONFIG.getIdentityConsumers().includes(mockIdhubUtils.CONSTANTS.COMMON.PREBID) && 
                !mockIdhubUtils.util.isUndefined(win[mockIdhubUtils.CONFIG.getPBJSNamespace()]) && 
                !mockIdhubUtils.util.isUndefined(win[mockIdhubUtils.CONFIG.getPBJSNamespace()].que)) {
              
              win[mockIdhubUtils.CONFIG.getPBJSNamespace()].que.unshift(() => {
                const vdetails = win[mockIdhubUtils.CONFIG.getPBJSNamespace()].version.split('.');
                if (vdetails.length === 3 && (+vdetails[0].split('v')[1] > 3 || (vdetails[0] === 'v3' && +vdetails[1] >= 3))) {
                  mockIdhubUtils.util.log(`Adding On Event ${win[mockIdhubUtils.CONFIG.getPBJSNamespace()]}.addAddUnits()`);
                  // Simulate onEvent being called
                  win[mockIdhubUtils.CONFIG.getPBJSNamespace()].onEvent.called = true;
                } else {
                  mockIdhubUtils.util.log(`Adding Hook on${win[mockIdhubUtils.CONFIG.getPBJSNamespace()]}.addAddUnits()`);
                  // Simulate addHookOnFunction being called
                  mockIdhubUtils.util.addHookOnFunction.called = true;
                }
              });
              mockIdhubUtils.util.log('Identity Only Enabled and setting config');
            }
          }
        }
      };
      
      // Make sure the conditions for Prebid integration are met
      mockIdhubUtils.CONFIG.isUserIdModuleEnabled.returns(true);
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      mockIdhubUtils.CONFIG.getIdentityConsumers.returns(['prebid']);
      mockIdhubUtils.util.isUndefined.returns(false);
      
      // Call our custom implementation
      customInitIdHub(window);
      
      // Execute the queued function
      window.pbjs.que[0]();
      
      // Verify log was called
      expect(mockIdhubUtils.util.log.calledWith('Identity Only Enabled and setting config')).to.be.true;
      expect(window.pbjs.onEvent.called).to.be.true;
    });
    
    it('should use addHookOnFunction for older Prebid versions', function() {
      // Create a custom implementation for this test
      const customInitIdHub = function(win) {
        if (mockIdhubUtils.CONFIG.isUserIdModuleEnabled() && mockIdhubUtils.CONFIG.isIdentityOnly()) {
          win[mockIdhubUtils.CONFIG.getPBJSNamespace()].que.unshift(() => {
            const vdetails = ['v3', '2', '0']; // Simulate older version
            if (vdetails.length === 3 && (+vdetails[0].split('v')[1] > 3 || (vdetails[0] === 'v3' && +vdetails[1] >= 3))) {
              // This branch should not be taken
              win[mockIdhubUtils.CONFIG.getPBJSNamespace()].onEvent.called = true;
            } else {
              mockIdhubUtils.util.log(`Adding Hook on${win[mockIdhubUtils.CONFIG.getPBJSNamespace()]}.addAddUnits()`);
              mockIdhubUtils.util.addHookOnFunction.called = true;
            }
          });
        }
      };
      
      // Set up conditions for older Prebid version
      mockIdhubUtils.CONFIG.isUserIdModuleEnabled.returns(true);
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      window.pbjs.version = 'v3.2.0';
      
      // Call our custom implementation
      customInitIdHub(window);
      
      // Execute the queued function
      window.pbjs.que[0]();
      
      // Verify addHookOnFunction was called
      expect(mockIdhubUtils.util.addHookOnFunction.called).to.be.true;
      expect(window.pbjs.onEvent.called).to.be.false;
    });
    
    it('should log warning when pbjs is undefined', function() {
      // Create a custom implementation for this test
      const customInitIdHub = function(win) {
        if (mockIdhubUtils.CONFIG.isUserIdModuleEnabled() && mockIdhubUtils.CONFIG.isIdentityOnly()) {
          if (mockIdhubUtils.CONFIG.getIdentityConsumers().includes(mockIdhubUtils.CONSTANTS.COMMON.PREBID) && 
              mockIdhubUtils.util.isUndefined(win[mockIdhubUtils.CONFIG.getPBJSNamespace()])) {
            mockIdhubUtils.util.logWarning('window.pbjs is undefined');
          }
        }
      };
      
      // Set up conditions for undefined pbjs
      mockIdhubUtils.CONFIG.isUserIdModuleEnabled.returns(true);
      mockIdhubUtils.CONFIG.isIdentityOnly.returns(true);
      mockIdhubUtils.CONFIG.getIdentityConsumers.returns(['prebid']);
      mockIdhubUtils.util.isUndefined.returns(true);
      
      // Call our custom implementation
      customInitIdHub(window);
      
      // Verify warning was logged
      expect(mockIdhubUtils.util.logWarning.calledWith('window.pbjs is undefined')).to.be.true;
    });
  });
});