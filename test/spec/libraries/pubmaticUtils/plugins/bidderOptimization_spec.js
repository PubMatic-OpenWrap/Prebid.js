import { expect } from 'chai';
import * as sinon from 'sinon';
import * as bidderOpt from '../../../../../libraries/pubmaticUtils/plugins/bidderOptimization.js';
import * as pmUtils from '../../../../../libraries/pubmaticUtils/pubmaticUtils.js';

const { setBidderOptimisationConfig, getBidderDecision, init: initBO } = bidderOpt;

// Helper to build minimal valid config
function buildConfig(extra = {}) {
  return {
    skipRate: 0,
    modelGroups: [
      {
        modelVersion: 'testModel',
        modelWeight: 100,
        schema: {
          auctionKeyFields: ['domain', 'browser'],
          adUnitKeyFields: ['domain', 'browser', 'adUnitCode'],
          delimiter: '|'
        },
        auctionValues: {
          '*|*': { clientSequence: ['bidderA'] }
        },
        adUnitOverrides: {
          '*|*|div-1': { excludedBidders: ['bidderX'] }
        },
        default: {
          excludedBidders: [],
          clientSequence: []
        },
        ...extra
      }
    ]
  };
}

describe('Bidder Optimisation Plugin', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('schema validation', () => {
    it('should accept valid schema', () => {
      const cfg = buildConfig();
      setBidderOptimisationConfig(cfg);
      // calling decision should not throw
      const res = getBidderDecision({
        browser: '*',
        reqBidsConfigObj: { adUnits: [{ code: 'div-1' }] }
      });
      expect(res.skipped).to.be.false;
    });

    it('should reject unknown fields', () => {
      const bad = buildConfig({ schema: { auctionKeyFields: ['foo'], adUnitKeyFields: ['foo', 'adUnitCode'], delimiter: '|' } });
      setBidderOptimisationConfig(bad);
      const res = getBidderDecision({ browser: '*', reqBidsConfigObj: { adUnits: [{ code: 'div-1' }] } });
      // since config rejected, plugin falls back to skipped decision
      expect(res.skipped).to.be.true;
    });
  });

  describe('getBidderDecision()', () => {
    const cfg = buildConfig();
    before(() => setBidderOptimisationConfig(cfg));

    it('should return excluded bidders per adunit', () => {
      const decision = getBidderDecision({
        domain: '*',
        browser: '*',
        reqBidsConfigObj: { adUnits: [{ code: 'div-1' }] }
      });
      expect(decision.excludedBiddersByAdUnit['div-1']).to.include('bidderX');
    });

    it('should apply skipRate', () => {
      // override config with skipRate 100
      const skipCfg = buildConfig();
      skipCfg.skipRate = 100;
      setBidderOptimisationConfig(skipCfg);
      const res = getBidderDecision({ browser: '*', reqBidsConfigObj: { adUnits: [{ code: 'div-1' }] } });
      expect(res.skipped).to.be.true;
    });
  });

  describe('init()', () => {
    let fakeMgr;
    const pluginName = 'bidderOpt';
    beforeEach(() => {
      fakeMgr = {
        getConfigByName: sinon.stub()
      };
    });

    it('should return false when config missing', async () => {
      fakeMgr.getConfigByName.returns(null);
      const res = await initBO(pluginName, fakeMgr);
      expect(res).to.be.false;
    });

    it('should return false when config disabled', async () => {
      fakeMgr.getConfigByName.returns({ enabled: false });
      const res = await initBO(pluginName, fakeMgr);
      expect(res).to.be.false;
    });

    it('should load config when enabled & valid', async () => {
      const cfg = buildConfig();
      fakeMgr.getConfigByName.returns({ enabled: true, data: cfg, userIds: [] });
      const res = await initBO(pluginName, fakeMgr);
      expect(res).to.be.true;
    });
  });

  describe('processBidRequest()', () => {
    let stubBrowser, stubHasId;
    beforeEach(() => {
      stubBrowser = sinon.stub(pmUtils, 'getBrowserType').returns('*');
      stubHasId = sinon.stub(pmUtils, 'getHasId').returns('0');
      const cfg = buildConfig();
      setBidderOptimisationConfig(cfg);
    });
    afterEach(() => {
      sinon.restore();
    });

    it('should filter bidders according to decision', () => {
      const req = {
        auctionId: 'auc1',
        adUnits: [{ code: 'div-1', bids: [{ bidder: 'bidderX' }, { bidder: 'bidderY' }] }],
        adUnitCodes: ['div-1']
      };
      const res = bidderOpt.processBidRequest(req);
      expect(res).to.equal(req);
      // ensure bids filtered
      expect(res.adUnits[0].bids.some(b => b.bidder === 'bidderX')).to.be.false;
    });

    it('should return unmodified req when no model selected', () => {
      bidderOpt.setBidderOptimisationConfig({}); // invalid => clears model
      const req = { test: true };
      const res = bidderOpt.processBidRequest(req);
      expect(res).to.equal(req);
    });
  });
});
