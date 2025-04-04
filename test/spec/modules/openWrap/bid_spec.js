import { Bid, createBid } from '../../../../modules/openWrap/bid.js';
import * as CONFIG from '../../../../modules/openWrap/config.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as UTIL from '../../../../modules/openWrap/util.js';

describe('OpenWrap Core Module: bid.js', function () {
  let sandbox;
  const TEST_ADAPTER_ID = 'test_adapter';
  const TEST_KGPV = 'test_kgpv';

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(UTIL, 'getUniqueIdentifierStr').returns('test_bid_id');
    sandbox.stub(CONFIG, 'isServerSideAdapter').returns(false);
    sandbox.stub(CONFIG, 'getAdServerCurrency').returns(false);
    window[CONSTANTS.COMMON.PREBID_NAMESPACE] = {
      convertCurrency: sandbox.stub().returns(10)
    };
  });

  afterEach(function () {
    sandbox.restore();
    delete window[CONSTANTS.COMMON.PREBID_NAMESPACE];
  });

  describe('Constructor', function () {
    it('should initialize bid with correct default values', function () {
      const bid = new Bid(TEST_ADAPTER_ID, TEST_KGPV);
      
      expect(bid.adapterID).to.equal(TEST_ADAPTER_ID);
      expect(bid.kgpv).to.equal(TEST_KGPV);
      expect(bid.bidID).to.equal('test_bid_id');
      expect(bid.grossEcpm).to.equal(0);
      expect(bid.netEcpm).to.equal(0);
      expect(bid.defaultBid).to.equal(0);
      expect(bid.adHtml).to.equal('');
      expect(bid.adUrl).to.equal('');
      expect(bid.height).to.equal(0);
      expect(bid.width).to.equal(0);
      expect(bid.creativeID).to.equal('');
      expect(bid.keyValuePairs).to.deep.equal({});
      expect(bid.isPostTimeout).to.be.false;
      expect(bid.receivedTime).to.equal(0);
      expect(bid.isServerSide).to.equal(0);
      expect(bid.dealID).to.equal('');
      expect(bid.dealChannel).to.equal('');
      expect(bid.isWinningBid).to.be.false;
      expect(bid.status).to.equal(0);
      expect(bid.serverSideResponseTime).to.equal(0);
      expect(bid.mi).to.be.undefined;
      expect(bid.originalCpm).to.equal(0);
      expect(bid.originalCurrency).to.equal('');
      expect(bid.analyticsGrossCpm).to.equal(0);
      expect(bid.analyticsNetCpm).to.equal(0);
      expect(bid.native).to.be.undefined;
      expect(bid.adFormat).to.be.undefined;
      expect(bid.regexPattern).to.be.undefined;
      expect(bid.cacheUUID).to.be.undefined;
      expect(bid.sspID).to.equal('');
      expect(bid.vastUrl).to.be.undefined;
      expect(bid.vastCache).to.be.undefined;
      expect(bid.renderer).to.be.undefined;
      expect(bid.pbBid).to.be.undefined;
    });

    it('should set isServerSide to 1 for server-side adapter', function () {
      CONFIG.isServerSideAdapter.returns(true);
      const bid = new Bid(TEST_ADAPTER_ID, TEST_KGPV);
      expect(bid.isServerSide).to.equal(1);
    });
  });

  describe('Getters and Setters', function () {
    let bid;

    beforeEach(function () {
      bid = new Bid(TEST_ADAPTER_ID, TEST_KGPV);
    });

    it('getAdapterID should return correct adapter ID', function () {
      expect(bid.getAdapterID()).to.equal(TEST_ADAPTER_ID);
    });

    it('getBidID should return correct bid ID', function () {
      expect(bid.getBidID()).to.equal('test_bid_id');
    });

    it('getHeight should return correct height', function () {
      bid.height = 250;
      expect(bid.getHeight()).to.equal(250);
    });

    it('getWidth should return correct width', function () {
      bid.width = 300;
      expect(bid.getWidth()).to.equal(300);
    });

    it('setPostTimeoutStatus should set timeout status', function () {
      expect(bid.setPostTimeoutStatus()).to.equal(bid);
      expect(bid.getPostTimeoutStatus()).to.be.true;
    });

    it('setReceivedTime should set received time', function () {
      const time = Date.now();
      expect(bid.setReceivedTime(time)).to.equal(bid);
      expect(bid.getReceivedTime()).to.equal(time);
    });

    it('setRegexPattern should set regex pattern', function () {
      const pattern = /test/;
      expect(bid.setRegexPattern(pattern)).to.equal(bid);
      expect(bid.regexPattern).to.equal(pattern);
    });

    it('setDefaultBidStatus should set default bid status', function () {
      expect(bid.setDefaultBidStatus(1)).to.equal(bid);
      expect(bid.getDefaultBidStatus()).to.equal(1);
    });
  });

  describe('getGrossEcpm and getNetEcpm', function () {
    let bid;

    beforeEach(function () {
      bid = new Bid(TEST_ADAPTER_ID, TEST_KGPV);
    });

    it('should return analytics values when currency module is enabled', function () {
      CONFIG.getAdServerCurrency.returns(true);
      bid.analyticsGrossCpm = 15;
      bid.analyticsNetCpm = 12;
      bid.grossEcpm = 10;
      bid.netEcpm = 8;

      expect(bid.getGrossEcpm(true)).to.equal(15);
      expect(bid.getNetEcpm(true)).to.equal(12);
    });

    it('should return regular values when currency module is disabled', function () {
      bid.analyticsGrossCpm = 15;
      bid.analyticsNetCpm = 12;
      bid.grossEcpm = 10;
      bid.netEcpm = 8;

      expect(bid.getGrossEcpm(true)).to.equal(10);
      expect(bid.getNetEcpm(true)).to.equal(8);
    });
  });

  describe('createBid', function () {
    it('should create a new bid instance', function () {
      const bid = createBid(TEST_ADAPTER_ID, TEST_KGPV);
      expect(bid).to.be.instanceof(Bid);
      expect(bid.adapterID).to.equal(TEST_ADAPTER_ID);
      expect(bid.kgpv).to.equal(TEST_KGPV);
    });
  });
});