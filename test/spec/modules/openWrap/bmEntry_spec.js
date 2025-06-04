import { BMEntry, createBMEntry } from '../../../../modules/openWrap/bmEntry.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as util from '../../../../modules/openWrap/util.js';
import { AdapterEntry } from '../../../../modules/openWrap/adapterEntry.js';

describe('OpenWrap Core Module: bmEntry.js', function () {
  let sandbox;
  const TEST_NAME = 'test_slot';
  const TEST_ADAPTER_ID = 'test_adapter';
  const TEST_BID_ID = 'test_bid_id';
  const TEST_TIMESTAMP = 12345;
  const TEST_SIZES = [[300, 250], [300, 600]];

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(util, 'getCurrentTimestampInMs').returns(TEST_TIMESTAMP);
    sandbox.stub(util, 'log');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Constructor', function () {
    it('should initialize BMEntry with correct default values', function () {
      const bmEntry = new BMEntry(TEST_NAME);

      expect(bmEntry.name).to.equal(TEST_NAME);
      expect(bmEntry.sizes).to.deep.equal([]);
      expect(bmEntry.adapters).to.deep.equal({});
      expect(bmEntry.creationTime).to.equal(TEST_TIMESTAMP);
      expect(bmEntry.impressionID).to.equal('');
      expect(bmEntry.analyticsEnabled).to.be.false;
      expect(bmEntry.expired).to.be.false;
      expect(bmEntry.allPossibleBidsReceived).to.be.false;
    });
  });

  describe('Basic Getters and Setters', function () {
    let bmEntry;

    beforeEach(function () {
      bmEntry = new BMEntry(TEST_NAME);
    });

    it('getName should return correct name', function () {
      expect(bmEntry.getName()).to.equal(TEST_NAME);
    });

    it('getCreationTime should return correct timestamp', function () {
      expect(bmEntry.getCreationTime()).to.equal(TEST_TIMESTAMP);
    });

    it('setImpressionID and getImpressionID should work correctly', function () {
      const testId = 'test_impression_id';
      expect(bmEntry.setImpressionID(testId)).to.equal(bmEntry);
      expect(bmEntry.getImpressionID()).to.equal(testId);
    });

    it('setSizes and getSizes should work correctly', function () {
      expect(bmEntry.setSizes(TEST_SIZES)).to.equal(bmEntry);
      expect(bmEntry.getSizes()).to.deep.equal(TEST_SIZES);
    });

    it('setExpired and getExpiredStatus should work correctly', function () {
      expect(bmEntry.setExpired()).to.equal(bmEntry);
      expect(bmEntry.getExpiredStatus()).to.be.true;
    });

    it('setAnalyticEnabled and getAnalyticEnabledStatus should work correctly', function () {
      expect(bmEntry.setAnalyticEnabled()).to.equal(bmEntry);
      expect(bmEntry.getAnalyticEnabledStatus()).to.be.true;
    });

    it('setAllPossibleBidsReceived and hasAllPossibleBidsReceived should work correctly', function () {
      expect(bmEntry.setAllPossibleBidsReceived()).to.equal(bmEntry);
      expect(bmEntry.hasAllPossibleBidsReceived()).to.be.true;
    });
  });

  describe('Adapter Management', function () {
    let bmEntry;

    beforeEach(function () {
      bmEntry = new BMEntry(TEST_NAME);
      sandbox.stub(util, 'isOwnProperty').returns(false);
    });

    it('setAdapterEntry should create new adapter entry', function () {
      expect(bmEntry.setAdapterEntry(TEST_ADAPTER_ID)).to.equal(bmEntry);
      expect(util.log.calledWith(
        `${CONSTANTS.MESSAGES.M4 + TEST_NAME} ${TEST_ADAPTER_ID} ${bmEntry.adapters[TEST_ADAPTER_ID].getCallInitiatedTime()}`
      )).to.be.true;
    });

    it('setAdapterEntry should not create duplicate adapter entry', function () {
      bmEntry.setAdapterEntry(TEST_ADAPTER_ID);
      const firstAdapter = bmEntry.adapters[TEST_ADAPTER_ID];

      util.isOwnProperty.returns(true);
      bmEntry.setAdapterEntry(TEST_ADAPTER_ID);

      expect(bmEntry.adapters[TEST_ADAPTER_ID]).to.equal(firstAdapter);
    });

    it('getLastBidIDForAdapter should return empty string for non-existent adapter', function () {
      expect(bmEntry.getLastBidIDForAdapter('nonexistent')).to.equal('');
    });

    it('getLastBidIDForAdapter should return correct bid ID for existing adapter', function () {
      util.isOwnProperty.returns(true);
      bmEntry.adapters[TEST_ADAPTER_ID] = {
        getLastBidID: sandbox.stub().returns(TEST_BID_ID)
      };

      expect(bmEntry.getLastBidIDForAdapter(TEST_ADAPTER_ID)).to.equal(TEST_BID_ID);
    });
  });

  describe('Bid Management', function () {
    let bmEntry;
    let mockBid;

    beforeEach(function () {
      bmEntry = new BMEntry(TEST_NAME);
      mockBid = { id: TEST_BID_ID, getBidID: () => TEST_BID_ID };
      sandbox.stub(util, 'isOwnProperty');
    });

    it('setNewBid should create adapter entry if it does not exist', function () {
      util.isOwnProperty.returns(false);
      bmEntry.setNewBid(TEST_ADAPTER_ID, mockBid);

      expect(bmEntry.adapters[TEST_ADAPTER_ID]).to.be.instanceof(AdapterEntry);
    });

    it('setNewBid should use existing adapter entry', function () {
      util.isOwnProperty.returns(true);
      const mockAdapter = {
        setNewBid: sandbox.stub()
      };
      bmEntry.adapters[TEST_ADAPTER_ID] = mockAdapter;

      bmEntry.setNewBid(TEST_ADAPTER_ID, mockBid);
      expect(mockAdapter.setNewBid.calledWith(mockBid)).to.be.true;
    });

    it('getBid should return undefined for non-existent adapter', function () {
      util.isOwnProperty.returns(false);
      expect(bmEntry.getBid(TEST_ADAPTER_ID, TEST_BID_ID)).to.be.undefined;
    });

    it('getBid should return bid from existing adapter', function () {
      util.isOwnProperty.returns(true);
      const mockAdapter = {
        getBid: sandbox.stub().returns(mockBid)
      };
      bmEntry.adapters[TEST_ADAPTER_ID] = mockAdapter;

      expect(bmEntry.getBid(TEST_ADAPTER_ID, TEST_BID_ID)).to.equal(mockBid);
      expect(mockAdapter.getBid.calledWith(TEST_BID_ID)).to.be.true;
    });
  });

  describe('Factory Function', function () {
    it('createBMEntry should return new BMEntry instance', function () {
      const bmEntry = createBMEntry(TEST_NAME);
      expect(bmEntry).to.be.instanceof(BMEntry);
      expect(bmEntry.getName()).to.equal(TEST_NAME);
    });
  });
});
