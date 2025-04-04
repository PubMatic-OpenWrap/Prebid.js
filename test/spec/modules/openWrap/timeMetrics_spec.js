import * as timeMetrics from './../../../../modules/openWrap/modules/timeMetrics.js';
import * as commonUtil from './../../../../modules/openWrap/common.util.js';

describe('OpenWrap Module: timeMetrics.js', function () {
  let sandbox;
  let mockGlobalOwObject;
  let clock;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers({
      now: 1000,
      shouldAdvanceTime: true
    });

    mockGlobalOwObject = {
      getMetrics: null,
      getDurationOf: null,
      recordEntryTime: null,
      recordExitTime: null
    };
    sandbox.stub(commonUtil, 'getGlobalOwObject').returns(mockGlobalOwObject);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getMetricsObject', function () {
    it('should return empty metrics object initially', function () {
      const metrics = timeMetrics.getMetricsObject();
      expect(metrics).to.deep.equal({});
    });
  });

  describe('recordEntryTime', function () {
    it('should record entry time for a single key', function () {
      timeMetrics.recordEntryTime('test1');
      const metrics = timeMetrics.getMetricsObject();
      
      expect(metrics.test1).to.deep.equal({
        st: 1000,
        et: null,
        tt: 0
      });
    });

    it('should record entry time for multiple keys', function () {
      timeMetrics.recordEntryTime(['test2', 'test3'], 100);
      const metrics = timeMetrics.getMetricsObject();
      
      expect(metrics.test2).to.deep.equal({
        st: 1000,
        et: null,
        tt: 100
      });
      expect(metrics.test3).to.deep.equal({
        st: 1000,
        et: null,
        tt: 100
      });
    });

    it('should not overwrite existing metrics', function () {
      timeMetrics.recordEntryTime('test4');
      clock.tick(1000);
      timeMetrics.recordEntryTime('test4');
      
      const metrics = timeMetrics.getMetricsObject();
      expect(metrics.test1.st).to.equal(1000); // Should keep original start time
    });
  });

  describe('recordExitTime', function () {
    beforeEach(function () {
      timeMetrics.recordEntryTime('test1');
      timeMetrics.recordEntryTime('test2');
      clock.tick(1000); // Advance time by 1 second
    });

    it('should record exit time and calculate duration for a single key', function () {
      timeMetrics.recordExitTime('test1');
      const metrics = timeMetrics.getMetricsObject();
      
      expect(metrics.test1).to.deep.equal({
        st: 1000,
        et: 2000,
        tt: 1000 // 2000 - 1000
      });
    });

    it('should record exit time and calculate duration for multiple keys', function () {
      timeMetrics.recordExitTime(['test1', 'test2']);
      const metrics = timeMetrics.getMetricsObject();
      
      expect(metrics.test1.tt).to.equal(1000);
      expect(metrics.test2.tt).to.equal(1000);
    });

    it('should use default total time when provided', function () {
      timeMetrics.recordExitTime('test1', 5000);
      const metrics = timeMetrics.getMetricsObject();
      
      expect(metrics.test1.tt).to.equal(5000);
    });

    it('should handle non-existent keys', function () {
      timeMetrics.recordExitTime('nonexistent');
      const metrics = timeMetrics.getMetricsObject();
      
      expect(metrics.nonexistent).to.be.undefined;
    });

  });

  describe('getDurationOf', function () {
    beforeEach(function () {
      timeMetrics.recordEntryTime('test1');
      clock.tick(1000);
      timeMetrics.recordExitTime('test1');
    });

    it('should return duration for existing key', function () {
      expect(timeMetrics.getDurationOf('test1')).to.equal(1000);
    });

    it('should return null for non-existent key', function () {
      expect(timeMetrics.getDurationOf('nonexistent')).to.be.null;
    });

  });

  describe('init', function () {
    it('should initialize without errors', function () {
      expect(() => timeMetrics.init()).to.not.throw();
    });
  });

  describe('Edge Cases', function () {
    beforeEach(function () {
      timeMetrics.resetMetricsObject();
    });

    it('should handle null/undefined key names', function () {
      timeMetrics.recordEntryTime(null);
      timeMetrics.recordEntryTime(undefined);
      timeMetrics.recordExitTime(null);
      timeMetrics.recordExitTime(undefined);
      
      const metrics = timeMetrics.getMetricsObject();
      console.log("Tes: ", JSON.stringify(metrics));
      expect(Object.keys(metrics).length).to.equal(0);
    });

    it('should handle empty array of key names', function () {
      timeMetrics.recordEntryTime([]);
      timeMetrics.recordExitTime([]);
      
      const metrics = timeMetrics.getMetricsObject();
      expect(Object.keys(metrics).length).to.equal(0);
    });

    it('should handle negative default total times', function () {
      timeMetrics.recordEntryTime('test5', -1000);
      const metrics = timeMetrics.getMetricsObject();
      
      expect(metrics.test5.tt).to.equal(-1000);
    });
  });
});