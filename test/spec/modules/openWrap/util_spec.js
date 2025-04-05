import * as util from '../../../../modules/openWrap/util.js';

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