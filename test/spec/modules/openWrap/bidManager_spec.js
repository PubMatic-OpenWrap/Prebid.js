import * as bidManager from '../../../../modules/openWrap/bidManager.js';
import * as util from '../../../../modules/openWrap/util.js';
import * as CONFIG from '../../../../modules/openWrap/config.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as bmEntry from '../../../../modules/openWrap/bmEntry.js';

describe('OpenWrap Module: bidManager.js', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    // Setup util stubs
    sandbox.stub(util, 'isOwnProperty');
    sandbox.stub(util, 'log');
    sandbox.stub(util, 'logWarning');
    sandbox.stub(util, 'logError');
    sandbox.stub(util, 'getBidFromEvent');
    sandbox.stub(util, 'insertHtmlIntoIframe');
    sandbox.stub(util, 'forEachOnArray');
    sandbox.stub(util, 'forEachOnObject');
    sandbox.stub(util, 'isObject');
    sandbox.stub(util, 'getMetaInfo');
    sandbox.stub(util, 'findQueryParamInURL');
    sandbox.stub(util, 'enableDebugLog');
    sandbox.stub(util, 'enableVisualDebugLog');
    sandbox.stub(util, 'getBididForPMP');
    sandbox.stub(util, 'addEventListenerForClass');
    sandbox.stub(util, 'getUserIds');
    sandbox.stub(util, 'getCustomParamsForDFPVideo');
    sandbox.stub(util, 'getCDSTargetingData');
    sandbox.stub(util, 'getOWConfig');
    sandbox.stub(util, 'handleHook');

    // Setup CONFIG stubs
    sandbox.stub(CONFIG, 'getTimeout').returns(1000);
    sandbox.stub(CONFIG, 'isPrebidPubMaticAnalyticsEnabled').returns(true);
    sandbox.stub(CONFIG, 'getAdapterNameForAlias');
    sandbox.stub(CONFIG, 'isServerSideAdapter').returns(false);
    sandbox.stub(CONFIG, 'getAdServerCurrency').returns(false);
    sandbox.stub(CONFIG, 'getBidPassThroughStatus').returns(0);

    // Setup CONSTANTS
    sandbox.stub(CONSTANTS, 'COMMON').value({
      PREBID_NAMESPACE: 'owpbjs',
      PROTOCOL: 'https://',
      OW_CLICK_NATIVE: 'owClickNative'
    });
    sandbox.stub(CONSTANTS, 'MESSAGES').value({
      M12: 'Previous ecpm: ',
      M13: ', New ecpm: ',
      M14: ', Adapter: ',
      M15: ', New ecpm: ',
      M16: ', Adapter: ',
      M17: 'Post timeout bid, ignored',
      M18: 'First bid from ',
      M23: 'Previous bid was default bid, new bid from '
    });
    sandbox.stub(CONSTANTS, 'HOOKS').value({
      BID_RECEIVED: 'bidReceived'
    });
    sandbox.stub(CONSTANTS, 'REGEX_BROWSERS');
    sandbox.stub(CONSTANTS, 'BROWSER_MAPPING');

    // Setup window.PWT
    if (!window.PWT) {
      window.PWT = {};
    }
    window.PWT.bidMap = {};
    window.PWT.bidIdMap = {};
  });

  afterEach(function () {
    delete window.PWT;
    delete window[CONSTANTS.COMMON.PREBID_NAMESPACE];
    delete window.setImageSrcToPixelURL;
    sandbox.restore();
  });

  describe('Bid Entry Management', function () {
    let mockBMEntry;

    beforeEach(function () {
      mockBMEntry = {
        setSizes: sandbox.stub(),
        setAdapterEntry: sandbox.stub(),
        setAllPossibleBidsReceived: sandbox.stub(),
        getCreationTime: sandbox.stub().returns(1000),
        getLastBidIDForAdapter: sandbox.stub().returns(''),
        getBid: sandbox.stub(),
        setNewBid: sandbox.stub(),
        adapters: {}
      };

      // Setup bmEntry.createBMEntry
      sandbox.stub(bmEntry, 'createBMEntry').callsFake((divID) => {
        mockBMEntry.divID = divID;
        mockBMEntry.adapters = {};
        return mockBMEntry;
      });
    });

    it('should create new bid entry', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(false);
      
      bidManager.createBidEntry(divID);
      
      expect(bmEntry.createBMEntry.calledWith(divID)).to.be.true;
      expect(window.PWT.bidMap[divID]).to.equal(mockBMEntry);
    });

    it('should set sizes for bid entry', function () {
      const divID = 'test_div';
      const sizes = [[300, 250]];
      util.isOwnProperty.returns(false);
      
      bidManager.setSizes(divID, sizes);
      
      expect(mockBMEntry.setSizes.calledWith(sizes)).to.be.true;
    });

    it('should set call init time', function () {
      const divID = 'test_div';
      const adapterID = 'test_adapter';
      util.isOwnProperty.returns(false);
      
      bidManager.setCallInitTime(divID, adapterID);
      
      expect(mockBMEntry.setAdapterEntry.calledWith(adapterID)).to.be.true;
    });
  });

  describe('Bid Management', function () {
    let mockBidDetails;
    let mockBMEntry;

    beforeEach(function () {
      mockBidDetails = {
        getAdapterID: sandbox.stub().returns('test_adapter'),
        getReceivedTime: sandbox.stub().returns(2000),
        getGrossEcpm: sandbox.stub().returns(1.5),
        getWidth: sandbox.stub().returns(300),
        getHeight: sandbox.stub().returns(250),
        getDefaultBidStatus: sandbox.stub().returns(0),
        setPostTimeoutStatus: sandbox.stub(),
        getNetEcpm: sandbox.stub().returns(1.0),
        getBidID: sandbox.stub().returns('test_bid_id'),
        getPostTimeoutStatus: sandbox.stub().returns(false),
        getServerSideStatus: sandbox.stub().returns(false)
      };

      mockBMEntry = {
        divID: 'test_div',
        adapters: {},
        getCreationTime: sandbox.stub().returns(1000),
        getLastBidIDForAdapter: sandbox.stub().returns(''),
        getBid: sandbox.stub(),
        setNewBid: sandbox.stub().callsFake((adapterID, bid) => {
          if (!mockBMEntry.adapters[adapterID]) {
            mockBMEntry.adapters[adapterID] = { bids: {} };
          }
          mockBMEntry.adapters[adapterID].bids[bid.getBidID()] = bid;
        }),
        setAllPossibleBidsReceived: sandbox.stub()
      };

      window.PWT.bidMap['test_div'] = mockBMEntry;

      // Mock prebid namespace for post-timeout bids
      window[CONSTANTS.COMMON.PREBID_NAMESPACE] = {
        triggerUserSyncs: sandbox.stub()
      };
    });

    it('should handle bid from bidder', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(true);
      
      bidManager.setBidFromBidder(divID, mockBidDetails);
      
      expect(util.log.called).to.be.true;
      expect(mockBMEntry.setNewBid.called).to.be.true;
      expect(mockBMEntry.adapters['test_adapter'].bids['test_bid_id']).to.equal(mockBidDetails);
    });

    it('should handle post-timeout bids', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(true);
      mockBidDetails.getReceivedTime.returns(3000);
      
      bidManager.setBidFromBidder(divID, mockBidDetails);
      
      expect(mockBidDetails.setPostTimeoutStatus.called).to.be.true;
      expect(mockBMEntry.setNewBid.called).to.be.true;
    });

    it('should handle existing bid comparison', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(true);
      mockBMEntry.getLastBidIDForAdapter.returns('existing_bid');
      mockBMEntry.getBid.returns({
        getDefaultBidStatus: sandbox.stub().returns(0),
        getNetEcpm: sandbox.stub().returns(0.5),
        getPostTimeoutStatus: sandbox.stub().returns(false)
      });
      
      bidManager.setBidFromBidder(divID, mockBidDetails);
      
      expect(mockBMEntry.setNewBid.called).to.be.true;
      expect(mockBMEntry.adapters['test_adapter'].bids['test_bid_id']).to.equal(mockBidDetails);
    });

    it('should handle error bid replacement', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(true);
      mockBMEntry.getLastBidIDForAdapter.returns('error_bid');
      mockBMEntry.getBid.returns({
        getDefaultBidStatus: sandbox.stub().returns(-1),
        getNetEcpm: sandbox.stub().returns(0),
        getPostTimeoutStatus: sandbox.stub().returns(false)
      });
      
      bidManager.setBidFromBidder(divID, mockBidDetails);
      
      expect(mockBMEntry.setNewBid.called).to.be.true;
      expect(mockBMEntry.adapters['test_adapter'].bids['test_bid_id']).to.equal(mockBidDetails);
    });
  });

  describe('Native Tracker Functions', function () {
    beforeEach(function () {
      // Define setImageSrcToPixelURL as a global function
      window.setImageSrcToPixelURL = sandbox.stub();
    });

    afterEach(function () {
      delete window.setImageSrcToPixelURL;
    });

    it('should fire impression trackers', function () {
      const bidDetails = {
        native: {
          ortb: {
            eventtrackers: [
              { event: 1, method: 1, url: 'test_url' }
            ],
            imptrackers: ['test_imp_url'],
            jstracker: '<script>test</script>'
          }
        }
      };
      
      bidManager.fireTracker(bidDetails, 'imptrackers');
      
      expect(util.insertHtmlIntoIframe.called).to.be.true;
      expect(window.setImageSrcToPixelURL.called).to.be.true;
    });

    it('should update native targeting keys', function () {
      const keyValuePairs = {
        'hb_native_title': 'test',
        'hb_native_body': 'test',
        'other_key': 'value'
      };
      
      bidManager.updateNativeTargtingKeys(keyValuePairs);
      
      expect(keyValuePairs).to.not.have.property('hb_native_title');
      expect(keyValuePairs).to.not.have.property('hb_native_body');
      expect(keyValuePairs).to.have.property('other_key');
    });
  });

  describe('Browser Detection', function () {
    let origUserAgent;

    beforeEach(function () {
      origUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/91.0.4472.124',
        configurable: true
      });
    });

    afterEach(function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: origUserAgent,
        configurable: true
      });
    });

    it('should detect browser correctly', function () {
      const result = bidManager.getBrowser();
      expect(result).to.be.a('number');
    });
  });

  describe('Partner Bid Status', function () {
    it('should check all partners bid status', function () {
      const mockBidMaps = {
        'div1': {
          hasAllPossibleBidsReceived: sandbox.stub().returns(true)
        }
      };
      const divIds = ['div1'];
      
      util.forEachOnArray.callsFake((arr, cb) => arr.forEach(cb));
      
      const result = bidManager.getAllPartnersBidStatuses(mockBidMaps, divIds);
      
      expect(result).to.be.true;
    });
  });
});