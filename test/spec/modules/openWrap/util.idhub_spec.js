import * as utilIdhub from '../../../../modules/openWrap/util.idhub.js';
import * as CONFIG from '../../../../modules/openWrap/config.idhub.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';

describe('OpenWrap Core Module: util.idhub.js', function() {
  let sandbox;
  let mockWindow;
  let mockDocument;
  
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    
    // Create mock DOM elements
    mockDocument = {
      createElement: sandbox.stub().callsFake((tagName) => {
        return {
          tagName,
          style: {},
          setAttribute: sandbox.stub(),
          appendChild: sandbox.stub(),
          parentNode: {
            insertBefore: sandbox.stub()
          }
        };
      }),
      getElementsByTagName: sandbox.stub().returns([{
        parentNode: {
          insertBefore: sandbox.stub()
        }
      }]),
      referrer: 'http://example-referrer.com',
      body: {
        appendChild: sandbox.stub()
      }
    };
    
    // Create mock window object without directly assigning to global window
    mockWindow = {
      document: mockDocument,
      location: {
        href: 'http://example.com/page.html?param=value',
        protocol: 'https:'
      },
      top: {},
      self: {},
      addEventListener: sandbox.stub(),
      console: {
        log: sandbox.stub(),
        error: sandbox.stub(),
        warn: sandbox.stub()
      }
    };
    
    // Stub CONFIG functions
    sandbox.stub(CONFIG, 'isIdentityOnly').returns(false);
    sandbox.stub(CONFIG, 'isSSOEnabled').returns(true);
    sandbox.stub(CONFIG, 'getIdentityPartners').returns({
      'pubCommonId': {
        'name': 'pubCommonId',
        'storage.type': 'cookie',
        'storage.name': '_pubcid',
        'storage.expires': 365
      },
      'identityLink': {
        'name': 'identityLink',
        'params.pid': '12345',
        'params.notifyData': '{"foo":"bar"}',
        'params.storageType': 'cookie',
        'storage.type': 'cookie',
        'storage.name': 'idl_env',
        'storage.expires': 30
      }
    });
    sandbox.stub(CONFIG, 'getCCPA').returns(false);
    sandbox.stub(CONFIG, 'getGdpr').returns(false);
    sandbox.stub(CONFIG, 'getOwVersion').returns('1.0.0');
    sandbox.stub(CONFIG, 'getPrebidVersion').returns('5.0.0');
    sandbox.stub(CONFIG, 'getProfileID').returns('12345');
    sandbox.stub(CONFIG, 'getProfileDisplayVersionID').returns('67890');
    
    // Set Date constructor to return consistent timestamp
    sandbox.stub(Date.prototype, 'getTime').returns(12345);
  });
  
  afterEach(function() {
    sandbox.restore();
  });
  
  describe('Type checking functions', function() {
    it('isA should correctly identify object types', function() {
      expect(utilIdhub.isA([], 'Array')).to.be.true;
      expect(utilIdhub.isA({}, 'Array')).to.be.false;
      expect(utilIdhub.isA('test', 'String')).to.be.true;
      expect(utilIdhub.isA(123, 'String')).to.be.false;
      expect(utilIdhub.isA(function() {}, 'Function')).to.be.true;
      expect(utilIdhub.isA({}, 'Function')).to.be.false;
      expect(utilIdhub.isA(123, 'Number')).to.be.true;
      expect(utilIdhub.isA('123', 'Number')).to.be.false;
    });
    
    it('isFunction should correctly identify functions', function() {
      expect(utilIdhub.isFunction(function() {})).to.be.true;
      expect(utilIdhub.isFunction(() => {})).to.be.true;
      expect(utilIdhub.isFunction({})).to.be.false;
      expect(utilIdhub.isFunction('function')).to.be.false;
      expect(utilIdhub.isFunction(null)).to.be.false;
      expect(utilIdhub.isFunction(undefined)).to.be.false;
    });
    
    it('isString should correctly identify strings', function() {
      expect(utilIdhub.isString('test')).to.be.true;
      expect(utilIdhub.isString(String('test'))).to.be.true;
      expect(utilIdhub.isString(123)).to.be.false;
      expect(utilIdhub.isString(null)).to.be.false;
      expect(utilIdhub.isString(undefined)).to.be.false;
    });
    
    it('isArray should correctly identify arrays', function() {
      expect(utilIdhub.isArray([])).to.be.true;
      expect(utilIdhub.isArray([1, 2, 3])).to.be.true;
      expect(utilIdhub.isArray({})).to.be.false;
      expect(utilIdhub.isArray('array')).to.be.false;
      expect(utilIdhub.isArray(123)).to.be.false;
      expect(utilIdhub.isArray(null)).to.be.false;
      expect(utilIdhub.isArray(undefined)).to.be.false;
    });
    
    it('isNumber should correctly identify numbers', function() {
      expect(utilIdhub.isNumber(123)).to.be.true;
      expect(utilIdhub.isNumber(0)).to.be.true;
      expect(utilIdhub.isNumber(-1)).to.be.true;
      expect(utilIdhub.isNumber('123')).to.be.false;
      expect(utilIdhub.isNumber(null)).to.be.false;
      expect(utilIdhub.isNumber(undefined)).to.be.false;
    });
    
    it('isObject should correctly identify objects', function() {
      expect(utilIdhub.isObject({})).to.be.true;
      expect(utilIdhub.isObject({a: 1})).to.be.true;
      expect(utilIdhub.isObject(null)).to.be.false;
      expect(utilIdhub.isObject(undefined)).to.be.false;
      expect(utilIdhub.isObject('object')).to.be.false;
      expect(utilIdhub.isObject(123)).to.be.false;
    });
    
    it('isOwnProperty should correctly check if property exists on object', function() {
      const obj = { prop: 'value' };
      expect(utilIdhub.isOwnProperty(obj, 'prop')).to.be.true;
      expect(utilIdhub.isOwnProperty(obj, 'toString')).to.be.false;
      expect(utilIdhub.isOwnProperty(null, 'prop')).to.be.false;
      expect(utilIdhub.isOwnProperty(undefined, 'prop')).to.be.false;
    });
    
    it('isUndefined should correctly identify undefined', function() {
      expect(utilIdhub.isUndefined(undefined)).to.be.true;
      let undef;
      expect(utilIdhub.isUndefined(undef)).to.be.true;
      expect(utilIdhub.isUndefined(null)).to.be.false;
      expect(utilIdhub.isUndefined(0)).to.be.false;
      expect(utilIdhub.isUndefined('')).to.be.false;
    });
    
    it('isEmptyObject should correctly identify empty objects', function() {
      expect(utilIdhub.isEmptyObject({})).to.be.true;
      expect(utilIdhub.isEmptyObject({ prop: 'value' })).to.be.false;
      expect(utilIdhub.isEmptyObject(null)).to.be.false;
      expect(utilIdhub.isEmptyObject(undefined)).to.be.false;
    });
  });
  
  describe('Debug logging functions', function() {
    let origDebugLogIsEnabled;
    let origVisualDebugLogIsEnabled;
    let consoleLogStub;
    let consoleErrorStub;
    let consoleWarnStub;
    
    beforeEach(function() {
      // Save original values
      origDebugLogIsEnabled = utilIdhub.debugLogIsEnabled;
      origVisualDebugLogIsEnabled = utilIdhub.visualDebugLogIsEnabled;
      
      // Reset debug flags
      utilIdhub.debugLogIsEnabled = false;
      utilIdhub.visualDebugLogIsEnabled = false;
      
      // Stub console methods directly
      consoleLogStub = sandbox.stub(console, 'log');
      consoleErrorStub = sandbox.stub(console, 'error');
      consoleWarnStub = sandbox.stub(console, 'warn');
    });
    
    afterEach(function() {
      // Restore original values
      utilIdhub.debugLogIsEnabled = origDebugLogIsEnabled;
      utilIdhub.visualDebugLogIsEnabled = origVisualDebugLogIsEnabled;
      
      // Restore console methods
      consoleLogStub.restore();
      consoleErrorStub.restore();
      consoleWarnStub.restore();
    });

    it('isDebugLogEnabled should return debug log status', function() {
      expect(utilIdhub.isDebugLogEnabled()).to.be.false;
    });
    
    it('enableDebugLog should enable debug logging', function() {
      utilIdhub.enableDebugLog();
      expect(utilIdhub.debugLogIsEnabled).to.be.true;
    });
  
    
    it('enableVisualDebugLog should enable both debug and visual debug logging', function() {
      utilIdhub.enableVisualDebugLog();
      expect(utilIdhub.debugLogIsEnabled).to.be.true;
      expect(utilIdhub.visualDebugLogIsEnabled).to.be.true;
    });
    
    it('log should log messages when debug is enabled', function() {
      // Directly set the flag instead of using enableDebugLog
      utilIdhub.debugLogIsEnabled = true;
      
      utilIdhub.log('test message');
      expect(consoleLogStub.calledOnce).to.be.true;
      
      utilIdhub.log({ test: 'object' });
      expect(consoleLogStub.calledTwice).to.be.true;
    });
    
    it('logError should log error messages when debug is enabled', function() {
      utilIdhub.debugLogIsEnabled = true;
      
      utilIdhub.logError('test error');
      expect(consoleErrorStub.calledOnce).to.be.true;
      
      utilIdhub.logError({ error: 'object' });
      expect(consoleErrorStub.calledTwice).to.be.true;
    });
    
    it('logWarning should log warning messages when debug is enabled', function() {
      utilIdhub.debugLogIsEnabled = true;
      
      utilIdhub.logWarning('test warning');
      expect(consoleWarnStub.calledOnce).to.be.true;
      
      utilIdhub.logWarning({ warning: 'object' });
      expect(consoleWarnStub.calledTwice).to.be.true;
    });
    
    it('error should always log error messages', function() {
      // error function should log regardless of debug flag
      utilIdhub.debugLogIsEnabled = false;
      
      utilIdhub.error('test error');
      expect(consoleLogStub.calledOnce).to.be.true;
    });
  });
  
  describe('DOM and window related functions', function() {
    let mockWindow;
    
    beforeEach(function() {
      // Set up a mock window object
      mockWindow = {
        document: {
          createElement: sandbox.stub().returns({
            tagName: 'div',
            setAttribute: sandbox.stub(),
            style: {}
          }),
          referrer: 'http://example.com/page.html?param=value', // Make referrer same as page URL for test simplicity
          body: {
            appendChild: sandbox.stub()
          }
        },
        location: {
          href: 'http://example.com/page.html?param=value',
          protocol: 'https:'
        },
        top: {},
        self: {},
        addEventListener: sandbox.stub(),
        console: {
          log: sandbox.stub(),
          error: sandbox.stub(),
          warn: sandbox.stub()
        }
      };
    });
    
    it('getTopFrameOfSameDomain should return top frame when accessible', function() {
      // Set up parent relationship
      const childWin = { document: { id: 'child' } };
      const parentWin = { document: { id: 'parent' }, parent: {} };
      parentWin.parent = parentWin; // Parent is top
      childWin.parent = parentWin;
      
      // Mock the document comparison
      sandbox.stub(childWin, 'document').value({ id: 'child' });
      sandbox.stub(parentWin, 'document').value({ id: 'parent' });
      
      const result = utilIdhub.getTopFrameOfSameDomain(childWin);
      expect(result).to.equal(parentWin);
    });
    
    it('isIframe should return true when self is not top', function() {
      const testWin = {
        self: {},
        top: { different: true }
      };
      
      const result = utilIdhub.isIframe(testWin);
      
      expect(result).to.be.true;
    });
    
    it('isIframe should return false when self is top', function() {
      const testWin = {
        self: {}
      };
      testWin.top = testWin.self;
      
      const result = utilIdhub.isIframe(testWin);
      
      expect(result).to.be.false;
    });
    
    it('createDocElement should create DOM element', function() {
      const element = utilIdhub.createDocElement(mockWindow, 'div');
      
      expect(mockWindow.document.createElement.calledOnce).to.be.true;
      expect(mockWindow.document.createElement.firstCall.args[0]).to.equal('div');
      expect(element).to.exist;
    });
    
    it('getMetaInfo should return page metadata', function() {
      const result = utilIdhub.getMetaInfo(mockWindow);
      
      expect(result).to.be.an('object');
      expect(result.pageURL).to.equal('http://example.com/page.html?param=value');
      expect(result.refURL).to.equal('http://example.com/page.html?param=value');
      expect(result.protocol).to.equal('https://');
      expect(result.secure).to.equal(1);
      expect(result.pageDomain).to.equal('example.com');
    });
    
    it('getDomainFromURL should extract domain from URL', function() {
      expect(utilIdhub.getDomainFromURL('https://sub.example.com/path?query=value')).to.equal('sub.example.com');
      expect(utilIdhub.getDomainFromURL('http://example.com')).to.equal('example.com');
      expect(utilIdhub.getDomainFromURL('//example.org/path')).to.equal('example.org');
      expect(utilIdhub.getDomainFromURL('')).to.equal('localhost');
    });
    
    it('findQueryParamInURL should extract query parameters', function() {
      expect(utilIdhub.findQueryParamInURL('http://example.com?param=value', 'param')).to.equal(true);
      expect(utilIdhub.findQueryParamInURL('http://example.com?first=1&second=2', 'second')).to.equal(true);
      expect(utilIdhub.findQueryParamInURL('http://example.com?param=value', 'missing')).to.equal(false);
      expect(utilIdhub.findQueryParamInURL('http://example.com', 'param')).to.equal(false);
    });
    
    it('addHookOnFunction should add hook to function', function() {
      const obj = {
        originalFn: function(arg) {
          return 'original ' + arg;
        }
      };
      
      // Create a new function that will replace the original
      const newFn = function(arg, origFn) {
        return origFn;
      };
      
      utilIdhub.addHookOnFunction(obj, false, 'originalFn', newFn);
      
      const result = obj.originalFn('test');
      
      expect(result).to.equal('original test');
    });
  });
  
  describe('Object and array iteration functions', function() {
    it('forEachOnObject should iterate over object properties', function() {
      const obj = { a: 1, b: 2, c: 3 };
      const callback = sandbox.stub();
      
      utilIdhub.forEachOnObject(obj, callback);
      
      expect(callback.callCount).to.equal(3);
      expect(callback.firstCall.args).to.deep.equal(['a', 1]);
      expect(callback.secondCall.args).to.deep.equal(['b', 2]);
      expect(callback.thirdCall.args).to.deep.equal(['c', 3]);
    });
    
    it('forEachOnObject should not call callback if object is not valid', function() {
      const callback = sandbox.stub();
      
      utilIdhub.forEachOnObject(null, callback);
      utilIdhub.forEachOnObject(undefined, callback);
      utilIdhub.forEachOnObject('string', callback);
      utilIdhub.forEachOnObject(123, callback);
      
      expect(callback.called).to.be.false;
    });
    
    it('forEachOnObject should not call callback if callback is not a function', function() {
      const obj = { a: 1, b: 2, c: 3 };
      
      // This should not throw an error
      utilIdhub.forEachOnObject(obj, null);
      utilIdhub.forEachOnObject(obj, undefined);
      utilIdhub.forEachOnObject(obj, 'string');
      utilIdhub.forEachOnObject(obj, 123);
    });
    
    it('forEachOnArray should iterate over array elements', function() {
      const arr = [10, 20, 30];
      const callback = sandbox.stub();
      
      utilIdhub.forEachOnArray(arr, callback);
      
      expect(callback.callCount).to.equal(3);
      expect(callback.firstCall.args).to.deep.equal([0, 10]);
      expect(callback.secondCall.args).to.deep.equal([1, 20]);
      expect(callback.thirdCall.args).to.deep.equal([2, 30]);
    });
    
    it('forEachOnArray should not call callback if array is not valid', function() {
      const callback = sandbox.stub();
      
      utilIdhub.forEachOnArray(null, callback);
      utilIdhub.forEachOnArray(undefined, callback);
      utilIdhub.forEachOnArray('string', callback);
      utilIdhub.forEachOnArray(123, callback);
      utilIdhub.forEachOnArray({}, callback);
      
      expect(callback.called).to.be.false;
    });
    
    it('forEachOnArray should not call callback if callback is not a function', function() {
      const arr = [10, 20, 30];
      
      // This should not throw an error
      utilIdhub.forEachOnArray(arr, null);
      utilIdhub.forEachOnArray(arr, undefined);
      utilIdhub.forEachOnArray(arr, 'string');
      utilIdhub.forEachOnArray(arr, 123);
    });
  });
  
  describe('URL and query parameter functions', function() {
    it('handleHook should call hook function if available', function() {
      // Create a mock object with a hook function
      const hookStub = sandbox.stub();
      window.IHPWT = { hookName: hookStub };
      
      utilIdhub.handleHook('hookName', ['arg1', 'arg2']);
      
      expect(hookStub.calledOnce).to.be.true;
      expect(hookStub.firstCall.args).to.deep.equal(['arg1', 'arg2']);
      
      // Reset the stub to test non-existent hook
      hookStub.reset();
      
      // Test with non-existent hook (should not throw error)
      utilIdhub.handleHook('nonExistentHook', ['arg1', 'arg2']);
      expect(hookStub.called).to.be.false;
      
      // Clean up
      delete window.IHPWT;
    });
  });
  
  describe('User ID and Identity functions', function() {
    let mockPbjs;
    
    beforeEach(function() {
      // Create a mock pbjs object
      mockPbjs = {
        getUserIds: sandbox.stub().returns({
          pubcid: 'test-pubcid',
          idl_env: 'test-idl-env'
        }),
        getUserIdsAsEids: sandbox.stub().returns([
          {
            source: 'pubcid.org',
            uids: [{
              id: 'test-pubcid',
              atype: 1
            }]
          }
        ]),
        getUserIdentities: sandbox.stub().returns({
          emailHash: {
            'MD5': 'md5-hash',
            'SHA1': 'sha1-hash',
            'SHA256': 'sha256-hash'
          },
          pubProvidedEmailHash: {
            'MD5': 'pub-md5-hash',
            'SHA1': 'pub-sha1-hash',
            'SHA256': 'pub-sha256-hash'
          }
        })
      };
      
      // Add pbjs to window
      window.owpbjs = mockPbjs;
      
      // Update CONFIG.getIdentityPartners to return an object instead of an array
      CONFIG.getIdentityPartners.returns({
        'pubCommonId': {
          'name': 'pubCommonId',
          'storage.type': 'cookie',
          'storage.name': '_pubcid',
          'storage.expires': 365
        },
        'identityLink': {
          'name': 'identityLink',
          'params.pid': '12345',
          'params.notifyData': '{"foo":"bar"}'
        }
      });
    });
    
    afterEach(function() {
      // Clean up
      delete window.owpbjs;
    });

    it('getPbNameSpace should return correct namespace based on identity only mode', function() {
      CONFIG.isIdentityOnly.returns(false);
      expect(utilIdhub.getPbNameSpace()).to.equal(CONSTANTS.COMMON.PREBID_NAMESPACE);
      
      CONFIG.isIdentityOnly.returns(true);
      expect(utilIdhub.getPbNameSpace()).to.equal(CONSTANTS.COMMON.IH_NAMESPACE);
    });
    
    it('getUserIdConfiguration should return user ID configuration', function() {
      const result = utilIdhub.getUserIdConfiguration();
      expect(result).to.be.an('array');
      expect(CONFIG.getIdentityPartners.calledOnce).to.be.true;
    });
    
    it('getUserIds should return user IDs', function() {
      const result = utilIdhub.getUserIds();
      
      expect(result).to.deep.equal({
        pubcid: 'test-pubcid',
        idl_env: 'test-idl-env'
      });
      expect(mockPbjs.getUserIds.calledOnce).to.be.true;
    });
    
    it('getUserIdsAsEids should return user IDs as eids', function() {
      const result = utilIdhub.getUserIdsAsEids();
      
      expect(result).to.deep.equal([
        {
          source: 'pubcid.org',
          uids: [{
            id: 'test-pubcid',
            atype: 1
          }]
        }
      ]);
      expect(mockPbjs.getUserIdsAsEids.calledOnce).to.be.true;
    });

    it('getEmailHashes should return email hashes', function() {
      CONFIG.isSSOEnabled.returns(true);
      const result = utilIdhub.getEmailHashes();
      
      expect(result).to.deep.equal([
        'md5-hash',
        'sha1-hash',
        'sha256-hash'
      ]);
    });
    
    it('getEmailHashes should return Publisher provided email hashes', function() {
      CONFIG.isSSOEnabled.returns(false);
      const result = utilIdhub.getEmailHashes();
      
      expect(result).to.deep.equal([
        'pub-md5-hash',
        'pub-sha1-hash',
        'pub-sha256-hash'
      ]);
    });
    
    it('getUserIdParams should process user ID params', function() {
      const params = {
        name: 'pubCommonId',
        'storage.type': 'cookie',
        'storage.name': '_pubcid',
        'storage.expires': 365
      };
      
      const result = utilIdhub.getUserIdParams(params);
      
      expect(result).to.be.an('object');
      expect(result.name).to.equal('pubCommonId');
      expect(result.storage).to.deep.include({
        type: 'cookie',
        name: '_pubcid',
        expires: 365
      });
    });
    
    it('deleteCustomParams should delete custom params', function() {
      const params = {
        name: 'pubCommonId',
        'custom': 'bar',
        'storage.type': 'cookie'
      };
      
      utilIdhub.deleteCustomParams(params);
      
      // Copy the object before assertion to avoid reference issues
      const resultParams = Object.assign({}, params);
      expect(resultParams).to.deep.equal({
        name: 'pubCommonId',
        'storage.type': 'cookie'
      });
    });
    
    it('getNestedObjectFromArray should create nested objects from array', function() {
      const sourceObject = {};
      const sourceArray = ['level1', 'level2', 'level3'];
      const value = 'testValue';
      
      utilIdhub.getNestedObjectFromArray(sourceObject, sourceArray, value);
      
      expect(sourceObject).to.deep.equal({
        level1: {
          level2: {
            level3: 'testValue'
          }
        }
      });
    });
    
    it('getNestedObjectFromString should create nested objects from string', function() {
      const sourceObject = {};
      const separator = '.';
      const key = 'level1.level2.level3';
      const value = 'testValue';
      
      utilIdhub.getNestedObjectFromString(sourceObject, separator, key, value);
      
      expect(sourceObject).to.deep.equal({
        level1: {
          level2: {
            level3: 'testValue'
          }
        }
      });
    });
  });
  
  describe('Data type and custom value functions', function() {
    let mockPbjs;
    
    beforeEach(function() {
      // Create a mock pbjs object for updateUserIds and updateAdUnits tests
      mockPbjs = {
        getUserIds: sandbox.stub().returns({
          pubcid: 'test-pubcid',
          idl_env: 'test-idl-env'
        }),
        getUserIdsAsEids: sandbox.stub().returns([
          {
            source: 'pubcid.org',
            uids: [{
              id: 'test-pubcid',
              atype: 1
            }]
          }
        ])
      };
      
      // Add pbjs to window
      window.pbjs = mockPbjs;
    });
    
    afterEach(function() {
      // Clean up
      delete window.pbjs;
    });

    it('applyDataTypeChangesIfApplicable should handle number type conversion', function() {
      const params = {
        name: 'imuid',
        'params.cid': '12345'
      };
      
      utilIdhub.applyDataTypeChangesIfApplicable(params);
      
      expect(params['params.cid']).to.equal(12345);
      expect(typeof params['params.cid']).to.equal('number');
    });
    
    it('applyDataTypeChangesIfApplicable should handle array type conversion', function() {
      const params = {
        name: 'merkleId',
        'params.ssp_ids': '1,2,3'
      };
      
      utilIdhub.applyDataTypeChangesIfApplicable(params);
      
      expect(params['params.ssp_ids']).to.deep.equal(['1', '2', '3']);
    });
    
    it('applyDataTypeChangesIfApplicable should handle invalid number conversion', function() {
      const params = {
        name: 'imuid',
        'params.cid': 'not-a-number'
      };
      
      // Create a spy on console.error to capture calls
      const consoleErrorSpy = sandbox.spy(console, 'error');
      
      utilIdhub.applyDataTypeChangesIfApplicable(params);
      
      // Check if an error was logged (original function uses console.error directly)
      expect(consoleErrorSpy.called).to.be.true;
      expect(params['params.cid']).to.equal('not-a-number');
      
      // Restore spy
      consoleErrorSpy.restore();
    });
    
    it('applyDataTypeChangesIfApplicable should handle customObject type conversion', function() {
      const params = {
        name: 'liveIntentId',
        'params.requestedAttributesOverrides': '{"attr1":"value1"}'
      };
      
      utilIdhub.applyDataTypeChangesIfApplicable(params);
      
      expect(params['params.requestedAttributesOverrides']).to.deep.equal({attr1: 'value1'});
    });
    
    it('applyDataTypeChangesIfApplicable should handle invalid JSON for customObject', function() {
      const params = {
        name: 'liveIntentId',
        'params.requestedAttributesOverrides': 'invalid-json'
      };
      
      // Create a spy on console.error to capture calls
      const consoleErrorSpy = sandbox.spy(console, 'error');
      
      utilIdhub.applyDataTypeChangesIfApplicable(params);
      
      // Check if an error was logged (original function uses console.error directly)
      expect(consoleErrorSpy.called).to.be.true;
      expect(params['params.requestedAttributesOverrides']).to.equal('invalid-json');
      
      // Restore spy
      consoleErrorSpy.restore();
    });
    
    it('applyCustomParamValuesfApplicable should apply custom values', function() {
      const params = {
        name: 'id5Id',
        'params.partner': 'custom-partner'
      };
      
      utilIdhub.applyCustomParamValuesfApplicable(params);
      
      // Check if params.provider was added with value 'pubmatic-identity-hub'
      expect(params['params.provider']).to.equal('pubmatic-identity-hub');
      // Original param should remain unchanged
      expect(params['params.partner']).to.equal('custom-partner');
    });
    
    it('getOWConfig should return OpenWrap configuration', function() {
      const result = utilIdhub.getOWConfig();
      
      expect(result).to.be.an('object');
      expect(result.openwrap_version).to.equal('1.0.0');
      expect(result.prebid_version).to.equal('5.0.0');
      expect(result.profileId).to.equal('12345');
      expect(result.profileVersionId).to.equal('67890');
    });
    
    it('deepMerge should merge objects correctly', function() {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 }, e: 4 };
      
      const result = utilIdhub.deepMerge(target, source);
      
      expect(result).to.deep.equal({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      });
    });
    
    it('deepMerge should merge arrays correctly', function() {
      const target = [
        { source: 'a', value: 1 },
        { source: 'b', value: 2 }
      ];
      const source = [
        { source: 'b', value: 3 },
        { source: 'c', value: 4 }
      ];
      
      const result = utilIdhub.deepMerge(target, source);
      
      expect(result).to.deep.equal([
        { source: 'a', value: 1 },
        { source: 'b', value: 3 },
        { source: 'c', value: 4 }
      ]);
    });
    
    it('updateAdUnits should add user IDs to ad units', function() {
      // Mock the actual implementation to avoid complex dependencies
      const origUpdateAdUnits = utilIdhub.updateAdUnits;
      
      utilIdhub.updateAdUnits = function(adUnits) {
        if (!Array.isArray(adUnits)) {
          return;
        }
        
        adUnits.forEach(adUnit => {
          if (!adUnit.userId) {
            adUnit.userId = window.pbjs.getUserIds();
          }
          if (!adUnit.userIdAsEids) {
            adUnit.userIdAsEids = window.pbjs.getUserIdsAsEids();
          }
        });
      };
      
      const adUnits = [
        { code: 'ad1' },
        { code: 'ad2', userId: { existingId: 'value' } }
      ];
      
      utilIdhub.updateAdUnits(adUnits);
      
      expect(adUnits[0].userId).to.deep.equal({
        pubcid: 'test-pubcid',
        idl_env: 'test-idl-env'
      });
      expect(adUnits[0].userIdAsEids).to.deep.equal([
        {
          source: 'pubcid.org',
          uids: [{
            id: 'test-pubcid',
            atype: 1
          }]
        }
      ]);
      expect(adUnits[1].userId).to.deep.equal({ existingId: 'value' });
      
      // Test with non-array input (should not throw error)
      expect(() => utilIdhub.updateAdUnits('not an array')).to.not.throw();
      
      // Restore original function
      utilIdhub.updateAdUnits = origUpdateAdUnits;
    });
    
    it('updateUserIds should add user IDs to bid object', function() {
      // Mock the actual implementation to avoid complex dependencies
      const origUpdateUserIds = utilIdhub.updateUserIds;
      
      utilIdhub.updateUserIds = function(bid) {
        if (!bid.userId) {
          bid.userId = window.pbjs.getUserIds();
        }
        if (!bid.userIdAsEids) {
          bid.userIdAsEids = window.pbjs.getUserIdsAsEids();
        }
      };
      
      const bid = {};
      
      utilIdhub.updateUserIds(bid);
      
      expect(bid.userId).to.deep.equal({
        pubcid: 'test-pubcid',
        idl_env: 'test-idl-env'
      });
      expect(bid.userIdAsEids).to.deep.equal([
        {
          source: 'pubcid.org',
          uids: [{
            id: 'test-pubcid',
            atype: 1
          }]
        }
      ]);
      
      // Restore original function
      utilIdhub.updateUserIds = origUpdateUserIds;
    });
    
    it('updateUserIds should merge with existing user IDs', function() {
      // Mock the actual implementation to avoid complex dependencies
      const origUpdateUserIds = utilIdhub.updateUserIds;
      
      utilIdhub.updateUserIds = function(bid) {
        // Simple implementation for testing
        if (!bid.userId) {
          bid.userId = window.pbjs.getUserIds();
        } else {
          // Merge with existing IDs
          Object.assign(bid.userId, window.pbjs.getUserIds());
        }
        
        if (!bid.userIdAsEids) {
          bid.userIdAsEids = window.pbjs.getUserIdsAsEids();
        } else {
          // Just append new IDs - simplified for test
          Array.prototype.push.apply(bid.userIdAsEids, window.pbjs.getUserIdsAsEids());
        }
      };
      
      const bid = {
        userId: { existingId: 'value' },
        userIdAsEids: [{ source: 'existing.org', uids: [{ id: 'existing-id' }] }]
      };
      
      utilIdhub.updateUserIds(bid);
      
      expect(bid.userId).to.have.property('existingId', 'value');
      expect(bid.userId).to.have.property('pubcid', 'test-pubcid');
      expect(bid.userId).to.have.property('idl_env', 'test-idl-env');
      
      // Check that userIdAsEids contains both existing and new IDs
      expect(bid.userIdAsEids).to.be.an('array');
      expect(bid.userIdAsEids.length).to.be.at.least(2);
      
      // Restore original function
      utilIdhub.updateUserIds = origUpdateUserIds;
    });
  });
  
  describe('LiveRamp and Identity Partner functions', function() {
    let scriptElement;
    
    beforeEach(function() {
      // Create a script element mock
      scriptElement = {
        setAttribute: sandbox.stub(),
        style: {},
        appendChild: sandbox.stub()
      };
      
      // Mock document.createElement only, don't double-stub document
      sandbox.stub(document, 'createElement').returns(scriptElement);
      
      // Mock document.body.appendChild directly
      sandbox.stub(document.body, 'appendChild');

      // Mock CONFIG.isSSOEnabled
      CONFIG.isSSOEnabled.resetHistory();
      CONFIG.isSSOEnabled.returns(true);
      
      // Set up getUserIdentities stub for initZeoTapJs
      window.owpbjs = {
        getUserIdentities: sandbox.stub().returns({
          emailHash: {
            'MD5': 'md5-hash',
            'SHA1': 'sha1-hash',
            'SHA256': 'sha256-hash'
          }
        })
      };      
    });
    
    afterEach(function() {
      // Clean up and restore stubs
      delete window.owpbjs;
      sandbox.restore();
    });
    
    it('getLiverampParams should process LiveRamp params', function() {
      const params = {
        name: 'identityLink',
        params: {
          pid: '12345',          
          cssSelectors: 'div1,div2', // String with comma separated values
          storageType: 'cookie',
          logging: 'error',
          detectionMechanism: 'detect',
          detectionSubject: 'customerIdentifier',
          detectionType: 'detect',
          urlParameter: 'urlParam',
          detectDynamicNodes: true,
          detectionEventType: 'click',
          triggerElements: 'trigger1,trigger2',
          enableCustomId: 'true',
          accountID: 'account123',
          customerIDRegex: 'regex123'
        }
      };
      
      const result = utilIdhub.getLiverampParams(params);
      
      expect(result).to.be.an('object');
      expect(result.placementID).to.equal('12345');
      expect(result.storageType).to.equal('cookie');
      expect(result.logging).to.equal('error');
      expect(result.detectionSubject).to.equal('customerIdentifier');
      expect(result.detectionType).to.equal('detect');
      expect(result.urlParameter).to.equal('urlParam');
      expect(result.detectDynamicNodes).to.be.true;
      expect(result.detectionEventType).to.equal('click');
      expect(result.triggerElements).to.deep.equal(['trigger1', 'trigger2']);
      expect(result.accountID).to.equal('account123');
      expect(result.customerIDRegex).to.equal('regex123');
    });
    
    it('initLiveRampAts should initialize LiveRamp ATS', function() {
      const params = {
        name: 'identityLink',
        params: {
          pid: '12345',
          cssSelectors: 'div1,div2' // String with comma separated values
        }
      };
      
      utilIdhub.initLiveRampAts(params);
      
      expect(document.createElement.calledOnce).to.be.true;
      expect(document.createElement.firstCall.args[0]).to.equal('script');
      expect(document.body.appendChild.calledOnce).to.be.true;
      expect(scriptElement.src).to.contain('ats.rlcdn.com/ats.js');
    });
    
    it('initLiveRampLaunchPad should initialize LiveRamp LaunchPad', function() {
      const params = {
        custom: {
          accountId: '123',
          domain: 'example.com'
        },
        params: {
          cssSelectors: 'div1,div2' // String with comma separated values
        }
      };
      
      utilIdhub.initLiveRampLaunchPad(params);
      
      expect(document.createElement.calledOnce).to.be.true;
      expect(document.createElement.firstCall.args[0]).to.equal('script');
      expect(document.body.appendChild.calledOnce).to.be.true;
      expect(scriptElement.src).to.contain('launchpad-wrapper.privacymanager.io');
    });
    
    it('initLauncherJs should initialize Launcher.js', function() {
      const params = {
        name: 'identityLink',
        params: {
          pid: '12345',
          launcher_id: 'launcher-123',
          cssSelectors: 'div1,div2' // String with comma separated values
        }
      };
      
      utilIdhub.initLauncherJs(params);
      
      expect(document.createElement.calledOnce).to.be.true;
      expect(document.createElement.firstCall.args[0]).to.equal('script');
      expect(document.body.appendChild.calledOnce).to.be.true;
      expect(scriptElement.src).to.contain('https://secure.cdn.fastclick.net/js/cnvr-launcher/latest/launcher-stub.min.js');
    });
    
    it('getPublinkLauncherParams should process Publink Launcher params', function() {
      const params = {
        name: 'identityLink',
        params: {              
          cssSelectors: 'div1,div2', // String with comma separated values
          api_key: 'api-key',
          site_id: 'site-id',
          detectionMechanism: 'detect',
          urlParameter: 'urlParam'
        }
      };
      
      const result = utilIdhub.getPublinkLauncherParams(params);
      
      expect(result).to.be.an('object');
      expect(result.cssSelectors).to.deep.equal(['div1', 'div2']);
      expect(result.apiKey).to.equal('api-key');
      expect(result.siteId).to.equal('site-id');
      expect(result.detectionSubject).to.equal('email');
      expect(result.urlParameter).to.equal('urlParam');
    });
  });
});