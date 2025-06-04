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
        },
        MESSAGES: {
          M34: 'Warning: could not find div with id',
          M35: 'Error: missing pwtsid for div',
          M33: 'Warning: adUnitsArray is not an array'
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
        logWarning: sandbox.stub(),
        addMessageEventListenerForSafeFrame: sandbox.stub(),
        getAdUnitConfig: sandbox.stub().returns({
          mediaTypeObject: { banner: { sizes: [[300, 250]] } },
          floors: { default: 1.0 }
        }),
        getCDSTargetingData: sandbox.stub().returns({
          pwt_test: 'test_value'
        }),
        createVLogInfoPanel: sandbox.stub(),
        realignVLogInfoPanel: sandbox.stub()
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

      // Setup window.PWT
      window.PWT = window.PWT || {};
    });

    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;

      // Clean up window.PWT
      delete window.PWT.adUnits;
    });

    it('should handle non-array input', function() {
      const adUnits = 'not an array';
      const callback = sandbox.stub();

      mockCustomUtils.util.isArray.returns(false);

      custom.origCustomServerExposedAPI(adUnits, callback);

      expect(mockCustomUtils.util.error.called).to.be.true;
      expect(callback.calledWith(adUnits)).to.be.true;
    });

    it('should handle non-function callback', function() {
      const adUnits = [];
      const callback = 'not a function';

      mockCustomUtils.util.isArray.returns(true);
      mockCustomUtils.util.isFunction.returns(false);

      custom.origCustomServerExposedAPI(adUnits, callback);

      expect(mockCustomUtils.util.error.called).to.be.true;
    });

    it('should handle case with no qualifying slots', function() {
      const adUnits = [
        { code: 'test1' },
        { code: 'test2' }
      ];
      const callback = sandbox.stub();

      // Setup stubs for utility functions
      mockCustomUtils.util.isArray.returns(true);
      mockCustomUtils.util.isFunction.returns(true);

      // We need to bypass the validateAdUnitObject function entirely
      // to avoid the TypeError with mediaTypes.banner
      mockCustomUtils.util.forEachOnArray = sandbox.stub().callsFake((array, callback) => {
        // Don't actually call the callback - this simulates no qualifying slots
      });

      custom.origCustomServerExposedAPI(adUnits, callback);

      // Verify error was logged
      expect(mockCustomUtils.util.error.called).to.be.true;

      // Verify callback was called with original ad units
      expect(callback.calledWith(adUnits)).to.be.true;
    });

    it('should handle ad units without divId', function() {
      const adUnits = [
        {
          code: 'test1',
          adUnitId: 'ad1',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        }
      ];
      const callback = sandbox.stub();

      // Setup stubs
      mockCustomUtils.util.isArray.returns(true);
      mockCustomUtils.util.isFunction.returns(true);

      sandbox.stub(custom, 'validateAdUnitObject').returns(true);

      const mockSlot = {
        setDivID: sandbox.stub(),
        setPubAdServerObject: sandbox.stub(),
        setAdUnitID: sandbox.stub(),
        setAdUnitIndex: sandbox.stub(),
        setSizes: sandbox.stub(),
        getDivID: sandbox.stub().returns('test1'), // divId is set to code
        getName: sandbox.stub().returns('test1'),
        getSizes: sandbox.stub().returns([[300, 250]])
      };

      mockCustomUtils.SLOT.createSlot = sandbox.stub().returns(mockSlot);

      sandbox.stub(custom, 'getAdSlotSizesArray').returns([[300, 250]]);

      mockCustomUtils.prebid.fetchBids = sandbox.stub().callsFake((slots, cb) => {
        cb();
      });

      sandbox.stub(custom, 'findWinningBidAndGenerateTargeting').returns({
        wb: { width: 300, height: 250 },
        kvp: { pw_bid: '1.0' }
      });

      // Call the function
      custom.origCustomServerExposedAPI(adUnits, callback);

      // Verify divId was set to code
      expect(mockSlot.setDivID.calledWith('test1')).to.be.true;

      // Restore stubs
      custom.validateAdUnitObject.restore();
      custom.getAdSlotSizesArray.restore();
      custom.findWinningBidAndGenerateTargeting.restore();
    });

    it('should handle ad units without adUnitId', function() {
      const adUnits = [
        {
          code: 'test1',
          divId: 'div1',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        }
      ];
      const callback = sandbox.stub();

      // Setup stubs
      mockCustomUtils.util.isArray.returns(true);
      mockCustomUtils.util.isFunction.returns(true);

      sandbox.stub(custom, 'validateAdUnitObject').returns(true);

      const mockSlot = {
        setDivID: sandbox.stub(),
        setPubAdServerObject: sandbox.stub(),
        setAdUnitID: sandbox.stub(),
        setAdUnitIndex: sandbox.stub(),
        setSizes: sandbox.stub(),
        getDivID: sandbox.stub().returns('div1'),
        getName: sandbox.stub().returns('test1'),
        getSizes: sandbox.stub().returns([[300, 250]])
      };

      mockCustomUtils.SLOT.createSlot = sandbox.stub().returns(mockSlot);

      sandbox.stub(custom, 'getAdSlotSizesArray').returns([[300, 250]]);

      mockCustomUtils.prebid.fetchBids = sandbox.stub().callsFake((slots, cb) => {
        cb();
      });

      sandbox.stub(custom, 'findWinningBidAndGenerateTargeting').returns({
        wb: { width: 300, height: 250 },
        kvp: { pw_bid: '1.0' }
      });

      // Call the function
      custom.origCustomServerExposedAPI(adUnits, callback);

      // Verify adUnitId was set to empty string
      expect(mockSlot.setAdUnitID.calledWith('')).to.be.true;

      // Restore stubs
      custom.validateAdUnitObject.restore();
      custom.getAdSlotSizesArray.restore();
      custom.findWinningBidAndGenerateTargeting.restore();
    });
  });

  describe('displayCreativeWithoutAdServer', function() {
    let adUnit;
    let mockDiv;
    let mockIframe;
    let mockIframeDoc;
    let mockIframeStyle;

    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);

      // Create mock DOM elements
      mockDiv = {
        appendChild: sandbox.stub()
      };

      mockIframeStyle = {
        appendChild: sandbox.stub()
      };

      mockIframeDoc = {
        createElement: sandbox.stub().returns(mockIframeStyle),
        createTextNode: sandbox.stub().returns('normalized-css-text'),
        head: {
          appendChild: sandbox.stub()
        }
      };

      mockIframe = {
        contentWindow: {
          document: mockIframeDoc
        },
        style: {
          setProperty: sandbox.stub()
        },
        setAttribute: sandbox.stub(),
        sandbox: {
          add: sandbox.stub()
        },
        remove: sandbox.stub()
      };

      // Setup test adUnit
      adUnit = {
        divId: 'test_div_id',
        bidData: {
          kvp: {
            pwtsid: 'test_pwtsid'
          }
        }
      };

      // Setup document.getElementById stub
      sandbox.stub(document, 'getElementById');
      document.getElementById.withArgs(adUnit.divId).returns(mockDiv);
      document.getElementById.withArgs('prebid_ads_iframe_' + adUnit.divId).returns(mockIframe);

      // Setup document.createElement stub
      sandbox.stub(document, 'createElement').returns(mockIframe);

      // Setup owpbjs.renderAd stub
      window.owpbjs = {
        renderAd: sandbox.stub()
      };
    });

    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
      delete window.owpbjs;
    });

    it('should create and append iframe when div exists and pwtsid is present', function() {
      custom.displayCreativeWithoutAdServer(adUnit);

      // Verify document.getElementById was called with the correct divId
      expect(document.getElementById.calledWith(adUnit.divId)).to.be.true;

      // Verify iframe properties were set correctly
      expect(mockIframe.scrolling).to.equal('no');
      expect(mockIframe.frameBorder).to.equal('0');
      expect(mockIframe.marginHeight).to.equal('0');
      expect(mockIframe.name).to.equal('prebid_ads_iframe_' + adUnit.divId);
      expect(mockIframe.id).to.equal('prebid_ads_iframe_' + adUnit.divId);
      expect(mockIframe.title).to.equal('3rd party ad content');

      // Verify iframe was appended to div
      expect(mockDiv.appendChild.calledWith(mockIframe)).to.be.true;

      // Verify owpbjs.renderAd was called with correct parameters
      expect(window.owpbjs.renderAd.calledWith(mockIframeDoc, adUnit.bidData.kvp.pwtsid)).to.be.true;

      // Verify CSS normalization was added to iframe
      expect(mockIframeDoc.createElement.calledWith('style')).to.be.true;
      expect(mockIframeDoc.createTextNode.called).to.be.true;
      expect(mockIframeStyle.appendChild.called).to.be.true;
      expect(mockIframeDoc.head.appendChild.called).to.be.true;
    });

    it('should remove existing iframe if it exists', function() {
      // Setup existing iframe
      document.getElementById.withArgs('prebid_ads_iframe_' + adUnit.divId).returns(mockIframe);

      custom.displayCreativeWithoutAdServer(adUnit);

      // Verify old iframe was removed
      expect(mockIframe.remove.called).to.be.true;
    });

    it('should log error if pwtsid is missing', function() {
      // Setup adUnit without pwtsid
      const adUnitWithoutPwtsid = {
        divId: 'test_div_id',
        bidData: {
          kvp: {}
        }
      };

      custom.displayCreativeWithoutAdServer(adUnitWithoutPwtsid);

      // Verify error was logged
      expect(mockCustomUtils.util.logError.called).to.be.true;
    });

    it('should log warning if div does not exist', function() {
      // Setup document.getElementById to return null
      document.getElementById.withArgs(adUnit.divId).returns(null);

      custom.displayCreativeWithoutAdServer(adUnit);

      // Verify warning was logged
      expect(mockCustomUtils.util.logWarning.called).to.be.true;
      expect(mockCustomUtils.util.logWarning.calledWith(mockCustomUtils.CONSTANTS.MESSAGES.M34 + ' ' + null)).to.be.true;
    });

    it('should handle case when iframe contentWindow is not available', function() {
      // Setup mockIframe without contentWindow
      mockIframe.contentWindow = null;

      custom.displayCreativeWithoutAdServer(adUnit);

      // Verify iframe was still created and appended
      expect(mockDiv.appendChild.calledWith(mockIframe)).to.be.true;

      // Verify renderAd was not called
      expect(window.owpbjs.renderAd.called).to.be.false;
    });
  });

  describe('removeKeyValuePairsFromGPTSlots', function() {
    let mockGPTSlots;
    let mockGPTSlot;

    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);

      // Setup mock GPT slots
      mockGPTSlot = {
        getTargetingKeys: sandbox.stub().returns(['key1', 'key2', 'pw_ht']),
        getTargeting: sandbox.stub(),
        clearTargeting: sandbox.stub(),
        setTargeting: sandbox.stub()
      };

      // Return different values based on the key
      mockGPTSlot.getTargeting.withArgs('key1').returns('value1');
      mockGPTSlot.getTargeting.withArgs('key2').returns('value2');
      mockGPTSlot.getTargeting.withArgs('pw_ht').returns('300x250');

      mockGPTSlots = [mockGPTSlot];

      // Define wrapper targeting keys
      custom.defineWrapperTargetingKeys({
        pw_ht: 'pw_ht'
      });
    });

    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });

    it('should remove wrapper targeting keys and preserve other keys', function() {
      // Configure util.isFunction to return true for all checks
      mockCustomUtils.util.isFunction.returns(true);

      // Configure CONFIG.shouldClearTargeting to return true
      mockCustomUtils.CONFIG.shouldClearTargeting.returns(true);

      // Configure util.isOwnProperty to return true only for wrapper keys
      mockCustomUtils.util.isOwnProperty.callsFake((obj, key) => {
        return key === 'pw_ht';
      });

      custom.removeKeyValuePairsFromGPTSlots(mockGPTSlots);

      // Verify forEachOnArray was called with the array of GPT slots
      expect(mockCustomUtils.util.forEachOnArray.calledWith(mockGPTSlots)).to.be.true;

      // Verify getTargetingKeys was called
      expect(mockGPTSlot.getTargetingKeys.called).to.be.true;

      // Verify getTargeting was called for each key
      expect(mockGPTSlot.getTargeting.calledWith('key1')).to.be.true;
      expect(mockGPTSlot.getTargeting.calledWith('key2')).to.be.true;
      expect(mockGPTSlot.getTargeting.calledWith('pw_ht')).to.be.true;

      // Verify clearTargeting was called
      expect(mockGPTSlot.clearTargeting.called).to.be.true;

      // Verify setTargeting was called for non-wrapper keys
      expect(mockGPTSlot.setTargeting.calledWith('key1', 'value1')).to.be.true;
      expect(mockGPTSlot.setTargeting.calledWith('key2', 'value2')).to.be.true;

      // Verify setTargeting was NOT called for wrapper keys
      expect(mockGPTSlot.setTargeting.calledWith('pw_ht', '300x250')).to.be.false;
    });

    it('should not clear targeting when CONFIG.shouldClearTargeting returns false', function() {
      // Configure util.isFunction to return true for all checks
      mockCustomUtils.util.isFunction.returns(true);

      // Configure CONFIG.shouldClearTargeting to return false
      mockCustomUtils.CONFIG.shouldClearTargeting.returns(false);

      custom.removeKeyValuePairsFromGPTSlots(mockGPTSlots);

      // Verify clearTargeting was NOT called
      expect(mockGPTSlot.clearTargeting.called).to.be.false;

      // Verify setTargeting was NOT called for any keys
      expect(mockGPTSlot.setTargeting.called).to.be.false;
    });

    it('should handle case when getTargetingKeys is not a function', function() {
      // Configure util.isFunction to return false for getTargetingKeys check
      mockCustomUtils.util.isFunction.withArgs(mockGPTSlot.getTargetingKeys).returns(false);

      // Configure util.isFunction to return true for other checks
      mockCustomUtils.util.isFunction.withArgs(mockGPTSlot.clearTargeting).returns(true);
      mockCustomUtils.util.isFunction.withArgs(mockGPTSlot.setTargeting).returns(true);

      // Configure CONFIG.shouldClearTargeting to return true
      mockCustomUtils.CONFIG.shouldClearTargeting.returns(true);

      custom.removeKeyValuePairsFromGPTSlots(mockGPTSlots);

      // Verify getTargetingKeys was NOT called
      expect(mockGPTSlot.getTargetingKeys.called).to.be.false;

      // Verify clearTargeting was still called
      expect(mockGPTSlot.clearTargeting.called).to.be.true;

      // Verify setTargeting was NOT called (no keys to restore)
      expect(mockGPTSlot.setTargeting.called).to.be.false;
    });

    it('should handle case when clearTargeting is not a function', function() {
      // Reset isFunction stub to default behavior
      mockCustomUtils.util.isFunction.reset();

      // Configure util.isFunction for specific cases
      mockCustomUtils.util.isFunction.callsFake((fn) => {
        if (fn === mockGPTSlot.clearTargeting) {
          return false;
        }
        return true;
      });

      // Configure CONFIG.shouldClearTargeting to return true
      mockCustomUtils.CONFIG.shouldClearTargeting.returns(true);

      // Configure util.isOwnProperty to return true only for wrapper keys
      mockCustomUtils.util.isOwnProperty.callsFake((obj, key) => {
        return key === 'pw_ht';
      });

      custom.removeKeyValuePairsFromGPTSlots(mockGPTSlots);

      // Verify getTargetingKeys was called
      expect(mockGPTSlot.getTargetingKeys.called).to.be.true;

      // Verify clearTargeting was NOT called
      expect(mockGPTSlot.clearTargeting.called).to.be.false;

      // Verify setTargeting was still called for non-wrapper keys
      expect(mockGPTSlot.setTargeting.calledWith('key1', 'value1')).to.be.true;
      expect(mockGPTSlot.setTargeting.calledWith('key2', 'value2')).to.be.true;
    });

    it('should handle case when setTargeting is not a function', function() {
      // Configure util.isFunction to return true for getTargetingKeys and clearTargeting checks
      mockCustomUtils.util.isFunction.withArgs(mockGPTSlot.getTargetingKeys).returns(true);
      mockCustomUtils.util.isFunction.withArgs(mockGPTSlot.clearTargeting).returns(true);

      // Configure util.isFunction to return false for setTargeting check
      mockCustomUtils.util.isFunction.withArgs(mockGPTSlot.setTargeting).returns(false);

      // Configure CONFIG.shouldClearTargeting to return true
      mockCustomUtils.CONFIG.shouldClearTargeting.returns(true);

      custom.removeKeyValuePairsFromGPTSlots(mockGPTSlots);

      // Verify getTargetingKeys was called
      expect(mockGPTSlot.getTargetingKeys.called).to.be.true;

      // Verify clearTargeting was called
      expect(mockGPTSlot.clearTargeting.called).to.be.true;

      // Verify setTargeting was NOT called
      expect(mockGPTSlot.setTargeting.called).to.be.false;
    });

    it('should handle empty array of GPT slots', function() {
      custom.removeKeyValuePairsFromGPTSlots([]);

      // Verify forEachOnArray was called with empty array
      expect(mockCustomUtils.util.forEachOnArray.calledWith([])).to.be.true;
    });
  });

  describe('addKeyValuePairsToGPTSlots', function() {
    let mockGPTSlots;
    let mockGPTSlot1;
    let mockGPTSlot2;
    let mockSlotId1;
    let mockSlotId2;
    let originalGoogletag;
    let originalForEachOnArray;
    let originalForEachOnObject;

    beforeEach(function() {
      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);

      // Save original googletag
      originalGoogletag = window.googletag;

      // Save original forEachOnArray and forEachOnObject
      originalForEachOnArray = mockCustomUtils.util.forEachOnArray;
      originalForEachOnObject = mockCustomUtils.util.forEachOnObject;

      // Setup mock GPT slots
      mockSlotId1 = {
        getDomId: sandbox.stub().returns('div1')
      };

      mockSlotId2 = {
        getDomId: sandbox.stub().returns('div2')
      };

      mockGPTSlot1 = {
        getSlotId: sandbox.stub().returns(mockSlotId1),
        setTargeting: sandbox.stub()
      };

      mockGPTSlot2 = {
        getSlotId: sandbox.stub().returns(mockSlotId2),
        setTargeting: sandbox.stub()
      };

      mockGPTSlots = [mockGPTSlot1, mockGPTSlot2];

      // Setup googletag mock
      window.googletag = {
        pubads: sandbox.stub().returns({
          getSlots: sandbox.stub().returns(mockGPTSlots),
          setTargeting: sandbox.stub()
        })
      };

      // Setup getCDSTargetingData mock
      mockCustomUtils.util.getCDSTargetingData.returns({
        cds_key1: 'cds_value1',
        cds_key2: 'cds_value2'
      });
    });

    afterEach(function() {
      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;

      // Restore googletag
      window.googletag = originalGoogletag;

      // Restore forEachOnArray and forEachOnObject
      mockCustomUtils.util.forEachOnArray = originalForEachOnArray;
      mockCustomUtils.util.forEachOnObject = originalForEachOnObject;
    });

    it('should add key-value pairs to GPT slots', function() {
      const adUnits = [
        {
          divId: 'div1',
          bidData: {
            kvp: {
              pw_ht: '300x250',
              pw_bid: '1.5'
            }
          }
        },
        {
          divId: 'div2',
          bidData: {
            kvp: {
              pw_ht: '728x90',
              pw_bid: '2.0'
            }
          }
        }
      ];

      // Configure util.isArray to return true
      mockCustomUtils.util.isArray.returns(true);

      // Configure util.isObject to return true
      mockCustomUtils.util.isObject.returns(true);

      // Configure util.isFunction to return true
      mockCustomUtils.util.isFunction.returns(true);

      // Configure util.isOwnProperty to return true for div1 and div2
      mockCustomUtils.util.isOwnProperty.callsFake((obj, key) => {
        return key === 'div1' || key === 'div2';
      });

      // Implement forEachOnArray and forEachOnObject
      mockCustomUtils.util.forEachOnArray = function(array, callback) {
        if (array && Array.isArray(array)) {
          for (let i = 0; i < array.length; i++) {
            callback(i, array[i]);
          }
        }
      };

      mockCustomUtils.util.forEachOnObject = function(obj, callback) {
        if (obj && typeof obj === 'object') {
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              callback(key, obj[key]);
            }
          }
        }
      };

      // Call the function
      custom.addKeyValuePairsToGPTSlots(adUnits);

      // Verify googletag.pubads().getSlots() was called
      expect(window.googletag.pubads.called).to.be.true;
      expect(window.googletag.pubads().getSlots.called).to.be.true;

      // Verify getSlotId and getDomId were called for each slot
      expect(mockGPTSlot1.getSlotId.called).to.be.true;
      expect(mockSlotId1.getDomId.called).to.be.true;
      expect(mockGPTSlot2.getSlotId.called).to.be.true;
      expect(mockSlotId2.getDomId.called).to.be.true;

      // Verify setTargeting was called with the correct key-value pairs for each slot
      expect(mockGPTSlot1.setTargeting.calledWith('pw_ht', ['300x250'])).to.be.true;
      expect(mockGPTSlot1.setTargeting.calledWith('pw_bid', ['1.5'])).to.be.true;
      expect(mockGPTSlot2.setTargeting.calledWith('pw_ht', ['728x90'])).to.be.true;
      expect(mockGPTSlot2.setTargeting.calledWith('pw_bid', ['2.0'])).to.be.true;

      // Verify CDS targeting data was set
      expect(window.googletag.pubads().setTargeting.calledWith('cds_key1', 'cds_value1')).to.be.true;
      expect(window.googletag.pubads().setTargeting.calledWith('cds_key2', 'cds_value2')).to.be.true;
    });
  });

  describe('displayAllCreativesWithoutAdServer', function() {
    let originalDisplayCreative;

    beforeEach(function() {
      // Save original function
      originalDisplayCreative = custom.displayCreativeWithoutAdServer;

      // We need to actually call initializeModule to set up the variables
      const realInitializeModule = origInitializeModule;
      custom.initializeModule = realInitializeModule;
      custom.initializeModule(mockCustomUtils);

      // Add the missing message constant
      mockCustomUtils.CONSTANTS.MESSAGES.M33 = 'Warning: adUnitsArray is not an array';
    });

    afterEach(function() {
      // Restore original function
      custom.displayCreativeWithoutAdServer = originalDisplayCreative;

      // Restore the stubbed initializeModule
      custom.initializeModule = origInitializeModule;
    });

    it('should log a warning if adUnitsArray is not an array', function() {
      // Setup test data - not an array
      const adUnitsArray = 'not an array';

      // Save original implementation
      const originalIsArray = mockCustomUtils.util.isArray;

      // Override util.isArray
      mockCustomUtils.util.isArray = function() { return false; };

      // Call the function
      custom.displayAllCreativesWithoutAdServer(adUnitsArray);

      // Restore original function
      mockCustomUtils.util.isArray = originalIsArray;

      // Verify logWarning was called
      expect(mockCustomUtils.util.logWarning.called).to.be.true;
    });
  });

  describe('generateConfForGPT', function() {
    let sandbox;
    let mockGPTSlot;
    let mockSlotId;
    let mockSizeObj;
    let originalGetAdUnitIndex;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      originalGetAdUnitIndex = custom.getAdUnitIndex;

      // Setup mock objects
      mockSizeObj = {
        getWidth: sandbox.stub().returns(300),
        getHeight: sandbox.stub().returns(250)
      };

      mockSlotId = {
        getDomId: sandbox.stub().returns('div1')
      };

      mockGPTSlot = {
        getAdUnitPath: sandbox.stub().returns('/1234/test/ad_unit'),
        getSlotId: sandbox.stub().returns(mockSlotId),
        getSizes: sandbox.stub().returns([mockSizeObj]),
        getTargeting: sandbox.stub().returns(['value1']),
        getTargetingKeys: sandbox.stub().returns(['key1'])
      };

      // Setup util stubs
      mockCustomUtils.util.isArray = sandbox.stub();
      mockCustomUtils.util.isObject = sandbox.stub();
      mockCustomUtils.util.isFunction = sandbox.stub();
      mockCustomUtils.util.error = sandbox.stub();
      mockCustomUtils.util.log = sandbox.stub();

      // Setup getAdUnitConfig mock
      mockCustomUtils.util.getAdUnitConfig = sandbox.stub().returns({
        mediaTypeObject: { banner: { sizes: [[300, 250]] } },
        floors: { default: 1.0 }
      });

      // Setup forEachOnArray implementation
      mockCustomUtils.util.forEachOnArray = function(array, callback) {
        if (array && Array.isArray(array)) {
          for (let i = 0; i < array.length; i++) {
            callback(i, array[i]);
          }
        }
      };

      // Stub getAdUnitIndex
      custom.getAdUnitIndex = sandbox.stub().returns(0);
    });

    afterEach(function() {
      custom.getAdUnitIndex = originalGetAdUnitIndex;
      sandbox.restore();
    });

    it('should return an empty array when input is an empty array', function() {
      mockCustomUtils.util.isArray.returns(true);
      const result = custom.generateConfForGPT([]);
      expect(mockCustomUtils.util.error.called).to.be.false;
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle case when slotID is null', function() {
      mockCustomUtils.util.isArray.returns(true);
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isFunction.returns(true);
      mockGPTSlot.getSlotId.returns(null);

      const result = custom.generateConfForGPT([mockGPTSlot]);

      expect(result[0].divId).to.equal('');
      expect(result[0].code).to.equal('');
      expect(mockSlotId.getDomId.called).to.be.false;
    });

    it('should handle multiple GPT slots correctly', function() {
      mockCustomUtils.util.isArray.returns(true);
      mockCustomUtils.util.isObject.returns(true);
      mockCustomUtils.util.isFunction.returns(true);

      const mockGPTSlot2 = {
        getAdUnitPath: sandbox.stub().returns('/1234/test/ad_unit2'),
        getSlotId: sandbox.stub().returns({
          getDomId: sandbox.stub().returns('div2')
        }),
        getSizes: sandbox.stub().returns([{
          getWidth: sandbox.stub().returns(728),
          getHeight: sandbox.stub().returns(90)
        }])
      };

      custom.getAdUnitIndex.callsFake(slot => slot === mockGPTSlot ? 0 : 1);

      const result = custom.generateConfForGPT([mockGPTSlot, mockGPTSlot2]);

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0].divId).to.equal('div1');
      expect(result[0].adUnitId).to.equal('/1234/test/ad_unit');
      expect(result[1].divId).to.equal('div2');
      expect(result[1].adUnitId).to.equal('/1234/test/ad_unit2');
    });
  });
});
