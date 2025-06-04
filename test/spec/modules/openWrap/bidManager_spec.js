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

    it('should handle bid with lower ecpm', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(true);
      mockBMEntry.getLastBidIDForAdapter.returns('existing_bid');
      mockBMEntry.getBid.returns({
        getDefaultBidStatus: sandbox.stub().returns(0),
        getNetEcpm: sandbox.stub().returns(1.5),
        getPostTimeoutStatus: sandbox.stub().returns(false)
      });

      bidManager.setBidFromBidder(divID, mockBidDetails);

      expect(mockBMEntry.setNewBid.called).to.be.false;
      expect(util.log.calledWith(sinon.match(/Previous ecpm/))).to.be.true;
    });

    it('should handle post-timeout bid rejection', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(true);
      mockBMEntry.getLastBidIDForAdapter.returns('existing_bid');
      mockBMEntry.getBid.returns({
        getDefaultBidStatus: sandbox.stub().returns(0),
        getNetEcpm: sandbox.stub().returns(1.0),
        getPostTimeoutStatus: sandbox.stub().returns(true)
      });
      mockBidDetails.getReceivedTime.returns(3000);

      bidManager.setBidFromBidder(divID, mockBidDetails);

      expect(mockBMEntry.setNewBid.called).to.be.false;
      expect(util.log.calledWith(CONSTANTS.MESSAGES.M17)).to.be.true;
    });

    it('should handle non-existent bid entry', function () {
      const divID = 'test_div';
      util.isOwnProperty.returns(false);

      bidManager.setBidFromBidder(divID, mockBidDetails);

      expect(util.logWarning.called).to.be.true;
    });
  });

  describe('Slot Level Frequency', function () {
    it('should get slot level frequency depth', function () {
      const mockFrequencyDepth = {
        slotLevelFrquencyDepth: {
          slot1: { prop1: 'value1' }
        }
      };
      const result = bidManager.getSlotLevelFrequencyDepth(mockFrequencyDepth, 'prop1', 'slot1');
      expect(result).to.equal('value1');
    });

    it('should handle missing slot in frequency depth', function () {
      const mockFrequencyDepth = {};
      const result = bidManager.getSlotLevelFrequencyDepth(mockFrequencyDepth, 'prop1', 'slot1');
      expect(result).to.be.undefined;
    });
  });

  describe('Metadata Management', function () {
    it('should get metadata', function () {
      const meta = {
        networkId: 'value1',
        advertiserId: 'value2'
      };
      const result = bidManager.getMetadata(meta);
      expect(result).to.deep.equal({
        nwid: 'value1',
        adid: 'value2'
      });
    });

    it('should handle null metadata', function () {
      const meta = null;
      const result = bidManager.getMetadata(meta);
      expect(result).to.be.undefined;
    });

    it('should handle empty metadata', function () {
      const meta = {};
      const result = bidManager.getMetadata(meta);
      expect(result).to.be.undefined;
    });
  });

  describe('Native Tracker Functions', function () {
    beforeEach(function () {
      window.setImageSrcToPixelURL = sandbox.stub();
    });

    it('should fire click trackers', function () {
      const bidDetails = {
        native: {
          ortb: {
            link: {
              clickTrackers: ['click_url']
            }
          }
        }
      };

      bidManager.fireTracker(bidDetails, 'click');

      expect(window.setImageSrcToPixelURL.calledWith('click_url', false)).to.be.true;
    });

    it('should handle missing click trackers', function () {
      const bidDetails = { native: {} };
      bidManager.fireTracker(bidDetails, 'click');
      expect(window.setImageSrcToPixelURL.called).to.be.false;
    });

    it('should handle impression trackers with jstracker', function () {
      const bidDetails = {
        native: {
          ortb: {
            eventtrackers: [
              { event: 1, method: 2, url: '<script>test</script>' }
            ],
            jstracker: '<script>test</script>'
          }
        }
      };

      bidManager.fireTracker(bidDetails, 'imptrackers');

      expect(util.insertHtmlIntoIframe.calledWith('<script>test</script>')).to.be.true;
    });

    it('should handle missing trackers', function () {
      const bidDetails = { native: {} };
      bidManager.fireTracker(bidDetails, 'imptrackers');
      expect(window.setImageSrcToPixelURL.called).to.be.false;
      expect(util.insertHtmlIntoIframe.called).to.be.false;
    });
  });

  describe('Browser Detection', function () {
    it('should detect browser with regex match', function () {
      CONSTANTS.REGEX_BROWSERS.value = [/Chrome/];
      CONSTANTS.BROWSER_MAPPING.value = [73];
      const result = bidManager.getBrowser();
      expect(result).to.equal(73);
    });

    it('should handle no regex match', function () {
      CONSTANTS.REGEX_BROWSERS.value = [/Firefox/];
      CONSTANTS.BROWSER_MAPPING.value = [73];
      const result = bidManager.getBrowser();
      expect(result).to.equal(73);
    });

    it('should handle null user agent', function () {
      Object.defineProperty(navigator, 'userAgent', {
        value: null,
        configurable: true
      });
      const result = bidManager.getBrowser();
      expect(result).to.equal(-1);
    });
  });

  describe('Tracker Functions', function () {
    beforeEach(function () {
      window.parent.postMessage = sandbox.stub();
    });

    afterEach(function () {
      delete window.parent.postMessage;
    });

    it('should load trackers on click', function () {
      const event = { target: {} };
      const bidId = 'test_bid';
      util.getBidFromEvent.returns(bidId);

      bidManager.loadTrackers(event);

      expect(window.parent.postMessage.calledWith(
        sinon.match(JSON.stringify({
          pwt_type: '3',
          pwt_bidID: bidId,
          pwt_origin: CONSTANTS.COMMON.PROTOCOL + window.location.hostname,
          pwt_action: 'click'
        })),
        '*'
      )).to.be.true;
    });

    it('should execute impression tracker', function () {
      const bidId = 'test_bid';

      bidManager.executeTracker(bidId);

      expect(window.parent.postMessage.calledWith(
        sinon.match(JSON.stringify({
          pwt_type: '3',
          pwt_bidID: bidId,
          pwt_origin: CONSTANTS.COMMON.PROTOCOL + window.location.hostname,
          pwt_action: 'imptrackers'
        })),
        '*'
      )).to.be.true;
    });
  });

  describe('Partner Bid Status', function () {
    it('should handle missing bid maps', function () {
      const mockBidMaps = {};
      const divIds = ['div1'];

      util.forEachOnArray.callsFake((arr, cb) => arr.forEach(cb));

      const result = bidManager.getAllPartnersBidStatuses(mockBidMaps, divIds);

      expect(result).to.be.true;
    });
  });
});
