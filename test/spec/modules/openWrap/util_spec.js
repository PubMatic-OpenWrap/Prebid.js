import * as util from '../../../../modules/openWrap/util.js';
import * as conf from '../../../../modules/openWrap/conf.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as CONFIG from '../../../../modules/openWrap/config.js';
import * as bidManager from '../../../../modules/openWrap/bidManager.js'

describe('OpenWrap Core Module: util.js', function () {
  let sandbox;
  let mockConsole;
  let clock;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers();
    
    // Mock console
    mockConsole = {
      log: sandbox.stub(),
      error: sandbox.stub(),
      warn: sandbox.stub()
    };
    sandbox.stub(window, 'console').value(mockConsole);
  });

  afterEach(function () {
    sandbox.restore();
    clock.restore();
  });

  describe('Type Checking Functions', function () {
    describe('isA', function () {
      it('should correctly identify types', function () {
        expect(util.isA([], 'Array')).to.be.true;
        expect(util.isA('test', 'String')).to.be.true;
        expect(util.isA(function() {}, 'Function')).to.be.true;
        expect(util.isA(42, 'Number')).to.be.true;
        expect(util.isA({}, 'Object')).to.be.true;
        
        expect(util.isA([], 'String')).to.be.false;
        expect(util.isA('test', 'Array')).to.be.false;
      });
    });

    describe('isFunction', function () {
      it('should identify functions correctly', function () {
        expect(util.isFunction(function() {})).to.be.true;
        expect(util.isFunction(() => {})).to.be.true;
        expect(util.isFunction(class {})).to.be.true;
        
        expect(util.isFunction({})).to.be.false;
        expect(util.isFunction([])).to.be.false;
        expect(util.isFunction('')).to.be.false;
        expect(util.isFunction(42)).to.be.false;
      });
    });

    describe('isString', function () {
      it('should identify strings correctly', function () {
        expect(util.isString('')).to.be.true;
        expect(util.isString('test')).to.be.true;
        expect(util.isString(String('test'))).to.be.true;
        
        expect(util.isString(42)).to.be.false;
        expect(util.isString({})).to.be.false;
        expect(util.isString([])).to.be.false;
      });
    });

    describe('isArray', function () {
      it('should identify arrays correctly', function () {
        expect(util.isArray([])).to.be.true;
        expect(util.isArray([1, 2, 3])).to.be.true;
        expect(util.isArray(new Array())).to.be.true;
        
        expect(util.isArray({})).to.be.false;
        expect(util.isArray('')).to.be.false;
        expect(util.isArray(42)).to.be.false;
      });
    });

    describe('isNumber', function () {
      it('should identify numbers correctly', function () {
        expect(util.isNumber(42)).to.be.true;
        expect(util.isNumber(0)).to.be.true;
        expect(util.isNumber(-1)).to.be.true;
        expect(util.isNumber(3.14)).to.be.true;
        
        expect(util.isNumber('42')).to.be.false;
        expect(util.isNumber(Infinity)).to.be.true;
      });
    });

    describe('isObject', function () {
      it('should identify objects correctly', function () {
        expect(util.isObject({})).to.be.true;
        expect(util.isObject(new Object())).to.be.true;
        expect(util.isObject(Object.create(null))).to.be.true;
        
        expect(util.isObject(null)).to.be.false;
        expect(util.isObject(undefined)).to.be.false;
        expect(util.isObject(42)).to.be.false;
        expect(util.isObject('test')).to.be.false;
      });
    });

    describe('isOwnProperty', function () {
      it('should check own properties correctly', function () {
        const obj = { a: 1 };
        Object.prototype.b = 2;

        expect(util.isOwnProperty(obj, 'a')).to.be.true;
        expect(util.isOwnProperty(obj, 'b')).to.be.false;
        expect(util.isOwnProperty(obj, 'toString')).to.be.false;
        
        expect(util.isOwnProperty(null, 'a')).to.be.false;
        expect(util.isOwnProperty(undefined, 'a')).to.be.false;
      });
    });

    describe('isUndefined', function () {
      it('should identify undefined correctly', function () {
        expect(util.isUndefined(undefined)).to.be.true;
        let undef;
        expect(util.isUndefined(undef)).to.be.true;
        
        expect(util.isUndefined(null)).to.be.false;
        expect(util.isUndefined('')).to.be.false;
        expect(util.isUndefined(0)).to.be.false;
        expect(util.isUndefined(false)).to.be.false;
      });
    });

    describe('isEmptyObject', function () {
      it('should identify empty objects correctly', function () {
        expect(util.isEmptyObject({})).to.be.true;
        expect(util.isEmptyObject(Object.create(null))).to.be.true;
        
        expect(util.isEmptyObject({ a: 1 })).to.be.false;        
        expect(util.isEmptyObject(null)).to.be.false;
        expect(util.isEmptyObject(undefined)).to.be.false;
      });
    });
  });

  describe('Debug Settings Functions', function () {
    afterEach(function () {
      util.debugLogIsEnabled = false;
      util.visualDebugLogIsEnabled = false;
    });

    describe('enableDebugLog and isDebugLogEnabled', function () {
      it('should enable debug logging', function () {
        util.enableDebugLog();
        expect(util.isDebugLogEnabled()).to.be.true;
      });
    });

    describe('enableVisualDebugLog', function () {
      it('should enable both debug and visual debug logging', function () {
        util.enableVisualDebugLog();
        expect(util.isDebugLogEnabled()).to.be.true;
        expect(util.visualDebugLogIsEnabled).to.be.true;
      });
    });
  });

  describe('Logging Functions', function () {
    beforeEach(function () {
      util.enableDebugLog();
    });

    describe('log', function () {
      it('should log messages when debug is enabled', function () {
        util.log('test message');
        expect(mockConsole.log.calledWith(sinon.match(/\[OpenWrap\] : test message/))).to.be.true;

        util.log({ key: 'value' });
        expect(mockConsole.log.calledWith({ key: 'value' })).to.be.true;
      });

    });

    describe('logError', function () {
      it('should log errors when debug is enabled', function () {
        util.logError('test error');
        expect(mockConsole.error.calledWith(sinon.match(/\[OpenWrap\] : test error/))).to.be.true;

        const error = new Error('test');
        util.logError(error);
        expect(mockConsole.error.calledWith(error)).to.be.true;
      });
    });

    describe('logWarning', function () {
      it('should log warnings when debug is enabled', function () {
        util.logWarning('test warning');
        expect(mockConsole.warn.calledWith(sinon.match(/\[OpenWrap\] : test warning/))).to.be.true;

        util.logWarning({ key: 'value' });
        expect(mockConsole.warn.calledWith({ key: 'value' })).to.be.true;
      });
    });

    describe('error', function () {
      it('should always log errors regardless of debug setting', function () {
        util.error('test error');
        expect(mockConsole.log.calledWith(sinon.match(/\[OpenWrap\] : \[Error\]/))).to.be.true;
      });
    });
  });

  describe('Iteration Functions', function () {
    describe('forEachOnObject', function () {
      it('should iterate over object properties', function () {
        const obj = { a: 1, b: 2, c: 3 };
        const result = {};
        
        util.forEachOnObject(obj, function (key, value) {
          result[key] = value * 2;
        });
        
        expect(result).to.deep.equal({ a: 2, b: 4, c: 6 });
      });
      
      it('should handle non-object inputs', function () {
        const callback = sinon.spy();
        
        util.forEachOnObject(null, callback);
        util.forEachOnObject(undefined, callback);
        util.forEachOnObject('string', callback);
        util.forEachOnObject(123, callback);
        
        expect(callback.called).to.be.false;
      });
    });
    
    describe('forEachOnArray', function () {
      it('should iterate over array elements', function () {
        const arr = [1, 2, 3];
        const result = [];
        
        util.forEachOnArray(arr, function (index, value) {
          result.push(value * 2);
        });
        
        expect(result).to.deep.equal([2, 4, 6]);
      });
      
      it('should handle non-array inputs', function () {
        const callback = sinon.spy();
        
        util.forEachOnArray(null, callback);
        util.forEachOnArray(undefined, callback);
        util.forEachOnArray('string', callback);
        util.forEachOnArray(123, callback);
        util.forEachOnArray({}, callback);
        
        expect(callback.called).to.be.false;
      });
    });
  });

  describe('PubMatic Configuration Functions', function () {
    describe('getPbNameSpace', function () {
      beforeEach(function () {
        conf.pwt = {};
      });
      
      afterEach(function () {
      });
      
      it('should return IH_NAMESPACE when IDENTITY_ONLY is set to 1', function () {
        conf.pwt.identityOnly = '1';
        expect(util.getPbNameSpace()).to.equal('ihowpbjs');
      });
      
      it('should return PREBID_NAMESPACE when IDENTITY_ONLY is set to 0', function () {
        conf.pwt.identityOnly = '0';
        expect(util.getPbNameSpace()).to.equal('owpbjs');
      });
      
      it('should return PREBID_NAMESPACE by default', function () {
        conf.pwt.identityOnly = undefined;
        expect(util.getPbNameSpace()).to.equal('owpbjs');
      });
    });
  });

  describe('Time Functions', function () {
    beforeEach(function () {
      clock.setSystemTime(new Date('2025-01-01').getTime());
    });

    describe('getCurrentTimestampInMs', function () {
      it('should return current timestamp in milliseconds', function () {
        expect(util.getCurrentTimestampInMs()).to.equal(new Date('2025-01-01').getTime());
      });
    });

    describe('getCurrentTimestamp', function () {
      it('should return current timestamp in seconds', function () {
        expect(util.getCurrentTimestamp()).to.equal(Math.round(new Date('2025-01-01').getTime() / 1000));
      });
    });

    describe('getIncrementalInteger', function () {
      it('should return incrementing integers', function () {
        const first = util.getIncrementalInteger();
        const second = util.getIncrementalInteger();
        const third = util.getIncrementalInteger();

        expect(second).to.equal(first + 1);
        expect(third).to.equal(second + 1);
      });
    });
  });

  describe('String Functions', function () {
    describe('trim', function () {
      it('should trim whitespace from strings', function () {
        expect(util.trim('  test  ')).to.equal('test');
        expect(util.trim('\n\ttest\n\t')).to.equal('test');
      });

      it('should handle non-string inputs', function () {
        expect(util.trim(undefined)).to.equal(undefined);
        expect(util.trim(123)).to.equal(123);
      });
    });

    describe('generateUUID', function () {
      it('should generate unique UUIDs', function () {
        const uuids = new Set();
        for (let i = 0; i < 10; i++) {
          uuids.add(util.generateUUID());
        }
        expect(uuids.size).to.equal(10);
      });
    });
  });

  describe('Browser Functions', function () {
    describe('getTopFrameOfSameDomain', function () {

      it('should handle cross-domain access errors', function () {
        const frame = {
          get parent() { throw new Error('Cross-origin access denied'); }
        };
        expect(util.getTopFrameOfSameDomain(frame)).to.equal(frame);
      });
    });

    describe('getMetaInfo', function () {
      let mockWin;

      beforeEach(function () {
        mockWin = {
          top: window,
          parent: window,
          location: {
            protocol: 'https:',
            hostname: 'example.com',
            href: '[https://example.com/page](https://example.com/page)'
          },
          document: {
            referrer: '[https://referrer.com](https://referrer.com)'
          }
        };
      });

      it('should detect iframes correctly', function () {
        mockWin.top = { location: {} };
        mockWin.self = mockWin;
        
        const meta = util.getMetaInfo(mockWin);
        expect(meta.isInIframe).to.be.true;
      });
    });

    describe('isIframe', function () {
      it('should detect if context is in an iframe', function () {
        let obj = {};
        expect(util.isIframe({ self: obj, top: obj })).to.be.false;
        expect(util.isIframe({ self: {}, top: { something: 'else' } })).to.be.true;
      });
    });

    describe('findQueryParamInURL', function () {
      it('should find query parameters in URLs', function () {
        const url = '[https://example.com](https://example.com)?test=value&other=123&empty=';
        
        expect(util.findQueryParamInURL(url, 'test')).to.equal(true);
        expect(util.findQueryParamInURL(url, 'empty')).to.equal(true);
        expect(util.findQueryParamInURL(url, 'nonexistent')).to.be.false;
      });

      it('should handle URLs without query parameters', function () {
        expect(util.findQueryParamInURL('[https://example.com](https://example.com)', 'test')).to.be.false;
        expect(util.findQueryParamInURL('[https://example.com](https://example.com)?', 'test')).to.be.false;
      });
    });
  });

  describe('Slot and Key Generation Functions', function () {
    describe('forEachGeneratedKey', function () {
      let adapterID;
      let adUnits;
      let adapterConfig;
      let impressionID;
      let slotConfigMandatoryParams;
      let activeSlots;
      let handlerFunction;
      
      beforeEach(function() {
        // Reset sandbox for each test
        sandbox.restore();
        
        adapterID = 'test_adapter';
        adUnits = [];
        
        // Set up constants
        sandbox.stub(CONSTANTS, 'CONFIG').value({
          KEY_GENERATION_PATTERN: 'kgp',
          REGEX_KEY_GENERATION_PATTERN: 'kgp_rx'
        });
        
        // Set up adapterConfig
        adapterConfig = {
          kgp: '_DIV_@_W_x_H_'
        };
        
        impressionID = 'imp-123';
        slotConfigMandatoryParams = [];
        
        // Create a simple active slot
        activeSlots = [{
          getSizes: function() { return [[300, 250]]; },
          getDivID: function() { return 'test_div'; },
          getAdUnitID: function() { return '/test/ad/unit'; },
          getAdUnitIndex: function() { return '1'; }
        }];
        
        // Create a spy for handlerFunction
        handlerFunction = sinon.spy();
      });
      
      afterEach(function() {
        sandbox.restore();
      });
      
      it('should call handlerFunction when conditions are met', function() {
        // Execute the function under test
        util.forEachGeneratedKey(
          adapterID,
          adUnits,
          adapterConfig,
          impressionID,
          slotConfigMandatoryParams,
          activeSlots,
          handlerFunction,
          false
        );
        
        // Verify that handlerFunction was called
        expect(handlerFunction.called, 'handlerFunction should be called').to.be.true;
      });
      
      it('should not call handlerFunction with empty activeSlots', function() {
        // Execute with empty activeSlots
        util.forEachGeneratedKey(
          adapterID,
          adUnits,
          adapterConfig,
          impressionID,
          slotConfigMandatoryParams,
          [],
          handlerFunction,
          false
        );
        
        // Verify handlerFunction was not called
        expect(handlerFunction.called, 'handlerFunction should not be called with empty activeSlots').to.be.false;
      });
      
      it('should not call handlerFunction with short pattern', function() {
        // Set a pattern shorter than 3 characters
        adapterConfig.kgp = 'ab';
        
        // Execute the function
        util.forEachGeneratedKey(
          adapterID,
          adUnits,
          adapterConfig,
          impressionID,
          slotConfigMandatoryParams,
          activeSlots,
          handlerFunction,
          false
        );
        
        // Verify handlerFunction was not called
        expect(handlerFunction.called, 'handlerFunction should not be called with short pattern').to.be.false;
      });
    });
  });

  describe('generateSlotNamesFromPattern', function () {
    let mockActiveSlot;
    let videoSlotName;
    let pattern;
    let incrementalIntegerStub;
    let originalMediaTypeConfig;
    let originalGetIncrementalInteger;

    beforeEach(function () {
      // Store original mediaTypeConfig and functions
      originalMediaTypeConfig = Object.assign({}, util.mediaTypeConfig);
      originalGetIncrementalInteger = util.getIncrementalInteger;
      
      // Reset videoSlotName for each test
      videoSlotName = [];
      
      // Create a mock slot object
      mockActiveSlot = {
        getSizes: sandbox.stub(),
        getDivID: sandbox.stub(),
        getAdUnitID: sandbox.stub(),
        getAdUnitIndex: sandbox.stub()
      };
      
      // Set up default behavior for the mock slot
      mockActiveSlot.getSizes.returns([[300, 250], [728, 90]]);
      mockActiveSlot.getDivID.returns('test-div');
      mockActiveSlot.getAdUnitID.returns('/test/ad/unit');
      mockActiveSlot.getAdUnitIndex.returns('1');
      
      // Set up a test pattern
      pattern = '_DIV_@_W_x_H_';
      
      // Replace the getIncrementalInteger function completely
      util.getIncrementalInteger = function() { return 12; };
      
      // Set up mediaTypeConfig
      util.mediaTypeConfig = {};
    });

    afterEach(function () {
      // Restore original mediaTypeConfig and functions
      util.mediaTypeConfig = originalMediaTypeConfig;
      util.getIncrementalInteger = originalGetIncrementalInteger;
    });

    it('should generate slot names from pattern with multiple sizes', function () {
      const result = util.generateSlotNamesFromPattern(mockActiveSlot, pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(2);
      expect(result).to.include('test-div@300x250');
      expect(result).to.include('test-div@728x90');
      expect(videoSlotName).to.have.length(0);
    });

    it('should handle video slot mapping when shouldCheckMappingForVideo is true', function () {
      // Set up video config
      util.mediaTypeConfig['test-div'] = {
        video: true
      };
      
      // Create a new videoSlotName array for this test
      const testVideoSlotName = [];
      
      const result = util.generateSlotNamesFromPattern(mockActiveSlot, pattern, true, testVideoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(2);
      expect(result).to.include('test-div@300x250');
      expect(result).to.include('test-div@728x90');
            
    });

    it('should handle GPT slot objects', function () {
      // Create a mock GPT slot
      const mockGPTSlot = {
        getSizes: sandbox.stub(),
        getSlotId: sandbox.stub()
      };
      
      const mockSlotId = {
        getDomId: sandbox.stub(),
        getAdUnitPath: sandbox.stub(),
        getId: sandbox.stub()
      };
      
      mockSlotId.getDomId.returns('gpt-div');
      mockSlotId.getAdUnitPath.returns('/gpt/ad/unit');
      mockSlotId.getId.returns('123_4');
      
      mockGPTSlot.getSlotId.returns(mockSlotId);
      mockGPTSlot.getSizes.returns([[320, 50], [300, 600]]);
      
      const result = util.generateSlotNamesFromPattern(mockGPTSlot, pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(2);
      expect(result).to.include('gpt-div@320x50');
      expect(result).to.include('gpt-div@300x600');
    });

    it('should handle size objects with getWidth and getHeight methods', function () {
      // Create mock size objects
      const mockSizes = [
        {
          getWidth: sandbox.stub().returns(320),
          getHeight: sandbox.stub().returns(100)
        },
        {
          getWidth: sandbox.stub().returns(300),
          getHeight: sandbox.stub().returns(250)
        }
      ];
      
      mockActiveSlot.getSizes.returns(mockSizes);
      
      const result = util.generateSlotNamesFromPattern(mockActiveSlot, pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(2);
      expect(result).to.include('test-div@320x100');
      expect(result).to.include('test-div@300x250');
    });

    it('should replace all macros in the pattern', function () {
      // Use a pattern with all supported macros
      pattern = '_AU_/_AUI_/_DIV_@_W_x_H_';
      
      const result = util.generateSlotNamesFromPattern(mockActiveSlot, pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(2);
      // Both results should have the same integer value since we're mocking getIncrementalInteger to always return 12
      expect(result[0]).to.equal('/test/ad/unit/1/test-div@300x250');
      expect(result[1]).to.equal('/test/ad/unit/1/test-div@728x90');
    });

    it('should not add duplicate slot names', function () {
      // Set up sizes with duplicate dimensions
      mockActiveSlot.getSizes.returns([[300, 250], [300, 250], [728, 90]]);
      
      const result = util.generateSlotNamesFromPattern(mockActiveSlot, pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(2); // Should only have 2 unique slot names
      expect(result).to.include('test-div@300x250');
      expect(result).to.include('test-div@728x90');
    });

    it('should return empty array if activeSlot is not an object', function () {
      const result = util.generateSlotNamesFromPattern('not-an-object', pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('should return empty array if getSizes does not return an array with length > 0', function () {
      mockActiveSlot.getSizes.returns([]);
      
      const result = util.generateSlotNamesFromPattern(mockActiveSlot, pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('should skip invalid sizes', function () {
      // Set up sizes with some invalid dimensions
      mockActiveSlot.getSizes.returns([[300, 250], [null, 90], [728, null], [undefined, undefined]]);
      
      const result = util.generateSlotNamesFromPattern(mockActiveSlot, pattern, false, videoSlotName);
      
      expect(result).to.be.an('array');
      expect(result).to.have.length(1); // Should only have 1 valid slot name
      expect(result).to.include('test-div@300x250');
    });
  });

  describe('Data Type and Parameter Functions', function () {
    describe('applyDataTypeChangesIfApplicable', function () {
      beforeEach(function () {
        sandbox.stub(util, 'logError');
      });
      
      it('should convert string to number for partners requiring number type', function () {
        const params = {
          name: 'id5Id',
          'params.partner': '1234'
        };
        
        util.applyDataTypeChangesIfApplicable(params);
        expect(params['params.partner']).to.equal(1234);
      });
      
      it('should convert string to array for partners requiring array type', function () {
        const params = {
          name: 'parrableId',
          'params.timezoneFilter.allowedZones': 'zone1,zone2'
        };
        
        util.applyDataTypeChangesIfApplicable(params);
        expect(params['params.timezoneFilter.allowedZones']).to.deep.equal(['zone1', 'zone2']);
      });
      
      it('should convert number to array for partners requiring array type', function () {
        const params = {
          name: 'merkleId',
          'params.ssp_ids': 123
        };
        
        util.applyDataTypeChangesIfApplicable(params);
        expect(params['params.ssp_ids']).to.deep.equal([123]);
      });
      
      it('should parse JSON for custom objects', function () {
        const params = {
          name: 'liveIntentId',
          'params.requestedAttributesOverrides': '{"test": "value"}'
        };
        
        util.applyDataTypeChangesIfApplicable(params);
        expect(params['params.requestedAttributesOverrides']).to.deep.equal({test: 'value'});
      });
      
    });
    
    describe('applyCustomParamValuesfApplicable', function () {
      beforeEach(function() {
        // Mock CONSTANTS.ID_PARTNERS_CUSTOM_VALUES
        sandbox.stub(CONSTANTS, 'ID_PARTNERS_CUSTOM_VALUES').value({
          'intentIqId': [
            { key: 'params.partner', value: 'pubmatic' },
            { key: 'params.pcid', value: '12345' }
          ],
          'otherPartnerId': [
            { key: 'params.test', value: 'testValue' }
          ]
        });
      });
      
      it('should apply custom values for specific partners', function () {
        const params = {
          name: 'intentIqId'
        };
        
        util.applyCustomParamValuesfApplicable(params);
        expect(params).to.have.property('params.partner', 'pubmatic');
        expect(params).to.have.property('params.pcid', '12345');
      });
      
      it('should not override existing values', function () {
        const params = {
          name: 'intentIqId',
          'params.partner': 'custom-partner'
        };
        
        util.applyCustomParamValuesfApplicable(params);
        expect(params['params.partner']).to.equal('custom-partner');
        expect(params).to.have.property('params.pcid', '12345');
      });
      
      it('should not modify params for non-listed partners', function () {
        const params = {
          name: 'unknown-partner'
        };
        const originalParams = {...params};
        
        util.applyCustomParamValuesfApplicable(params);
        expect(params).to.deep.equal(originalParams);
      });
    });
  });

  describe('Browser and Device Information Functions', function () {
    beforeEach(function() {
      // Mock CONFIG functions as mentioned in the memory
      sandbox.stub(CONFIG, 'getSendAllBidsStatus').returns(true);
      sandbox.stub(CONFIG, 'getCmpApi').returns('iab');
      sandbox.stub(CONFIG, 'getGdprTimeout').returns(1000);
      sandbox.stub(CONFIG, 'getAwc').returns('1');
      sandbox.stub(CONFIG, 'getCCPACmpApi').returns('iab');
      sandbox.stub(CONFIG, 'getGppConsent').returns(true);
      sandbox.stub(CONFIG, 'getGranularityMultiplier').returns(1);
      sandbox.stub(CONFIG, 'isSchainEnabled').returns(true);
      sandbox.stub(CONFIG, 'isUserIdModuleEnabled').returns(true);
      sandbox.stub(CONFIG, 'getPriceGranularity').returns('dense');
      sandbox.stub(CONFIG, 'getAdapterNameForAlias').returns('pubmatic');
    });
    
    describe('getBrowserDetails', function () {
      beforeEach(function () {
        sandbox.stub(bidManager, 'getBrowser').returns('chrome');
      });
      
      it('should return browser details from bidManager', function () {
        expect(util.getBrowserDetails()).to.equal('chrome');
      });
    });
    
    describe('getPltForFloor', function () {
      beforeEach(function () {
        sandbox.stub(util, 'getDevicePlatform').returns(1);
      });
      
      it('should return device platform as string', function () {
        expect(util.getPltForFloor()).to.equal('1');
      });
    });
    
    describe('getGeoInfo', function () {
      let origPWT, origOwpbjs;
      
      beforeEach(function () {
        // Save original window objects
        origPWT = window.PWT;
        origOwpbjs = window.owpbjs;
        
        // Create mock objects with all required methods
        window.PWT = {
          CC: null
        };
        
        window.owpbjs = {
          getDataFromLocalStorage: sandbox.stub(),
          detectLocation: sandbox.stub(),
          setAndStringifyToLocalStorage: sandbox.stub()
        };
        
        // Set up conf with the structure expected by getGeoInfo
        if (!conf.pwt) {
          conf.pwt = {};
        }
        conf.pwt.pubid = 'test-pub';
        
        // Mock getPbNameSpace to return the correct namespace
        sandbox.stub(util, 'getPbNameSpace').returns('ihowpbjs');
      });
      
      afterEach(function () {
        // Restore original window objects
        window.PWT = origPWT;
        window.owpbjs = origOwpbjs;
        
        // Clean up conf
        if (conf.pwt) {
          delete conf.pwt.pubid;
        }
      });
      
      it('should use cached geo data if available', function () {
        window.owpbjs.getDataFromLocalStorage.returns('{"cc":"US"}');
        
        util.getGeoInfo();
        
        expect(window.PWT.CC).to.deep.equal({cc: 'US'});
        expect(window.owpbjs.detectLocation.called).to.be.false;
      });
      
      it('should fetch geo data if not in cache', function () {
        window.owpbjs.getDataFromLocalStorage.returns(null);
        
        util.getGeoInfo();
        
        expect(window.owpbjs.detectLocation.called).to.be.true;
        const url = window.owpbjs.detectLocation.args[0][0];
        expect(url).to.include('pubid=test-pub');
      });
    });
    
    describe('getCDSTargetingData', function () {
      let origPWT;
      
      beforeEach(function () {
        origPWT = window.PWT;
        
        // Create a mock PWT object with getConfig method
        window[CONSTANTS.COMMON.PREBID_NAMESPACE] = {
          getConfig: sandbox.stub()
        };
        
        // Setup mock CDS data
        const mockCdsData = {
          'key1': { value: 'value1', sendtoGAM: true },
          'key2': { value: 'value2', sendtoGAM: false },
          'key3': { value: ['array'], sendtoGAM: true },
          'key4': { value: { obj: 'value' }, sendtoGAM: true },
          'key5': { value: 123, sendtoGAM: true }
        };
        
        window[CONSTANTS.COMMON.PREBID_NAMESPACE].getConfig.withArgs('cds').returns(mockCdsData);
      });
      
      afterEach(function () {
        window[CONSTANTS.COMMON.PREBID_NAMESPACE] = origPWT;
      });
      
      it('should extract CDS targeting data with sendtoGAM flag', function () {
        const result = util.getCDSTargetingData({});
        
        expect(result).to.have.property('key1', 'value1');
        expect(result).to.not.have.property('key2');
        expect(result).to.have.property('key5', 123);
        expect(result).to.have.property('key3', '');
        expect(result).to.have.property('key4', '');
      });
      
      it('should merge with existing object if provided', function () {
        const existing = { existingKey: 'existingValue' };
        const result = util.getCDSTargetingData(existing);
        
        expect(result).to.have.property('existingKey', 'existingValue');
        expect(result).to.have.property('key1', 'value1');
      });
      
      it('should handle null or undefined CDS data', function() {
        window[CONSTANTS.COMMON.PREBID_NAMESPACE].getConfig.withArgs('cds').returns(null);
        
        const result = util.getCDSTargetingData({});
        expect(result).to.deep.equal({});
      });
    });
  });

  describe('Device Detection', function () {
    let originalUserAgent;

    beforeEach(function () {
      originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: '',
        writable: true
      });
    });

    afterEach(function () {
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: originalUserAgent,
        writable: true
      });
    });

    describe('getDevicePlatform', function () {
      it('should detect desktop devices', function () {
        navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
        expect(util.getDevicePlatform()).to.equal(1);
      });

      it('should handle empty or invalid user agents', function () {
        navigator.userAgent = '';
        expect(util.getDevicePlatform()).to.equal(3);

        navigator.userAgent = null;
        expect(util.getDevicePlatform()).to.equal(3);
      });
    });
  });
});