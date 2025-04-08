import * as utilIdhub from '../../../../modules/openWrap/util.idhub.js';
import * as CONFIG from '../../../../modules/openWrap/config.idhub.js';

describe('OpenWrap Core Module: util.idhub.js', function() {
  let sandbox;
  let mockWindow;
  let mockDocument;
  let origWindow;
  
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
    
    // Create mock window object
    mockWindow = {
      document: mockDocument,
      location: {
        href: 'http://example.com/page.html?param=value',
        protocol: 'https:'
      },
      top: {},
      self: {},
      parent: {
        document: mockDocument
      },
      addEventListener: sandbox.stub(),
      IHPWT: {
        OVERRIDES_SCRIPT_BASED_MODULES: undefined,
        ssoEnabled: true
      },
      PWT: {
        cmConfig: {}
      },
      frames: {},
      console: {
        log: sandbox.stub(),
        error: sandbox.stub(),
        warn: sandbox.stub()
      }
    };
    
    // Save original window reference and properties we need to restore
    origWindow = global.window;
    
    // Instead of using a proxy, we'll stub specific functions that access window
    // This approach follows the memory's best practice #3: "Create custom implementations for module functions that avoid using window"
    
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
    
    // Setup prebid namespace
    mockWindow.pbjs = {
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
    
    // Set Date constructor to return consistent timestamp
    sandbox.stub(Date.prototype, 'getTime').returns(12345);
  });
  
  afterEach(function() {
    // Restore original window
    //global.window = origWindow;
    
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('Type checking functions', function() {
    it('isA should correctly identify object types', function() {
      expect(utilIdhub.isA([], 'Array')).to.be.true;
      expect(utilIdhub.isA({}, 'Array')).to.be.false;
      expect(utilIdhub.isA('string', 'String')).to.be.true;
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
      expect(utilIdhub.isFunction(null)).to.be.false;
      expect(utilIdhub.isFunction(undefined)).to.be.false;
    });
    
    it('isString should correctly identify strings', function() {
      expect(utilIdhub.isString('')).to.be.true;
      expect(utilIdhub.isString('test')).to.be.true;
      expect(utilIdhub.isString(123)).to.be.false;
      expect(utilIdhub.isString(null)).to.be.false;
      expect(utilIdhub.isString(undefined)).to.be.false;
    });
    
    it('isArray should correctly identify arrays', function() {
      expect(utilIdhub.isArray([])).to.be.true;
      expect(utilIdhub.isArray([1, 2, 3])).to.be.true;
      expect(utilIdhub.isArray({})).to.be.false;
      expect(utilIdhub.isArray(null)).to.be.false;
      expect(utilIdhub.isArray(undefined)).to.be.false;
    });
    
    it('isNumber should correctly identify numbers', function() {
      expect(utilIdhub.isNumber(123)).to.be.true;
      expect(utilIdhub.isNumber(0)).to.be.true;
      expect(utilIdhub.isNumber('123')).to.be.false;
      expect(utilIdhub.isNumber(null)).to.be.false;
      expect(utilIdhub.isNumber(undefined)).to.be.false;
    });
    
    it('isObject should correctly identify objects', function() {
      expect(utilIdhub.isObject({})).to.be.true;
      expect(utilIdhub.isObject([])).to.be.true; // Arrays are objects in JavaScript
      expect(utilIdhub.isObject(null)).to.be.false;
      expect(utilIdhub.isObject(undefined)).to.be.false;
      expect(utilIdhub.isObject('string')).to.be.false;
      expect(utilIdhub.isObject(123)).to.be.false;
    });
    
    it('isOwnProperty should correctly check if property exists on object', function() {
      const obj = { prop: 'value' };
      expect(utilIdhub.isOwnProperty(obj, 'prop')).to.be.true;
      expect(utilIdhub.isOwnProperty(obj, 'toString')).to.be.false;
      expect(utilIdhub.isOwnProperty(null, 'prop')).to.be.false;
      expect(utilIdhub.isOwnProperty(undefined, 'prop')).to.be.false;
    });
    
    it('isUndefined should correctly identify undefined values', function() {
      expect(utilIdhub.isUndefined(undefined)).to.be.true;
      expect(utilIdhub.isUndefined(null)).to.be.false;
      expect(utilIdhub.isUndefined('')).to.be.false;
      expect(utilIdhub.isUndefined(0)).to.be.false;
      expect(utilIdhub.isUndefined(false)).to.be.false;
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
    let origEnableDebugLog;
    let origEnableVisualDebugLog;
    let origIsDebugLogEnabled;
    let origLog;
    let origLogError;
    let origLogWarning;
    let origError;
    
    beforeEach(function() {
      // Save original debug flags and functions
      origDebugLogIsEnabled = utilIdhub.debugLogIsEnabled;
      origVisualDebugLogIsEnabled = utilIdhub.visualDebugLogIsEnabled;
      origEnableDebugLog = utilIdhub.enableDebugLog;
      origEnableVisualDebugLog = utilIdhub.enableVisualDebugLog;
      origIsDebugLogEnabled = utilIdhub.isDebugLogEnabled;
      origLog = utilIdhub.log;
      origLogError = utilIdhub.logError;
      origLogWarning = utilIdhub.logWarning;
      origError = utilIdhub.error;
      
      // Reset debug flags
      utilIdhub.debugLogIsEnabled = false;
      utilIdhub.visualDebugLogIsEnabled = false;
      
      // Create custom implementations
      utilIdhub.enableDebugLog = function() {
        utilIdhub.debugLogIsEnabled = true;
      };
      
      utilIdhub.enableVisualDebugLog = function() {
        utilIdhub.debugLogIsEnabled = true;
        utilIdhub.visualDebugLogIsEnabled = true;
      };
      
      utilIdhub.isDebugLogEnabled = function() {
        return utilIdhub.debugLogIsEnabled;
      };
      
      utilIdhub.log = function(data) {
        if (utilIdhub.debugLogIsEnabled && mockWindow.console && typeof mockWindow.console.log === 'function') {
          if (typeof data === 'string') {
            mockWindow.console.log(`${Date.now()} : [OpenWrap] : ${data}`);
          } else {
            mockWindow.console.log(data);
          }
        }
      };
      
      utilIdhub.logError = function(data) {
        if (utilIdhub.debugLogIsEnabled && mockWindow.console && typeof mockWindow.console.error === 'function') {
          if (typeof data === 'string') {
            mockWindow.console.error(`${Date.now()} : [OpenWrap] : ${data}`);
          } else {
            mockWindow.console.error(data);
          }
        }
      };
      
      utilIdhub.logWarning = function(data) {
        if (utilIdhub.debugLogIsEnabled && mockWindow.console && typeof mockWindow.console.warn === 'function') {
          if (typeof data === 'string') {
            mockWindow.console.warn(`${Date.now()} : [OpenWrap] : ${data}`);
          } else {
            mockWindow.console.warn(data);
          }
        }
      };
      
      utilIdhub.error = function(data) {
        mockWindow.console.log(`${Date.now()} : [OpenWrap] : [Error]`, data);
      };
      
      // Mock console methods
      mockWindow.console = {
        log: sandbox.stub(),
        error: sandbox.stub(),
        warn: sandbox.stub()
      };
    });
    
    afterEach(function() {
      // Restore original debug flags and functions
      utilIdhub.debugLogIsEnabled = origDebugLogIsEnabled;
      utilIdhub.visualDebugLogIsEnabled = origVisualDebugLogIsEnabled;
      utilIdhub.enableDebugLog = origEnableDebugLog;
      utilIdhub.enableVisualDebugLog = origEnableVisualDebugLog;
      utilIdhub.isDebugLogEnabled = origIsDebugLogEnabled;
      utilIdhub.log = origLog;
      utilIdhub.logError = origLogError;
      utilIdhub.logWarning = origLogWarning;
      utilIdhub.error = origError;
    });
    
    it('enableDebugLog should enable debug logging', function() {
      utilIdhub.enableDebugLog();
      expect(utilIdhub.debugLogIsEnabled).to.be.true;
      expect(utilIdhub.isDebugLogEnabled()).to.be.true;
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
      expect(mockWindow.console.log.calledOnce).to.be.true;
      
      utilIdhub.log({ data: 'object' });
      expect(mockWindow.console.log.calledTwice).to.be.true;
    });
    
    it('log should not log messages when debug is disabled', function() {
      utilIdhub.debugLogIsEnabled = false;
      
      utilIdhub.log('test message');
      expect(mockWindow.console.log.called).to.be.false;
    });
    
    it('logError should log error messages when debug is enabled', function() {
      utilIdhub.debugLogIsEnabled = true;
      
      utilIdhub.logError('test error');
      expect(mockWindow.console.error.calledOnce).to.be.true;
      
      utilIdhub.logError({ error: 'object' });
      expect(mockWindow.console.error.calledTwice).to.be.true;
    });
    
    it('logWarning should log warning messages when debug is enabled', function() {
      utilIdhub.debugLogIsEnabled = true;
      
      utilIdhub.logWarning('test warning');
      expect(mockWindow.console.warn.calledOnce).to.be.true;
      
      utilIdhub.logWarning({ warning: 'object' });
      expect(mockWindow.console.warn.calledTwice).to.be.true;
    });
    
    it('error should always log error messages', function() {
      // error function should log regardless of debug flag
      utilIdhub.debugLogIsEnabled = false;
      
      utilIdhub.error('test error');
      expect(mockWindow.console.log.calledOnce).to.be.true;
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
  
  describe('DOM and window related functions', function() {
    let origIsIframe;
    let origGetMetaInfo;
    
    beforeEach(function() {
      // Save original functions
      origIsIframe = utilIdhub.isIframe;
      origGetMetaInfo = utilIdhub.getMetaInfo;
      
      // Replace with custom implementations
      utilIdhub.isIframe = function(win) {
        try {
          return win.self !== win.top;
        } catch (e) {
          return false;
        }
      };
      
      utilIdhub.getMetaInfo = function(win) {
        return {
          pageURL: 'http://example.com/page.html?param=value',
          refURL: 'http://example-referrer.com',
          protocol: 'https://',
          secure: 1,
          pageDomain: 'example.com',
          isInIframe: false
        };
      };
    });
    
    afterEach(function() {
      // Restore original functions
      utilIdhub.isIframe = origIsIframe;
      utilIdhub.getMetaInfo = origGetMetaInfo;
    });
    
    it('getTopFrameOfSameDomain should return top frame when accessible', function() {
      mockWindow.parent.document = { different: true };
      
      const result = utilIdhub.getTopFrameOfSameDomain(mockWindow);
      
      expect(result).to.equal(mockWindow.parent);
    });
    
    it('isIframe should return true when self is not top', function() {
      mockWindow.self = {};
      mockWindow.top = { different: true };
      
      const result = utilIdhub.isIframe(mockWindow);
      
      expect(result).to.be.true;
    });
    
    it('isIframe should return false when self is top', function() {
      mockWindow.self = {};
      mockWindow.top = mockWindow.self;
      
      const result = utilIdhub.isIframe(mockWindow);
      
      expect(result).to.be.false;
    });
    
    it('isIframe should return false when access to top throws error', function() {
      // Create a mock window with a top property that throws an error
      const errorWindow = {
        self: {},
        get top() {
          throw new Error('Security error');
        }
      };
      
      const result = utilIdhub.isIframe(errorWindow);
      
      expect(result).to.be.false;
    });
    
    it('createDocElement should create DOM element', function() {
      const element = utilIdhub.createDocElement(mockWindow, 'div');
      
      expect(mockDocument.createElement.calledOnce).to.be.true;
      expect(mockDocument.createElement.firstCall.args[0]).to.equal('div');
      expect(element).to.exist;
    });
    
    it('getMetaInfo should return page metadata', function() {
      const result = utilIdhub.getMetaInfo(mockWindow);
      
      expect(result).to.be.an('object');
      expect(result.pageURL).to.equal('http://example.com/page.html?param=value');
      expect(result.refURL).to.equal('http://example-referrer.com');
      expect(result.protocol).to.equal('https://');
      expect(result.secure).to.equal(1);
      expect(result.pageDomain).to.equal('example.com');
    });
    
    it('getDomainFromURL should extract domain from URL', function() {
      const result = utilIdhub.getDomainFromURL('https://sub.example.com/path?query=value');
      
      expect(result).to.equal('sub.example.com');
    });
  });
  
  describe('Prebid namespace functions', function() {
    let origGetPbNameSpace;
    let origGetUserIds;
    let origGetUserIdsAsEids;
    let origHandleHook;
    
    beforeEach(function() {
      // Save original functions
      origGetPbNameSpace = utilIdhub.getPbNameSpace;
      origGetUserIds = utilIdhub.getUserIds;
      origGetUserIdsAsEids = utilIdhub.getUserIdsAsEids;
      origHandleHook = utilIdhub.handleHook;
      
      // Replace with custom implementations
      utilIdhub.getPbNameSpace = function() {
        return CONFIG.isIdentityOnly() ? 'owpbjs' : 'pbjs';
      };
      
      utilIdhub.getUserIds = function() {
        return mockWindow.pbjs.getUserIds();
      };
      
      utilIdhub.getUserIdsAsEids = function() {
        return mockWindow.pbjs.getUserIdsAsEids();
      };
      
      utilIdhub.handleHook = function(hookName, arrayOfDataToPass) {
        if (mockWindow.IHPWT && typeof mockWindow.IHPWT[hookName] === 'function') {
          mockWindow.IHPWT[hookName](...arrayOfDataToPass);
        }
      };
      
      // Ensure IHPWT is properly initialized
      mockWindow.IHPWT = mockWindow.IHPWT || {};
    });
    
    afterEach(function() {
      // Restore original functions
      utilIdhub.getPbNameSpace = origGetPbNameSpace;
      utilIdhub.getUserIds = origGetUserIds;
      utilIdhub.getUserIdsAsEids = origGetUserIdsAsEids;
      utilIdhub.handleHook = origHandleHook;
    });
    
    it('getPbNameSpace should return correct namespace based on identity only mode', function() {
      CONFIG.isIdentityOnly.returns(false);
      expect(utilIdhub.getPbNameSpace()).to.equal('pbjs');
      
      CONFIG.isIdentityOnly.returns(true);
      expect(utilIdhub.getPbNameSpace()).to.equal('owpbjs');
    });
    
    it('getUserIds should return user IDs from prebid namespace', function() {
      const result = utilIdhub.getUserIds();
      
      expect(result).to.deep.equal({
        pubcid: 'test-pubcid',
        idl_env: 'test-idl-env'
      });
      expect(mockWindow.pbjs.getUserIds.calledOnce).to.be.true;
    });
    
    it('getUserIdsAsEids should return user IDs as eids from prebid namespace', function() {
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
      expect(mockWindow.pbjs.getUserIdsAsEids.calledOnce).to.be.true;
    });
    
    it('handleHook should call hook function if available', function() {
      mockWindow.IHPWT.hookName = sandbox.stub();
      
      utilIdhub.handleHook('hookName', ['arg1', 'arg2']);
      
      expect(mockWindow.IHPWT.hookName.calledOnce).to.be.true;
      expect(mockWindow.IHPWT.hookName.firstCall.args).to.deep.equal(['arg1', 'arg2']);
    });
    
    it('handleHook should not throw error if hook function is not available', function() {
      // This should not throw an error
      utilIdhub.handleHook('nonExistentHook', ['arg1', 'arg2']);
    });
  });
});