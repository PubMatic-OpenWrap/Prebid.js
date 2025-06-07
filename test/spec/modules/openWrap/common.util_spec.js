import * as UTIL from '../../../../modules/openWrap/common.util.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as conf from '../../../../modules/openWrap/conf.js';

describe('OpenWrap Core Module: common.util.js', () => {
  describe('#getGeoInfo', () => {
    let pbNameSpace;

    beforeEach((done) => {
      // Mock the namespace based on identity only flag
      pbNameSpace = 'owpbjs'; // or "ihowpbjs" based on identity flag
      window[pbNameSpace] = {
        getDataFromLocalStorage: () => { },
        detectLocation: () => { },
        setAndStringifyToLocalStorage: () => { }
      };
      done();
    });

    afterEach((done) => {
      window[pbNameSpace] = undefined;
      done();
    });

    it('should fetch geo data from localStorage if valid data exists', (done) => {
      const mockGeoData = {
        cc: 'US'
      };
      const getDataStub = sinon.stub(window[pbNameSpace], 'getDataFromLocalStorage').returns(JSON.stringify(mockGeoData));

      UTIL.getGeoInfo({ LOCALSTORAGE: 'localStorage' }, (source) => {
        expect(window.PWT.CC).to.deep.equal(mockGeoData);
        expect(source).to.equal('localStorage');
        getDataStub.restore();
        done();
      });
    });

    it('should fetch geo data from API if localStorage data is invalid', (done) => {
      const getDataStub = sinon.stub(window[pbNameSpace], 'getDataFromLocalStorage').returns(null);
      const detectLocationStub = sinon.stub(window[pbNameSpace], 'detectLocation').callsFake((url, callback) => {
        /* eslint-disable standard/no-callback-literal */
        callback({ cc: 'US' }, true);
      });

      UTIL.getGeoInfo({
        LOCALSTORAGE: 'localStorage',
        GEO_SERVICE: 'geoService'
      }, (source, loc) => {
        expect(window.PWT.CC).to.deep.equal({ cc: 'US' });
        expect(source).to.equal('geoService');
        expect(loc).to.deep.equal({ cc: 'US' });

        getDataStub.restore();
        detectLocationStub.restore();
        done();
      });
    });
  });

  describe('#shouldThrottle', () => {
    let randomStub, floorStub;

    beforeEach((done) => {
      randomStub = sinon.stub(Math, 'random');
      floorStub = sinon.stub(Math, 'floor');
      done();
    });

    afterEach((done) => {
      randomStub.restore();
      floorStub.restore();
      done();
    });

    it('is a function', (done) => {
      expect(UTIL.shouldThrottle).to.be.a('function');
      done();
    });

    it('should return true when random value is greater than throttle rate', (done) => {
      randomStub.returns(0.9);
      floorStub.returns(90);
      expect(UTIL.shouldThrottle(80)).to.be.true;
      done();
    });

    it('should return false when random value is less than throttle rate', (done) => {
      randomStub.returns(0.5);
      floorStub.returns(50);
      expect(UTIL.shouldThrottle(80)).to.be.false;
      done();
    });

    it('should use default maxRandomValue when not provided', (done) => {
      randomStub.returns(0.5);
      floorStub.returns(50);
      UTIL.shouldThrottle(30);
      expect(randomStub.calledOnce).to.be.true;
      expect(floorStub.calledWith(50)).to.be.true;
      done();
    });

    it('should use provided maxRandomValue', (done) => {
      randomStub.returns(0.5);
      floorStub.returns(25);
      UTIL.shouldThrottle(30, 50);
      expect(randomStub.calledOnce).to.be.true;
      expect(floorStub.calledWith(25)).to.be.true;
      done();
    });
  });

  describe('#isA', () => {
    it('is a function', () => {
      expect(UTIL.isA).to.be.a('function');
    });

    it('should return true for correct object type', () => {
      expect(UTIL.isA([], 'Array')).to.be.true;
      expect(UTIL.isA({}, 'Object')).to.be.true;
      expect(UTIL.isA('string', 'String')).to.be.true;
      expect(UTIL.isA(42, 'Number')).to.be.true;
      expect(UTIL.isA(true, 'Boolean')).to.be.true;
      expect(UTIL.isA(() => {}, 'Function')).to.be.true;
      expect(UTIL.isA(new Date(), 'Date')).to.be.true;
    });

    it('should return false for incorrect object type', () => {
      expect(UTIL.isA([], 'Object')).to.be.false;
      expect(UTIL.isA({}, 'Array')).to.be.false;
      expect(UTIL.isA('string', 'Number')).to.be.false;
      expect(UTIL.isA(42, 'String')).to.be.false;
    });
  });

  describe('#isFunction', () => {
    it('is a function', () => {
      expect(UTIL.isFunction).to.be.a('function');
    });

    it('should return true for functions', () => {
      expect(UTIL.isFunction(() => {})).to.be.true;
      expect(UTIL.isFunction(function() {})).to.be.true;
      expect(UTIL.isFunction(UTIL.isFunction)).to.be.true;
    });

    it('should return false for non-functions', () => {
      expect(UTIL.isFunction({})).to.be.false;
      expect(UTIL.isFunction([])).to.be.false;
      expect(UTIL.isFunction('string')).to.be.false;
      expect(UTIL.isFunction(42)).to.be.false;
      expect(UTIL.isFunction(null)).to.be.false;
      expect(UTIL.isFunction(undefined)).to.be.false;
    });
  });

  describe('#isNumber', () => {
    it('is a function', () => {
      expect(UTIL.isNumber).to.be.a('function');
    });

    it('should return true for numbers', () => {
      expect(UTIL.isNumber(42)).to.be.true;
      expect(UTIL.isNumber(0)).to.be.true;
      expect(UTIL.isNumber(-1)).to.be.true;
      expect(UTIL.isNumber(3.14)).to.be.true;
      expect(UTIL.isNumber(Number.MAX_VALUE)).to.be.true;
    });

    it('should return false for non-numbers', () => {
      expect(UTIL.isNumber('42')).to.be.false;
      expect(UTIL.isNumber({})).to.be.false;
      expect(UTIL.isNumber([])).to.be.false;
      expect(UTIL.isNumber(null)).to.be.false;
      expect(UTIL.isNumber(undefined)).to.be.false;
    });
  });

  describe('#isObject', () => {
    it('is a function', () => {
      expect(UTIL.isObject).to.be.a('function');
    });

    it('should return true for objects', () => {
      expect(UTIL.isObject({})).to.be.true;
      expect(UTIL.isObject([])).to.be.true;
      expect(UTIL.isObject(new Date())).to.be.true;
    });

    it('should return false for non-objects', () => {
      expect(UTIL.isObject(null)).to.be.false;
      expect(UTIL.isObject(undefined)).to.be.false;
      expect(UTIL.isObject('string')).to.be.false;
      expect(UTIL.isObject(42)).to.be.false;
      expect(UTIL.isObject(true)).to.be.false;
      expect(UTIL.isObject(() => {})).to.be.false;
    });
  });

  describe('#isEmptyObject', () => {
    it('is a function', () => {
      expect(UTIL.isEmptyObject).to.be.a('function');
    });

    it('should return true for empty objects', () => {
      expect(UTIL.isEmptyObject({})).to.be.true;
    });

    it('should return false for non-empty objects', () => {
      expect(UTIL.isEmptyObject({ key: 'value' })).to.be.false;
      expect(UTIL.isEmptyObject([1, 2, 3])).to.be.false;
    });

    it('should return false for non-objects', () => {
      expect(UTIL.isEmptyObject(null)).to.be.false;
      expect(UTIL.isEmptyObject(undefined)).to.be.false;
      expect(UTIL.isEmptyObject('string')).to.be.false;
      expect(UTIL.isEmptyObject(42)).to.be.false;
    });
  });

  describe('#getGlobalPbObject', () => {
    beforeEach(() => {
      if (!window.PWT) {
        window.PWT = {};
      }
      sinon.stub(CONSTANTS, 'CONFIG').value({
        'COMMON': 'pwt',
        'PB_GLOBAL_VAR_NAMESPACE': 'pb_namespace'
      });
      sinon.stub(CONSTANTS, 'COMMON').value({
        'IDENTITY_ONLY': 'identity_only',
        'IH_NAMESPACE': 'ihowpbjs',
        'PREBID_NAMESPACE': 'owpbjs'
      });
    });

    afterEach(() => {
      delete window.owpbjs;
      delete window.ihowpbjs;
      delete window.customPbjs;      
    });

    it('is a function', () => {
      expect(UTIL.getGlobalPbObject).to.be.a('function');
    });

    it('should return default Prebid object when no custom namespace is set', () => {
      const result = UTIL.getGlobalPbObject();
      expect(result).to.equal(window.owpbjs);
      expect(window.owpbjs).to.be.an('object');
    });

    it('should return identity hub namespace when identity_only is set to 1', () => {
      conf.pwt.identity_only = '1';
      const result = UTIL.getGlobalPbObject();
      expect(result).to.equal(window.ihowpbjs);
      expect(window.ihowpbjs).to.be.an('object');
    });

    it('should return custom namespace when set in config', () => {
      conf.pwt.pb_namespace = 'customPbjs';
      const result = UTIL.getGlobalPbObject();
      expect(result).to.equal(window.customPbjs);
      expect(window.customPbjs).to.be.an('object');
    });
  });

  describe('#getGlobalOwObject', () => {
    beforeEach(() => {
      sinon.stub(CONSTANTS, 'CONFIG').value({
        'COMMON': 'pwt',
        'OW_GLOBAL_VAR_NAMESPACE': 'ow_namespace'
      });
      sinon.stub(CONSTANTS, 'COMMON').value({
        'IDENTITY_ONLY': 'identity_only',
        'IH_OW_NAMESPACE': 'IHPWT',
        'OPENWRAP_NAMESPACE': 'PWT'
      });
    });

    afterEach(() => {
      delete window.PWT;
      delete window.IHPWT;
      delete window.customOw;
    });

    it('is a function', () => {
      expect(UTIL.getGlobalOwObject).to.be.a('function');
    });

    it('should return identity hub namespace when identity_only is set to 1', () => {
      conf.pwt.identity_only = '1';
      const result = UTIL.getGlobalOwObject();
      expect(result).to.equal(window.IHPWT);
      expect(window.IHPWT).to.be.an('object');
    });

    it('should return custom namespace when set in config', () => {
      conf.pwt.ow_namespace = 'customOw';
      const result = UTIL.getGlobalOwObject();
      expect(result).to.equal(window.customOw);
      expect(window.customOw).to.be.an('object');
    });
  });

  describe('#getKeyByValue', () => {
    it('is a function', () => {
      expect(UTIL.getKeyByValue).to.be.a('function');
    });

    it('should return key for a given value in an object', () => {
      const obj = { key1: 'value1', key2: 'value2', key3: 'value3' };
      expect(UTIL.getKeyByValue(obj, 'value2')).to.equal('key2');
    });

    it('should return first key when multiple keys have the same value', () => {
      const obj = { key1: 'value', key2: 'value', key3: 'different' };
      const result = UTIL.getKeyByValue(obj, 'value');
      expect(result === 'key1' || result === 'key2').to.be.true;
    });

    it('should return null when value is not found', () => {
      const obj = { key1: 'value1', key2: 'value2' };
      expect(UTIL.getKeyByValue(obj, 'nonexistent')).to.be.null;
    });

    it('should handle empty objects', () => {
      expect(UTIL.getKeyByValue({}, 'value')).to.be.null;
    });

    it('should handle non-string values', () => {
      const obj = { key1: 1, key2: true, key3: null, key4: undefined, key5: { nested: 'object' } };
      expect(UTIL.getKeyByValue(obj, 1)).to.equal('key1');
      expect(UTIL.getKeyByValue(obj, true)).to.equal('key2');
      expect(UTIL.getKeyByValue(obj, null)).to.equal('key3');
      expect(UTIL.getKeyByValue(obj, undefined)).to.equal('key4');
      expect(UTIL.getKeyByValue(obj, obj.key5)).to.equal('key5');
    });
  });
});
