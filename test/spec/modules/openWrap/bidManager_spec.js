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

  describe('Browser Detection', function () {
    beforeEach(function () {
      // Save original navigator
      const originalNavigator = window.navigator;
      
      // Mock window.navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
    });

    afterEach(function () {
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: window.navigator,
        configurable: true
      });
    });

    it('should detect browser with regex match', function () {
      CONSTANTS.REGEX_BROWSERS.value = [/Chrome/];
      const result = bidManager.getBrowser();
      expect(result).to.equal(9);
    });

    it('should detect browser using userAgentData.brands', function () {
      // Setup browser brands data
      const originalNavigator = window.navigator;
      const mockNavigator = {
        userAgentData: {
          brands: [
            { brand: 'Chrome', version: '91' },
            { brand: 'Chromium', version: '91' }
          ]
        }
      };
      
      // Mock window.navigator
      Object.defineProperty(window, 'navigator', {
        value: mockNavigator,
        configurable: true
      });
      
      // Setup regex browsers with Chrome pattern
      CONSTANTS.REGEX_BROWSERS.value = [
        { regex: /chrome/i, id: 9 }
      ];
      
      const result = bidManager.getBrowser();
      
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
      
      expect(result).to.equal(9);
    });
    
    it('should fallback to userAgent when userAgentData.brands is empty', function () {
      // Setup mock navigator with empty brands
      const originalNavigator = window.navigator;
      const mockNavigator = {
        userAgentData: {
          brands: []
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };
      
      // Mock window.navigator
      Object.defineProperty(window, 'navigator', {
        value: mockNavigator,
        configurable: true
      });
      
      // Setup regex browsers with Chrome pattern
      CONSTANTS.REGEX_BROWSERS.value = [
        { regex: /chrome/i, id: 9 }
      ];
      
      const result = bidManager.getBrowser();
      
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
      
      expect(result).to.equal(9);
    });
    
    it('should fallback to userAgent when userAgentData is not available', function () {
      // Setup mock navigator without userAgentData
      const originalNavigator = window.navigator;
      const mockNavigator = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
      };
      
      // Mock window.navigator
      Object.defineProperty(window, 'navigator', {
        value: mockNavigator,
        configurable: true
      });
      
      // Setup regex browsers with Safari Mobile pattern
      CONSTANTS.REGEX_BROWSERS.value = [
        { regex: /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i, id: 10 }
      ];
      
      const result = bidManager.getBrowser();
      
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
      
      expect(result).to.equal(10);
    });
    
    it('should return 0 when no browser pattern matches', function () {
      // Setup mock navigator
      const originalNavigator = window.navigator;
      const mockNavigator = {
        userAgent: 'Unknown Browser'
      };
      
      // Mock window.navigator
      Object.defineProperty(window, 'navigator', {
        value: mockNavigator,
        configurable: true
      });
      
      // Setup regex browsers with patterns that won't match
      CONSTANTS.REGEX_BROWSERS.value = [
        { regex: /chrome/i, id: 9 },
        { regex: /firefox/i, id: 12 }
      ];
      
      const result = bidManager.getBrowser();
      
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
      
      expect(result).to.equal(0);
    });
    
    it('should return 0 when userAgent is empty', function () {
      // Setup mock navigator with empty userAgent
      const originalNavigator = window.navigator;
      const mockNavigator = {
        userAgent: ''
      };
      
      // Mock window.navigator
      Object.defineProperty(window, 'navigator', {
        value: mockNavigator,
        configurable: true
      });
      
      const result = bidManager.getBrowser();
      
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
      
      expect(result).to.equal(0);
    });
    
    it('should handle undefined navigator gracefully', function () {
      // Save original navigator
      const originalNavigator = window.navigator;
      
      // Set navigator to undefined
      Object.defineProperty(window, 'navigator', {
        value: undefined,
        configurable: true
      });
      
      const result = bidManager.getBrowser();
      
      // Restore original navigator
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
      
      expect(result).to.equal(0);
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
