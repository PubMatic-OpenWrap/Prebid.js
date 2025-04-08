import * as custom from '../../../../modules/customOpenWrap/custom.js';

describe('Custom OpenWrap Module: custom.js', function() {
  let sandbox;
  let mockCustomUtils;
  let origInit;
  let origInitializeModule;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    
    // Save original functions to avoid calling window.window
    origInit = custom.init;
    origInitializeModule = custom.initializeModule;
    
    // Create mock window object
    window.PWT = {
      safeFrameMessageListenerAdded: false,
      requestBids: null,
      generateConfForGPT: null,
      addKeyValuePairsToGPTSlots: null,
      removeKeyValuePairsFromGPTSlots: null,
      displayAllCreativesWithoutAdServer: null,
      displayCreativeWithoutAdServer: null
    };
    
    window.googletag = {
      pubads: sandbox.stub().returns({
        getSlots: sandbox.stub().returns([]),
        setTargeting: sandbox.stub()
      })
    };
    
    // Setup mock utils
    mockCustomUtils = {
      CONFIG: {
        initConfig: sandbox.stub(),
        shouldClearTargeting: sandbox.stub().returns(true),
        isUsePrebidKeysEnabled: sandbox.stub().returns(true),
        isPrebidPubMaticAnalyticsEnabled: sandbox.stub().returns(true)
      },
      CONSTANTS: {
        WRAPPER_TARGETING_KEYS: {
          pw_ht: 'pw_ht',
          pw_bid: 'pw_bid'
        }
      },
      util: {
        isObject: sandbox.stub().returns(true),
        isString: sandbox.stub().returns(true),
        isArray: sandbox.stub().returns(true),
        isFunction: sandbox.stub().returns(true),
        isOwnProperty: sandbox.stub().returns(true),
        forEachOnObject: sandbox.stub().callsFake((obj, cb) => {
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              cb(key, obj[key]);
            }
          }
        }),
        forEachOnArray: sandbox.stub().callsFake((arr, cb) => {
          for (let i = 0; i < arr.length; i++) {
            cb(i, arr[i]);
          }
        }),
        logError: sandbox.stub(),
        error: sandbox.stub(),
        log: sandbox.stub(),
        addMessageEventListenerForSafeFrame: sandbox.stub(),
        getAdUnitConfig: sandbox.stub().returns({
          mediaTypeObject: { banner: { sizes: [[300, 250]] } },
          floors: { default: 1.0 }
        }),
        getCDSTargetingData: sandbox.stub().returns({
          pwt_test: 'test_value'
        })
      },
      bidManager: {
        getBid: sandbox.stub().returns({
          getAdHtml: sandbox.stub().returns('<div>test ad</div>'),
          getKGPV: sandbox.stub().returns('test_kgpv'),
          getWidth: sandbox.stub().returns(300),
          getHeight: sandbox.stub().returns(250),
          getGrossEcpm: sandbox.stub().returns(1.5),
          getNetEcpm: sandbox.stub().returns(1.0),
          getDefaultBidStatus: sandbox.stub().returns(1),
          getDealID: sandbox.stub().returns('test_deal'),
          getWinningBidCpm: sandbox.stub().returns(1.5)
        }),
        getAllPartnersBidStatuses: sandbox.stub().returns({
          partner1: 1,
          partner2: 0
        })
      },
      SLOT: {
        createGPTSlotObject: sandbox.stub().returns({
          getAdUnitID: sandbox.stub().returns('test_ad_unit'),
          getSizes: sandbox.stub().returns([[300, 250]])
        })
      },
      prebid: {
        initPbjsConfig: sandbox.stub(),
        getBid: sandbox.stub().returns({
          wb: {
            adHtml: '<div>test ad</div>',
            adapterID: 'pubmatic',
            grossEcpm: 1.5,
            netEcpm: 1.0,
            height: 250,
            width: 300
          },
          kvp: {
            pw_ht: '300x250',
            pw_bid: '1.5',
            hb_bidder: 'pubmatic'
          }
        })
      },
      consentConfigResolver: {
        init: sandbox.stub()
      }
    };
    
    // Completely stub all module functions to avoid using real implementations
    custom.init = sandbox.stub().returns(true);
    custom.initializeModule = sandbox.stub();
  });
  
  afterEach(function() {
    // Restore original functions
    custom.init = origInit;
    custom.initializeModule = origInitializeModule;
    
    // Clean up window properties
    delete window.PWT;
    delete window.googletag;
    
    sandbox.restore();
  });
  
  // describe('initializeModule', function() {
  //   it('should initialize the module with provided utils', function() {
  //     // Create a custom implementation for this test
  //     const customInitializeModule = function(utils) {
  //       // Verify the utils are set correctly
  //       expect(utils).to.equal(mockCustomUtils);
  //       return true;
  //     };
      
  //     // Call our custom implementation
  //     customInitializeModule(mockCustomUtils);
      
  //     // Verify consentConfigResolver.init was called
  //     expect(mockCustomUtils.consentConfigResolver.init.called).to.be.true;
  //   });
  // });
  
  describe('init function', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should return true when win is an object', function() {
      // Use the original init function
      custom.init = origInit;
      
      // Make sure isObject returns true for our test
      mockCustomUtils.util.isObject.returns(true);
      
      const result = custom.init(window);
      
      expect(result).to.be.true;
      expect(mockCustomUtils.util.isObject.called).to.be.true;
      expect(mockCustomUtils.CONFIG.initConfig.called).to.be.true;
      expect(mockCustomUtils.prebid.initPbjsConfig.called).to.be.true;
      
      // Verify PWT functions are set
      expect(window.PWT.requestBids).to.be.a('function');
      expect(window.PWT.generateConfForGPT).to.be.a('function');
      expect(window.PWT.addKeyValuePairsToGPTSlots).to.be.a('function');
      expect(window.PWT.removeKeyValuePairsFromGPTSlots).to.be.a('function');
      expect(window.PWT.displayAllCreativesWithoutAdServer).to.be.a('function');
      expect(window.PWT.displayCreativeWithoutAdServer).to.be.a('function');
    });
    
    it('should return false when win is not an object', function() {
      // Use the original init function
      custom.init = origInit;
      
      // Make sure isObject returns false for our test
      mockCustomUtils.util.isObject.returns(false);
      
      const result = custom.init(null);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.isObject.called).to.be.true;
    });
    
    it('should initialize safeFrameListener when win is an object', function() {
      // Use the original init function
      custom.init = origInit;
      
      // Make sure isObject returns true for our test
      mockCustomUtils.util.isObject.returns(true);
      
      custom.init(window);
      
      expect(mockCustomUtils.util.addMessageEventListenerForSafeFrame.called).to.be.true;
      expect(window.PWT.safeFrameMessageListenerAdded).to.be.true;
    });
  });
  
  describe('setWindowReference and getWindowReference', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);

      mockCustomUtils.util.isObject.returns(true);
      custom.setWindowReference(null);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should set window reference when win is an object', function() {
      // Make sure isObject returns true for our test
      mockCustomUtils.util.isObject.returns(true);
      
      custom.setWindowReference(window);
      const result = custom.getWindowReference();
      
      expect(result).to.equal(window);
      expect(mockCustomUtils.util.isObject.called).to.be.true;
    });
    
    it('should not set window reference when win is not an object', function() {
      // Make sure isObject returns false for our test
      mockCustomUtils.util.isObject.returns(false);
      
      custom.setWindowReference(null);
      const result = custom.getWindowReference();
      
      expect(result).to.be.null;
      expect(mockCustomUtils.util.isObject.called).to.be.true;
    });
  });
  
  describe('getAdUnitIndex', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should return the correct index from slot ID', function() {
      const mockSlot = {
        getSlotId: sandbox.stub().returns({
          getId: sandbox.stub().returns('div_1_0')
        })
      };
      
      const result = custom.getAdUnitIndex(mockSlot);
      
      expect(result).to.equal(0);
    });
    
    it('should return 0 if there is an error getting the index', function() {
      const mockSlot = {
        getSlotId: sandbox.stub().throws(new Error('Test error'))
      };
      
      const result = custom.getAdUnitIndex(mockSlot);
      
      expect(result).to.equal(0);
    });
  });
  
  describe('defineWrapperTargetingKey', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should define a wrapper targeting key', function() {
      // Reset wrapperTargetingKeys
      custom.wrapperTargetingKeys = null;
      
      // Make sure isObject returns false for our test
      mockCustomUtils.util.isObject.returns(false);
      
      custom.defineWrapperTargetingKey('test_key');
      
      expect(custom.wrapperTargetingKeys).to.be.an('object');
      expect(custom.wrapperTargetingKeys).to.have.property('test_key');
      expect(custom.wrapperTargetingKeys.test_key).to.equal('');
    });
    
    it('should add to existing wrapperTargetingKeys if it is already an object', function() {
      
      // Make sure isObject returns true for our test
      mockCustomUtils.util.isObject.returns(false);
    
      custom.defineWrapperTargetingKey('existing_key1');
      
      // Make sure isObject returns true for our test
      mockCustomUtils.util.isObject.returns(true);
      
      custom.defineWrapperTargetingKey('test_key1');
      
      expect(custom.wrapperTargetingKeys).to.be.an('object');
      expect(custom.wrapperTargetingKeys).to.have.property('existing_key1');
      expect(custom.wrapperTargetingKeys).to.have.property('test_key1');
    });
  });
  
  describe('defineWrapperTargetingKeys', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should define wrapper targeting keys from an object', function() {
      const testObj = {
        key1: 'value1',
        key2: 'value2'
      };
      
      const result = custom.defineWrapperTargetingKeys(testObj);
      
      expect(result).to.be.an('object');
      expect(result).to.have.property('value1');
      expect(result).to.have.property('value2');
      expect(result.value1).to.equal('');
      expect(result.value2).to.equal('');
      expect(mockCustomUtils.util.forEachOnObject.called).to.be.true;
    });
  });
  
  describe('validateAdUnitObject', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should return true for a valid ad unit object', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isString.returns(true);
      mockCustomUtils.util.isArray.returns(true);
      
      const adUnitObject = {
        code: 'test_code',
        divId: 'test_div',
        adUnitId: 'test_ad_unit',
        adUnitIndex: 'test_index',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.true;
    });
    
    it('should return false if adUnitObject is not an object', function() {
      mockCustomUtils.util.isObject.withArgs(null).returns(false);
      
      const result = custom.validateAdUnitObject(null);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
    
    it('should return false if code is not a string', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isString.withArgs(undefined).returns(false);
      
      const adUnitObject = {
        // missing code
        divId: 'test_div',
        adUnitId: 'test_ad_unit',
        adUnitIndex: 'test_index',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
    
    it('should return false if divId is not a string', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isString.callsFake((val) => {
        return val === 'test_code' || val === 'test_ad_unit' || val === 'test_index';
      });
      
      const adUnitObject = {
        code: 'test_code',
        // missing divId
        adUnitId: 'test_ad_unit',
        adUnitIndex: 'test_index',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
    
    it('should return false if adUnitId is not a string', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isString.callsFake((val) => {
        return val === 'test_code' || val === 'test_div' || val === 'test_index';
      });
      
      const adUnitObject = {
        code: 'test_code',
        divId: 'test_div',
        // missing adUnitId
        adUnitIndex: 'test_index',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
    
    it('should return false if adUnitIndex is not a string', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isString.callsFake((val) => {
        return val === 'test_code' || val === 'test_div' || val === 'test_ad_unit';
      });
      
      const adUnitObject = {
        code: 'test_code',
        divId: 'test_div',
        adUnitId: 'test_ad_unit',
        // missing adUnitIndex
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
    
    it('should return false if mediaTypes is not an object', function() {
      mockCustomUtils.util.isObject.callsFake((val) => {
        return val !== null && val !== undefined && val !== adUnitObject.mediaTypes;
      });
      mockCustomUtils.util.isString.returns(true);
      
      const adUnitObject = {
        code: 'test_code',
        divId: 'test_div',
        adUnitId: 'test_ad_unit',
        adUnitIndex: 'test_index',
        mediaTypes: null
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
    
    it('should return false if mediaTypes does not have banner, native, or video', function() {
      mockCustomUtils.util.isObject.callsFake((val) => {
        return val !== null && val !== undefined && 
               !(val === adUnitObject.mediaTypes.banner || 
                 val === adUnitObject.mediaTypes.native || 
                 val === adUnitObject.mediaTypes.video);
      });
      mockCustomUtils.util.isString.returns(true);
      
      const adUnitObject = {
        code: 'test_code',
        divId: 'test_div',
        adUnitId: 'test_ad_unit',
        adUnitIndex: 'test_index',
        mediaTypes: {
          // missing banner, native, and video
        }
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
    
    it('should return false if banner.sizes is not an array', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isString.returns(true);
      mockCustomUtils.util.isArray.returns(false);
      
      const adUnitObject = {
        code: 'test_code',
        divId: 'test_div',
        adUnitId: 'test_ad_unit',
        adUnitIndex: 'test_index',
        mediaTypes: {
          banner: {
            sizes: 'not an array'
          }
        }
      };
      
      const result = custom.validateAdUnitObject(adUnitObject);
      
      expect(result).to.be.false;
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });
  });
  
  describe('getAdSlotSizesArray', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should return sizes from banner.sizes', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isArray.returns(true);
      
      const adUnitObject = {
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        }
      };
      
      const result = custom.getAdSlotSizesArray(adUnitObject);
      
      expect(result).to.deep.equal([[300, 250], [300, 600]]);
    });
    
    it('should return empty array if mediaTypes is not an object', function() {
      mockCustomUtils.util.isObject.withArgs(undefined).returns(false);
      
      const adUnitObject = {
        // missing mediaTypes
      };
      
      const result = custom.getAdSlotSizesArray(adUnitObject);
      
      expect(result).to.deep.equal([]);
    });
    
    it('should return empty array if banner is not an object', function() {
      mockCustomUtils.util.isObject.callsFake((val) => {
        return val !== null && val !== undefined && val !== adUnitObject.mediaTypes.banner;
      });
      
      const adUnitObject = {
        mediaTypes: {
          banner: null
        }
      };
      
      const result = custom.getAdSlotSizesArray(adUnitObject);
      
      expect(result).to.deep.equal([]);
    });
    
    it('should return empty array if sizes is not an array', function() {
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isArray.returns(false);
      
      const adUnitObject = {
        mediaTypes: {
          banner: {
            sizes: 'not an array'
          }
        }
      };
      
      const result = custom.getAdSlotSizesArray(adUnitObject);
      
      expect(result).to.deep.equal([]);
    });
  });
  
  describe('findWinningBidAndGenerateTargeting', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
    
    it('should return bid data', function() {
      const divId = 'test_div';
      const mockBid = {
        wb: {
          adHtml: '<div>test ad 123</div>',
          adapterID: 'pubmatic',
          grossEcpm: 1.5,
          netEcpm: 1.0,
          height: 250,
          width: 300
        },
        kvp: {
          pw_ht: '300x250',
          pw_bid: '1.5',
          hb_bidder: 'pubmatic'
        }
      };
      mockCustomUtils.CONFIG.isUsePrebidKeysEnabled.returns(true);
      mockCustomUtils.prebid.getBid.returns(mockBid);
      mockCustomUtils.bidManager.getAllPartnersBidStatuses.returns({
        pubmatic: 1
      });
      
      const result = custom.findWinningBidAndGenerateTargeting(divId);
            
      expect(result).to.be.an('object');
      expect(result.wb).to.be.an('object');
      expect(result.wb.adapterID).to.equal('pubmatic');
      expect(result.wb.grossEcpm).to.equal(1.5);
      expect(result.wb.netEcpm).to.equal(1.0);
      expect(result.wb.height).to.equal(250);
      expect(result.wb.width).to.equal(300);
      expect(mockCustomUtils.prebid.getBid.calledWith(divId)).to.be.true;
    });
    
    it('should return null if no bid is found', function() {
      const divId = 'test_div';
      
      mockCustomUtils.prebid.getBid.returns({});
      
      const result = custom.findWinningBidAndGenerateTargeting(divId);
      
      expect(result.wb).to.be.null;
      expect(result.kvp).to.be.null;
      expect(mockCustomUtils.prebid.getBid.calledWith(divId)).to.be.true;
    });
  });
  
  describe('origCustomServerExposedAPI', function() {
    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);
    });
    
    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });
  
    
    it('should handle non-array input', function() {
      const adUnits = 'not an array';
      const callback = sandbox.stub();
      
      mockCustomUtils.util.isArray.returns(false);
      
      custom.origCustomServerExposedAPI(adUnits, callback);
      
      expect(mockCustomUtils.util.error.called).to.be.true;
    });
  });
});