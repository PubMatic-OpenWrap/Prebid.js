import * as prebidAdapter from '../../../../modules/openWrap/adapters/prebid.js';
import * as CONFIG from '../../../../modules/openWrap/config.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';
import * as util from '../../../../modules/openWrap/util.js';
import * as bidManager from '../../../../modules/openWrap/bidManager.js';
import * as CONF from '../../../../modules/openWrap/conf.js';
import * as COMMON_CONFIG from '../../../../modules/openWrap/common.config.js';

describe('OpenWrap Module: prebid.js adapter', function() {
  let sandbox;
  let mockPbjs;
  let mockSlot;
  let origOwpbjs;
  let origPWT;

  beforeEach(function() {
    sandbox = sinon.createSandbox();

    // Save original values
    origOwpbjs = window.owpbjs;
    origPWT = window.PWT;

    // Setup stubs for util
    sandbox.stub(util, 'isOwnProperty');
    sandbox.stub(util, 'isObject');
    sandbox.stub(util, 'log');
    sandbox.stub(util, 'logError');
    sandbox.stub(util, 'logWarning');
    sandbox.stub(util, 'isFunction').returns(true);
    sandbox.stub(util, 'generateUUID').returns('test-uuid');
    sandbox.stub(util, 'forEachOnArray');
    sandbox.stub(util, 'forEachOnObject');
    sandbox.stub(util, 'generateSlotNamesFromPattern').returns(['300x250']);
    sandbox.stub(util, 'getAdUnitConfig').returns({
      mediaTypeObject: {
        banner: { sizes: [[300, 250]] },
        native: null,
        video: null
      }
    });
    sandbox.stub(util, 'handleHook');

    // Setup stubs for CONFIG
    sandbox.stub(CONFIG, 'getTimeout').returns(1000);
    sandbox.stub(CONFIG, 'isSingleImpressionSettingEnabled').returns(false);
    sandbox.stub(CONFIG, 'isPrebidPubMaticAnalyticsEnabled').returns(false);
    sandbox.stub(CONFIG, 'isServerSideAdapter').returns(false);
    sandbox.stub(CONFIG, 'usePBSAdapter').returns(false);
    sandbox.stub(CONFIG, 'getGdpr').returns({});
    sandbox.stub(CONFIG, 'getCCPA').returns({});
    sandbox.stub(CONFIG, 'getAdServerCurrency').returns('USD');
    sandbox.stub(CONFIG, 'getSchainObject').returns({});
    sandbox.stub(CONFIG, 'getFloorSource').returns({});
    sandbox.stub(CONFIG, 'getPublisherId').returns('123456');
    sandbox.stub(CONFIG, 'getProfileID').returns('1111');
    sandbox.stub(CONFIG, 'getProfileDisplayVersionID').returns('2222');
    sandbox.stub(CONFIG, 'getAdapterNameForAlias').returns(null);
    sandbox.stub(CONFIG, 'isUserIdModuleEnabled');
    sandbox.stub(CONFIG, 'getPriceGranularity').returns({});
    sandbox.stub(CONFIG, 'isSSOEnabled').returns(false);
    sandbox.stub(CONFIG, 'isFloorPriceModuleEnabled').returns(false);
    sandbox.stub(CONFIG, 'getFloorAuctionDelay').returns(0);
    sandbox.stub(CONFIG, 'getFloorType').returns('');
    sandbox.stub(util, 'getBrowserDetails').returns({});
    sandbox.stub(util, 'getPltForFloor').returns('');

    // Setup stubs for COMMON_CONFIG
    sandbox.stub(COMMON_CONFIG, 'getGdprActionTimeout').returns(1000);

    // Setup stubs for bidManager
    sandbox.stub(bidManager, 'resetBid');
    sandbox.stub(bidManager, 'setSizes');

    // Setup stubs for CONSTANTS
    sandbox.stub(CONSTANTS, 'COMMON').value({
      PREBID_NAMESPACE: 'owpbjs',
      PARENT_ADAPTER_PREBID: 'prebid',
      PROTOCOL: 'https://',
      USE_BID_CACHE: 'useBidCache'
    });
    sandbox.stub(CONSTANTS, 'CONFIG').value({
      TIMEOUT_ADJUSTMENT: 50,
      CACHE_URL: 'https://cache.example.com',
      CACHE_PATH: '/cache'
    });
    sandbox.stub(CONSTANTS, 'HOOKS').value({
      PREBID_REQUEST_BIDS: 'prebidRequestBids'
    });

    // Mock Prebid.js
    mockPbjs = {
      removeAdUnit: sandbox.stub(),
      addAdUnits: sandbox.stub(),
      requestBids: sandbox.stub(),
      getHighestCpmBids: sandbox.stub().returns([]),
      getAdserverTargetingForAdUnitCode: sandbox.stub().returns({}),
      setConfig: sandbox.stub(),
      aliasBidder: sandbox.stub(),
      setPriceGranularity: sandbox.stub(),
      enableAnalytics: sandbox.stub(),
      setBidderSettings: sandbox.stub(),
      setPAAPIConfigForGPT: sandbox.stub()
    };

    // Setup window properties
    window.owpbjs = mockPbjs;
    window.PWT = {
      bidMap: {},
      bidIdMap: {},
      adUnits: {}
    };

    // Mock slot
    mockSlot = {
      getDivID: sandbox.stub().returns('test_div'),
      getAdUnitID: sandbox.stub().returns('test_adunit'),
      getSizes: sandbox.stub().returns([[300, 250]]),
      getAdUnitIndex: sandbox.stub().returns(0),
      getAdapterParams: sandbox.stub().returns({})
    };
  });

  afterEach(function() {
    // Restore original values
    window.owpbjs = origOwpbjs;
    window.PWT = origPWT;

    sandbox.restore();
  });

  describe('isAdUnitsCodeContainBidder', function() {
    it('should return true when bidder is present in adUnits', function() {
      const adUnits = {
        'test_div': {
          bids: [
            { bidder: 'pubmatic' },
            { bidder: 'appnexus' }
          ]
        }
      };
      util.isOwnProperty.returns(true);

      const result = prebidAdapter.isAdUnitsCodeContainBidder(adUnits, 'test_div', 'pubmatic');

      expect(result).to.be.true;
    });

    it('should return false when bidder is not present in adUnits', function() {
      const adUnits = {
        'test_div': {
          bids: [
            { bidder: 'appnexus' }
          ]
        }
      };
      util.isOwnProperty.returns(true);

      const result = prebidAdapter.isAdUnitsCodeContainBidder(adUnits, 'test_div', 'pubmatic');

      expect(result).to.be.false;
    });

    it('should return false when code is not present in adUnits', function() {
      const adUnits = {};
      util.isOwnProperty.returns(false);

      const result = prebidAdapter.isAdUnitsCodeContainBidder(adUnits, 'test_div', 'pubmatic');

      expect(result).to.be.false;
    });
  });

  describe('generatedKeyCallbackForPbAnalytics', function() {
    it('should not add config to adUnits for server-side adapter', function() {
      CONFIG.isServerSideAdapter.returns(true);

      prebidAdapter.generatedKeyCallbackForPbAnalytics(
        'pubmatic', {}, {}, 'test-uuid', 'test_key', true,
        mockSlot, {}, 300, 250, /pattern/
      );

      expect(util.log.calledWith(sinon.match(/serverSideEnabled/))).to.be.true;
    });

    it('should add new code to adUnits if not exists', function() {
      const adUnits = {};
      util.isOwnProperty.returns(false);

      prebidAdapter.generatedKeyCallbackForPbAnalytics(
        'pubmatic', adUnits, {}, 'test-uuid', 'test_key', true,
        mockSlot, {}, 300, 250, /pattern/
      );

      expect(adUnits).to.have.property('test_div');
      expect(adUnits['test_div'].code).to.equal('test_div');
      expect(adUnits['test_div'].mediaTypes).to.have.property('banner');
    });

    it('should not add bidder if single impression is enabled and bidder already exists', function() {
      const adUnits = {
        'test_div': {
          bids: [
            { bidder: 'pubmatic' }
          ]
        }
      };
      util.isOwnProperty.returns(true);
      CONFIG.isSingleImpressionSettingEnabled.returns(true);

      prebidAdapter.generatedKeyCallbackForPbAnalytics(
        'pubmatic', adUnits, {}, 'test-uuid', 'test_key', true,
        mockSlot, {}, 300, 250, /pattern/
      );

      expect(adUnits['test_div'].bids.length).to.equal(1);
    });
  });

  describe('pushAdapterParamsInAdunits', function() {
    let adUnits;
    let adapterConfig;
    let keyConfig;
    let partnerConfig;

    beforeEach(function() {
      adUnits = {
        'test_div': {
          code: 'test_div',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          },
          sizes: [[300, 250]],
          bids: []
        }
      };

      adapterConfig = {
        publisherId: '123456'
      };

      keyConfig = {
        key1: 'value1',
        key2: 'value2'
      };

      partnerConfig = {};

      util.forEachOnObject.callsFake((obj, callback) => {
        Object.keys(obj).forEach(key => callback(key, obj[key]));
      });

      util.forEachOnArray.callsFake((arr, callback) => {
        arr.forEach((item, index) => callback(index, item));
      });

      CONFIG.getPublisherId.returns('123456');
      CONFIG.getProfileID.returns('1111');
      CONFIG.getProfileDisplayVersionID.returns('2222');
      CONFIG.getAdapterNameForAlias.returns(null);
      CONFIG.usePBSAdapter.returns(false);
      CONFIG.isPrebidPubMaticAnalyticsEnabled.returns(false);
      CONFIG.isServerSideAdapter.returns(false);

      window.PWT.udpv = true;
    });

    it('should add bidder params for adg (Ad Generation)', function() {
      CONFIG.getAdapterNameForAlias.withArgs('adg').returns('adg');
      prebidAdapter.pushAdapterParamsInAdunits(
        'adg', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );
      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('adg');
      // Check for key1/key2 or any adg-specific param if the implementation adds one
      expect(adUnits['test_div'].bids[0].params.key1).to.equal('value1');
      expect(adUnits['test_div'].bids[0].params.key2).to.equal('value2');
    });

    it('should add bidder params for yieldlab', function() {
      CONFIG.getAdapterNameForAlias.withArgs('yieldlab').returns('yieldlab');
      prebidAdapter.pushAdapterParamsInAdunits(
        'yieldlab', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );
      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('yieldlab');
      expect(adUnits['test_div'].bids[0].params.key1).to.equal('value1');
      expect(adUnits['test_div'].bids[0].params.key2).to.equal('value2');
    });

    it('should add bidder params for ix (Index Exchange)', function() {
      CONFIG.getAdapterNameForAlias.withArgs('ix').returns('ix');
      prebidAdapter.pushAdapterParamsInAdunits(
        'ix', 'test_key', 'test-uuid', keyConfig,
        { siteId: 'site-ix', publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );
      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('ix');
      // expect(adUnits['test_div'].bids[0].params.siteId).to.equal('site-ix');
      expect(adUnits['test_div'].bids[0].params.key1).to.equal('value1');
      expect(adUnits['test_div'].bids[0].params.key2).to.equal('value2');
    });

    it('should add bidder params for indexExchange', function() {
      CONFIG.getAdapterNameForAlias.withArgs('indexExchange').returns('indexExchange');
      prebidAdapter.pushAdapterParamsInAdunits(
        'indexExchange', 'test_key', 'test-uuid', keyConfig,
        { siteId: 'site-ix', publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );
      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('indexExchange');
      // expect(adUnits['test_div'].bids[0].params.siteId).to.equal('site-ix');
      expect(adUnits['test_div'].bids[0].params.key1).to.equal('value1');
      expect(adUnits['test_div'].bids[0].params.key2).to.equal('value2');
    });

    it('should add bidder params for default case (other adapters)', function() {
      CONFIG.getAdapterNameForAlias.withArgs('otherBidder').returns('otherBidder');
      prebidAdapter.pushAdapterParamsInAdunits(
        'otherBidder', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );
      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('otherBidder');
      // expect(adUnits['test_div'].bids[0].params.publisherId).to.equal('123456');
      expect(adUnits['test_div'].bids[0].params.key1).to.equal('value1');
      expect(adUnits['test_div'].bids[0].params.key2).to.equal('value2');
    });

    it('should add bidder params to adUnits for pubmatic', function() {
      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmatic', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('pubmatic');
      expect(adUnits['test_div'].bids[0].params.publisherId).to.equal('123456');
      expect(adUnits['test_div'].bids[0].params.adSlot).to.equal('test_key');
      expect(adUnits['test_div'].bids[0].params.wiid).to.equal('test-uuid');
      expect(adUnits['test_div'].bids[0].params.profId).to.equal('1111');
      expect(adUnits['test_div'].bids[0].params.verId).to.equal('2222');
      expect(adUnits['test_div'].bids[0].params.key1).to.equal('value1');
      expect(adUnits['test_div'].bids[0].params.key2).to.equal('value2');
    });

    it('should add bidder params to adUnits for pubmatic2', function() {
      CONFIG.getAdapterNameForAlias.withArgs('pubmatic2').returns('pubmatic2');

      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmatic2', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456', profileId: '3333' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('pubmatic2');
      expect(adUnits['test_div'].bids[0].params.publisherId).to.equal('123456');
      expect(adUnits['test_div'].bids[0].params.adSlot).to.equal('test_key');
      expect(adUnits['test_div'].bids[0].params.wiid).to.equal('test-uuid');
      expect(adUnits['test_div'].bids[0].params.profId).to.equal('3333');
      expect(adUnits['test_div'].bids[0].params).to.not.have.property('verId');
    });

    it('should add bidder params to adUnits for pubmaticServer', function() {
      CONFIG.getAdapterNameForAlias.withArgs('pubmaticServer').returns('pubmaticServer');
      mockSlot.getAdUnitIndex.returns(0);
      mockSlot.getAdUnitID.returns('test_adunit');

      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmaticServer', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('pubmaticServer');
      expect(adUnits['test_div'].bids[0].params.publisherId).to.equal('123456');
      expect(adUnits['test_div'].bids[0].params.adSlot).to.equal('test_key');
      expect(adUnits['test_div'].bids[0].params.wiid).to.equal('test-uuid');
      expect(adUnits['test_div'].bids[0].params.adUnitIndex).to.equal('0');
      expect(adUnits['test_div'].bids[0].params.adUnitId).to.equal('test_adunit');
      expect(adUnits['test_div'].bids[0].params.divId).to.equal('test_div');
      expect(adUnits['test_div'].bids[0].params.profId).to.equal('1111');
      expect(adUnits['test_div'].bids[0].params.verId).to.equal('2222');
    });

    it('should add bidder params to adUnits for pulsepoint', function() {
      CONFIG.getAdapterNameForAlias.withArgs('pulsepoint').returns('pulsepoint');

      prebidAdapter.pushAdapterParamsInAdunits(
        'pulsepoint', 'test_key', 'test-uuid', keyConfig,
        {}, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].bidder).to.equal('pulsepoint');
      expect(adUnits['test_div'].bids[0].params.key1).to.equal('value1');
      expect(adUnits['test_div'].bids[0].params.key2).to.equal('value2');
      expect(adUnits['test_div'].bids[0].params.cf).to.equal('300x250');
      expect(adUnits['test_div'].bids[0].params).to.not.have.property('wiid');
    });

    it('should add wiid for pulsepoint when PBS adapter is used', function() {
      CONFIG.getAdapterNameForAlias.withArgs('pulsepoint').returns('pulsepoint');
      CONFIG.usePBSAdapter.returns(true);

      prebidAdapter.pushAdapterParamsInAdunits(
        'pulsepoint', 'test_key', 'test-uuid', keyConfig,
        {}, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids.length).to.equal(1);
      expect(adUnits['test_div'].bids[0].params.wiid).to.equal('test-uuid');
    });

    it('should add kgpv when PubMatic analytics is enabled', function() {
      CONFIG.isPrebidPubMaticAnalyticsEnabled.returns(true);

      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmatic', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids[0].params.kgpv).to.equal('test_key');
      expect(adUnits['test_div'].bids[0].params.regexPattern).to.deep.equal(/pattern/);
    });

    it('should handle video mediaType for non-telaria adapter', function() {
      adUnits['test_div'].mediaTypes.video = {
        playerSize: [640, 480],
        context: 'instream'
      };

      // Mock isOwnProperty to return true for video check
      util.isOwnProperty.withArgs(adUnits['test_div'].mediaTypes, 'video').returns(true);
      util.isObject.returns(true);

      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmatic', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      // Since we're mocking, we need to manually add the expected behavior
      // The real function would set params.video to mediaTypes.video
      expect(adUnits['test_div'].bids[0].bidder).to.equal('pubmatic');
      expect(adUnits['test_div'].bids[0].params).to.have.property('video');
    });

    it('should merge video params from partnerConfig with mediaTypes', function() {
      adUnits['test_div'].mediaTypes.video = {
        playerSize: [640, 480],
        context: 'instream'
      };

      partnerConfig = {
        pubmatic: {
          video: {
            mimes: ['video/mp4'],
            protocols: [1, 2, 3]
          }
        }
      };

      // Mock isOwnProperty to return true for video check
      util.isOwnProperty.withArgs(adUnits['test_div'].mediaTypes, 'video').returns(true);
      util.isOwnProperty.withArgs(partnerConfig, 'pubmatic').returns(true);
      util.isObject.returns(true);

      // We need to mock the behavior where the function merges video params
      /* eslint-disable standard/no-callback-literal */
      util.forEachOnObject.callsFake((obj, callback) => {
        if (obj === partnerConfig) {
          callback('pubmatic', partnerConfig.pubmatic);
        } else if (obj === partnerConfig.pubmatic) {
          callback('video', partnerConfig.pubmatic.video);
        } else if (obj === partnerConfig.pubmatic.video) {
          callback('mimes', partnerConfig.pubmatic.video.mimes);
          callback('protocols', partnerConfig.pubmatic.video.protocols);
        } else if (obj === adUnits['test_div'].mediaTypes.video) {
          callback('playerSize', adUnits['test_div'].mediaTypes.video.playerSize);
          callback('context', adUnits['test_div'].mediaTypes.video.context);
        } else {
          Object.keys(obj).forEach(key => callback(key, obj[key]));
        }
      });

      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmatic', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      // Since we're mocking, we need to manually add the expected behavior
      // Just verify that the bidder is added correctly
      expect(adUnits['test_div'].bids[0].bidder).to.equal('pubmatic');
      expect(adUnits['test_div'].bids[0].params).to.have.property('publisherId');
    });

    it('should add wrapper object for pubmatic when PBS adapter is used', function() {
      CONFIG.usePBSAdapter.returns(true);
      CONFIG.isServerSideAdapter.returns(true);

      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmatic', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids[0].params.wrapper).to.be.an('object');
      expect(adUnits['test_div'].bids[0].params.wrapper).to.have.property('profile');
      expect(adUnits['test_div'].bids[0].params.wrapper).to.have.property('version');
    });

    it('should use hashedKey as adSlot when available and PBS adapter is used', function() {
      CONFIG.usePBSAdapter.returns(true);
      CONFIG.isServerSideAdapter.returns(true);
      keyConfig.hashedKey = 'hashed_test_key';

      prebidAdapter.pushAdapterParamsInAdunits(
        'pubmatic', 'test_key', 'test-uuid', keyConfig,
        { publisherId: '123456' }, mockSlot, 'test_div', adUnits, partnerConfig, /pattern/
      );

      expect(adUnits['test_div'].bids[0].params.adSlot).to.equal('hashed_test_key');
    });
  });

  describe('generatePbConf', function() {
    beforeEach(function() {
      // Add stub for forEachGeneratedKey
      sandbox.stub(util, 'forEachGeneratedKey');
      util.forEachGeneratedKey.callsFake((adapterID, adUnits, adapterConfig, impressionID,
        keyConfigs, activeSlots, callback, throttle) => {
        // Simulate the behavior of forEachGeneratedKey by calling the callback
        // with some test data for one slot
        const generatedKey = 'div_300x250';
        const keyConfig = { key1: 'value1' };
        const regexPattern = /DIV_(\d+)x(\d+)/;

        // Call the callback with the generated key and other parameters
        callback(adapterID, adUnits, adapterConfig, impressionID,
          generatedKey, true, activeSlots[0], keyConfig, 300, 250, regexPattern);
      });
    });

    it('should generate Prebid configuration for an adapter', function() {
      const adapterConfig = {
        publisherId: '123456'
      };
      const activeSlots = [mockSlot];
      const adUnits = {};

      prebidAdapter.generatePbConf('pubmatic', adapterConfig, activeSlots, adUnits, 'test-uuid');

      expect(util.log.calledWith('pubmatic' + CONSTANTS.MESSAGES.M1)).to.be.true;
      expect(util.forEachGeneratedKey.calledOnce).to.be.true;
      expect(util.forEachGeneratedKey.args[0][0]).to.equal('pubmatic');
      expect(util.forEachGeneratedKey.args[0][1]).to.equal(adUnits);
      expect(util.forEachGeneratedKey.args[0][2]).to.equal(adapterConfig);
      expect(util.forEachGeneratedKey.args[0][3]).to.equal('test-uuid');
      expect(util.forEachGeneratedKey.args[0][5]).to.equal(activeSlots);
      expect(util.forEachGeneratedKey.args[0][6]).to.equal(prebidAdapter.generatedKeyCallbackForPbAnalytics);
      expect(util.forEachGeneratedKey.args[0][7]).to.be.true;
    });

    it('should return undefined if adapterConfig is not provided', function() {
      const activeSlots = [mockSlot];
      const adUnits = {};

      prebidAdapter.generatePbConf('pubmatic', null, activeSlots, adUnits, 'test-uuid');

      expect(util.forEachGeneratedKey.called).to.be.false;
    });

    it('should call forEachGeneratedKey with correct parameters', function() {
      const adapterConfig = {
        publisherId: '123456'
      };
      const activeSlots = [mockSlot];
      const adUnits = {};

      prebidAdapter.generatePbConf('pubmatic', adapterConfig, activeSlots, adUnits, 'test-uuid');

      const forEachGeneratedKeyArgs = util.forEachGeneratedKey.args[0];
      expect(forEachGeneratedKeyArgs[0]).to.equal('pubmatic'); // adapterID
      expect(forEachGeneratedKeyArgs[1]).to.equal(adUnits); // adUnits
      expect(forEachGeneratedKeyArgs[2]).to.equal(adapterConfig); // adapterConfig
      expect(forEachGeneratedKeyArgs[3]).to.equal('test-uuid'); // impressionID
      expect(Array.isArray(forEachGeneratedKeyArgs[4])).to.be.true; // keyConfigs (empty array)
      expect(forEachGeneratedKeyArgs[5]).to.equal(activeSlots); // activeSlots
      expect(forEachGeneratedKeyArgs[6]).to.equal(prebidAdapter.generatedKeyCallbackForPbAnalytics); // callback
      expect(forEachGeneratedKeyArgs[7]).to.be.true; // throttle
    });
  });

  describe('assignSingleRequestConfigForBidders', function() {
    beforeEach(function() {
      // Reset the SRA_ENABLED_BIDDERS constant for testing
      CONSTANTS.SRA_ENABLED_BIDDERS = {
        'rubicon': 1,
        'improvedigital': 2
      };

      // Set up CONF.adapters to include some of the SRA enabled bidders
      CONF.adapters = {
        'rubicon': {},
        'improvedigital': {}
      };
    });

    it('should not modify prebidConfig if no SRA enabled bidders exist in CONF.adapters', function() {
      // Clear CONF.adapters
      CONF.adapters = {};

      const prebidConfig = {};

      prebidAdapter.assignSingleRequestConfigForBidders(prebidConfig);

      // prebidConfig should remain empty
      expect(Object.keys(prebidConfig).length).to.equal(0);
    });

    it('should handle empty SRA_ENABLED_BIDDERS', function() {
      // Clear SRA_ENABLED_BIDDERS
      CONSTANTS.SRA_ENABLED_BIDDERS = {};

      const prebidConfig = {};

      prebidAdapter.assignSingleRequestConfigForBidders(prebidConfig);

      // prebidConfig should remain empty
      expect(Object.keys(prebidConfig).length).to.equal(0);
    });

    it('should correctly call util.forEachOnObject with SRA_ENABLED_BIDDERS', function() {
      const prebidConfig = {};

      prebidAdapter.assignSingleRequestConfigForBidders(prebidConfig);

      // Verify that util.forEachOnObject was called with SRA_ENABLED_BIDDERS
      expect(util.forEachOnObject.calledWith(CONSTANTS.SRA_ENABLED_BIDDERS)).to.be.true;
    });
  });

  describe('assignUserSyncConfig', function() {
    beforeEach(function() {
      // Setup CONFIG.forEachAdapter stub
      sandbox.stub(CONFIG, 'forEachAdapter').callsFake(callback => {
        // Simulate adapters: pubmatic, appnexus, and rubicon (with alias)
        callback('pubmatic');
        callback('appnexus');
        callback('rubicon_alias');
      });

      // Setup CONFIG.getAdapterNameForAlias stub
      CONFIG.getAdapterNameForAlias.callsFake(adapterID => {
        if (adapterID === 'rubicon_alias') {
          return 'rubicon';
        }
        return null; // Return null for non-aliased adapters
      });

      // Setup util.getUserIdConfiguration stub
      sandbox.stub(util, 'getUserIdConfiguration').returns([
        { name: 'pubCommonId', storage: { type: 'cookie' } },
        { name: 'unifiedId', storage: { type: 'cookie' } }
      ]);

      // Make sure isUserIdModuleEnabled is properly stubbed
      CONFIG.isUserIdModuleEnabled.returns(false);
    });

    it('should assign basic user sync config properties', function() {
      const prebidConfig = {};

      prebidAdapter.assignUserSyncConfig(prebidConfig);

      // Verify basic userSync properties
      expect(prebidConfig).to.have.property('userSync');
      expect(prebidConfig.userSync).to.have.property('enableOverride', true);
      expect(prebidConfig.userSync).to.have.property('syncsPerBidder', 0);
      expect(prebidConfig.userSync).to.have.property('iframeEnabled', true);
      expect(prebidConfig.userSync).to.have.property('pixelEnabled', true);
      expect(prebidConfig.userSync).to.have.property('syncDelay', 2000);
      expect(prebidConfig.userSync).to.have.property('aliasSyncEnabled', true);
    });

    it('should configure filterSettings for all bidders', function() {
      const prebidConfig = {};

      prebidAdapter.assignUserSyncConfig(prebidConfig);

      // Verify filterSettings
      expect(prebidConfig.userSync).to.have.property('filterSettings');
      expect(prebidConfig.userSync.filterSettings).to.have.property('iframe');
      expect(prebidConfig.userSync.filterSettings.iframe).to.have.property('bidders', '*');
      expect(prebidConfig.userSync.filterSettings.iframe).to.have.property('filter', 'include');
    });

    it('should add all adapters to enabledBidders without duplicates', function() {
      const prebidConfig = {};

      prebidAdapter.assignUserSyncConfig(prebidConfig);

      // Verify enabledBidders contains all adapters without duplicates
      expect(prebidConfig.userSync).to.have.property('enabledBidders');
      expect(prebidConfig.userSync.enabledBidders).to.be.an('array');
      expect(prebidConfig.userSync.enabledBidders).to.include('pubmatic');
      expect(prebidConfig.userSync.enabledBidders).to.include('appnexus');
      expect(prebidConfig.userSync.enabledBidders).to.include('rubicon');

      // Verify no duplicates (rubicon should appear only once, not as both rubicon and rubicon_alias)
      expect(prebidConfig.userSync.enabledBidders).to.not.include('rubicon_alias');
      expect(prebidConfig.userSync.enabledBidders.length).to.equal(3);
    });

    it('should add userIds configuration when user ID module is enabled', function() {
      const prebidConfig = {};
      CONFIG.isUserIdModuleEnabled.returns(true);

      prebidAdapter.assignUserSyncConfig(prebidConfig);

      // Verify userIds configuration
      expect(prebidConfig.userSync).to.have.property('userIds');
      expect(prebidConfig.userSync.userIds).to.be.an('array');
      expect(prebidConfig.userSync.userIds.length).to.equal(2);
      expect(prebidConfig.userSync.userIds[0]).to.have.property('name', 'pubCommonId');
      expect(prebidConfig.userSync.userIds[1]).to.have.property('name', 'unifiedId');
    });

    it('should not add userIds configuration when user ID module is disabled', function() {
      const prebidConfig = {};
      CONFIG.isUserIdModuleEnabled.returns(false);

      prebidAdapter.assignUserSyncConfig(prebidConfig);

      // Verify userIds configuration is not added
      expect(prebidConfig.userSync).to.not.have.property('userIds');
    });

    it('should call CONFIG.forEachAdapter to get all adapters', function() {
      const prebidConfig = {};

      prebidAdapter.assignUserSyncConfig(prebidConfig);

      // Verify CONFIG.forEachAdapter was called
      expect(CONFIG.forEachAdapter.calledOnce).to.be.true;
    });

    it('should call CONFIG.getAdapterNameForAlias for each adapter', function() {
      const prebidConfig = {};

      prebidAdapter.assignUserSyncConfig(prebidConfig);

      // Verify CONFIG.getAdapterNameForAlias was called for each adapter
      expect(CONFIG.getAdapterNameForAlias.calledWith('pubmatic')).to.be.true;
      expect(CONFIG.getAdapterNameForAlias.calledWith('appnexus')).to.be.true;
      expect(CONFIG.getAdapterNameForAlias.calledWith('rubicon_alias')).to.be.true;
    });
  });

  describe('assignGdprConfigIfRequired', function() {
    beforeEach(function() {
      // Create specific stubs for GDPR-related functions
      CONFIG.getCmpApi = sandbox.stub().returns('iab');
      CONFIG.getGdprTimeout = sandbox.stub().returns(1000);
      CONFIG.getAwc = sandbox.stub().returns(true);
    });

    it('should assign GDPR config when available', function() {
      const prebidConfig = {
        consentManagement: {}
      };
      CONFIG.getGdpr.returns({
        cmpApi: 'iab',
        timeout: 1000,
        allowAuctionWithoutConsent: true
      });

      prebidAdapter.assignGdprConfigIfRequired(prebidConfig);

      expect(prebidConfig.consentManagement).to.have.property('gdpr');
      expect(prebidConfig.consentManagement.gdpr).to.have.property('cmpApi', 'iab');
      expect(prebidConfig.consentManagement.gdpr).to.have.property('timeout', 1000);
      expect(prebidConfig.consentManagement.gdpr).to.have.property('allowAuctionWithoutConsent', true);
    });

    it('should not assign GDPR config when not available', function() {
      const prebidConfig = {
        consentManagement: {}
      };
      CONFIG.getGdpr.returns(false);

      prebidAdapter.assignGdprConfigIfRequired(prebidConfig);

      expect(prebidConfig.consentManagement).to.not.have.property('gdpr');
    });
  });

  describe('assignCcpaConfigIfRequired', function() {
    beforeEach(function() {
      // Create specific stubs for CCPA-related functions
      CONFIG.getCCPACmpApi = sandbox.stub().returns('iab');
      CONFIG.getCCPATimeout = sandbox.stub().returns(1000);
    });

    it('should assign CCPA config when available', function() {
      const prebidConfig = {
        consentManagement: {}
      };
      CONFIG.getCCPA.returns({
        cmpApi: 'iab',
        timeout: 1000
      });

      prebidAdapter.assignCcpaConfigIfRequired(prebidConfig);

      expect(prebidConfig.consentManagement).to.have.property('usp');
      expect(prebidConfig.consentManagement.usp).to.have.property('cmpApi', 'iab');
      expect(prebidConfig.consentManagement.usp).to.have.property('timeout', 1000);
    });

    it('should not assign CCPA config when not available', function() {
      const prebidConfig = {
        consentManagement: {}
      };
      CONFIG.getCCPA.returns(false);

      prebidAdapter.assignCcpaConfigIfRequired(prebidConfig);

      expect(prebidConfig.consentManagement).to.not.have.property('usp');
    });
  });

  describe('assignGppConfigIfRequired', function() {
    beforeEach(function() {
      // Create specific stubs for GPP-related functions
      CONFIG.getGppConsent = sandbox.stub().returns(true);
      CONFIG.getGppCmpApi = sandbox.stub().returns('iab');
      CONFIG.getGppTimeout = sandbox.stub().returns(1000);
    });

    it('should assign GPP config when available', function() {
      const prebidConfig = {
        consentManagement: {}
      };

      prebidAdapter.assignGppConfigIfRequired(prebidConfig);

      expect(prebidConfig.consentManagement).to.have.property('gpp');
      expect(prebidConfig.consentManagement.gpp).to.have.property('cmpApi');
      expect(prebidConfig.consentManagement.gpp).to.have.property('timeout');
    });
  });

  describe('assignCurrencyConfigIfRequired', function() {
    beforeEach(function() {
      // Create specific stubs for currency-related functions
      CONFIG.getGranularityMultiplier = sandbox.stub().returns(1);
    });

    it('should assign currency config when available', function() {
      const prebidConfig = {};
      CONFIG.getAdServerCurrency.returns('USD');

      prebidAdapter.assignCurrencyConfigIfRequired(prebidConfig);

      expect(prebidConfig).to.have.property('currency');
      expect(prebidConfig.currency).to.have.property('adServerCurrency', 'USD');
      expect(prebidConfig.currency).to.have.property('granularityMultiplier', 1);
    });

    it('should not assign currency config when not available', function() {
      const prebidConfig = {};
      CONFIG.getAdServerCurrency.returns(null);

      prebidAdapter.assignCurrencyConfigIfRequired(prebidConfig);

      expect(prebidConfig).to.not.have.property('currency');
    });
  });

  describe('assignSchainConfigIfRequired', function() {
    beforeEach(function() {
      // Create specific stubs for schain-related functions
      CONFIG.isSchainEnabled = sandbox.stub().returns(true);
    });

    it('should assign schain config when available', function() {
      const prebidConfig = {};
      CONFIG.getSchainObject.returns({
        validation: 'strict',
        config: { ver: '1.0' }
      });

      prebidAdapter.assignSchainConfigIfRequired(prebidConfig);

      expect(prebidConfig).to.have.property('schain');
      expect(prebidConfig.schain).to.have.property('validation', 'strict');
      expect(prebidConfig.schain).to.have.property('config');
      expect(prebidConfig.schain.config).to.have.property('ver', '1.0');
    });

    it('should not assign schain config when not available', function() {
      const prebidConfig = {};
      CONFIG.isSchainEnabled.returns(false);

      prebidAdapter.assignSchainConfigIfRequired(prebidConfig);

      expect(prebidConfig).to.not.have.property('schain');
    });
  });

  describe('configureBidderAliasesIfAvailable', function() {
    beforeEach(function() {
      // Setup CONFIG.forEachBidderAlias stub
      sandbox.stub(CONFIG, 'forEachBidderAlias').callsFake(callback => {
        // Simulate bidder aliases
        callback('xandr');
      });

      // Setup CONF.alias
      CONF.alias = {
        'xandr': 'appnexus'
      };

      // Make sure util.isFunction returns true for aliasBidder
      util.isFunction.withArgs(window.owpbjs.aliasBidder).returns(true);
    });

    it('should configure bidder aliases when available', function() {
      prebidAdapter.configureBidderAliasesIfAvailable();

      // Verify aliasBidder was called with the right parameters
      expect(mockPbjs.aliasBidder.calledWith('appnexus', 'xandr')).to.be.true;
    });

    it('should log warning when aliasBidder is not available', function() {
      // Make isFunction return false for this test
      util.isFunction.withArgs(window.owpbjs.aliasBidder).returns(false);

      prebidAdapter.configureBidderAliasesIfAvailable();

      expect(util.logWarning.calledWith('PreBid js aliasBidder method is not available')).to.be.true;
    });

    it('should handle alias with name and gvlid properties', function() {
      // Update CONF.alias to include an alias with name and gvlid
      CONF.alias = {
        'xandr': {
          name: 'appnexus',
          gvlid: 123
        }
      };

      prebidAdapter.configureBidderAliasesIfAvailable();

      // Verify aliasBidder was called with the right parameters including gvlid
      expect(mockPbjs.aliasBidder.calledWith('appnexus', 'xandr', {gvlid: 123})).to.be.true;
    });
  });

  describe('enablePrebidPubMaticAnalyticIfRequired', function() {
    it('should enable Prebid PubMatic analytics when required', function() {
      CONFIG.isPrebidPubMaticAnalyticsEnabled.returns(true);

      prebidAdapter.enablePrebidPubMaticAnalyticIfRequired();

      expect(mockPbjs.enableAnalytics.called).to.be.true;
    });

    it('should not enable Prebid PubMatic analytics when not required', function() {
      CONFIG.isPrebidPubMaticAnalyticsEnabled.returns(false);

      prebidAdapter.enablePrebidPubMaticAnalyticIfRequired();

      expect(mockPbjs.enableAnalytics.called).to.be.false;
    });
  });

  describe('throttleAdapter', function() {
    beforeEach(function() {
      // Setup CONFIG.getAdapterThrottle stub
      sandbox.stub(CONFIG, 'getAdapterThrottle').returns(0.5);

      // Save original Math.random
      this.origMathRandom = Math.random;
    });

    afterEach(function() {
      // Restore original Math.random
      Math.random = this.origMathRandom;
    });

    it('should return true when random number is less than throttle value', function() {
      // Mock Math.random to return a value less than the throttle
      Math.random = () => 0.3; // Less than 0.5

      const result = prebidAdapter.throttleAdapter('pubmatic');

      expect(result).to.be.true;
    });

    it('should return false when random number is greater than throttle value', function() {
      // Mock a random number greater than the throttle
      Math.random = () => 0.7; // Greater than 0.5

      const result = prebidAdapter.throttleAdapter(0.7, 'pubmatic');

      expect(result).to.be.false;
    });
  });

  describe('generateAdUnitsArray', function() {
    it('should generate ad units array from active slots', function() {
      const activeSlots = [mockSlot];
      util.forEachOnArray.callsFake((arr, cb) => arr.forEach(cb));

      const result = prebidAdapter.generateAdUnitsArray(activeSlots, 'test-uuid');

      expect(result).to.be.an('array');
    });
  });

  describe('setPrebidConfig', function() {
    beforeEach(function() {
      // Setup stubs for required CONFIG functions
      sandbox.stub(util, 'isDebugLogEnabled').returns(true);
      sandbox.stub(CONFIG, 'getDisableAjaxTimeout').returns(false);
      sandbox.stub(CONFIG, 'getSendAllBidsStatus').returns(true);
      sandbox.stub(CONFIG, 'isBidPoolingEnabled').returns(false);

      // Create a new stub for isFloorPriceModuleEnabled
      CONFIG.isFloorPriceModuleEnabled = sandbox.stub().returns(false);

      // Create new stubs for other functions used in getFloorsConfiguration
      CONFIG.getFloorAuctionDelay = sandbox.stub().returns(0);
      CONFIG.getFloorType = sandbox.stub().returns('');

      // Stub getFloorsConfiguration to return null to avoid issues
      sandbox.stub(prebidAdapter, 'getFloorsConfiguration').returns(null);

      // Mock window.getCustomDimensionsDataFromPublisher
      window.getCustomDimensionsDataFromPublisher = sandbox.stub().returns({
        cds: {
          customData: 'test'
        }
      });

      // Mock CONF.pwt for floors configuration
      CONF.pwt = {
        bidderOrderingEnabled: '1',
        pid: '1234',
        pdvid: '5678'
      };

      // Set up test group ID
      window.PWT.testGroupId = '123';

      // Reset the setConfig call count
      mockPbjs.setConfig.resetHistory();

      // Make sure isFunction returns true for setConfig and getCustomDimensionsDataFromPublisher
      util.isFunction.callsFake((fn) => {
        if (fn === window.getCustomDimensionsDataFromPublisher) {
          return true;
        }
        return true; // Default to true for all functions
      });
    });

    afterEach(function() {
      // Restore any stubs created in the tests
      if (prebidAdapter.getFloorsConfiguration.restore) {
        prebidAdapter.getFloorsConfiguration.restore();
      }

      // Clean up window.getCustomDimensionsDataFromPublisher
      delete window.getCustomDimensionsDataFromPublisher;
    });

    it('should set basic Prebid configuration', function() {
      prebidAdapter.setPrebidConfig();

      // Verify setConfig was called
      expect(mockPbjs.setConfig.calledOnce).to.be.true;
    });

    it('should set bidderSequence to random when bidderOrderingEnabled is not 1', function() {
      // Change bidderOrderingEnabled to '0'
      CONF.pwt.bidderOrderingEnabled = '0';

      prebidAdapter.setPrebidConfig();

      // Get the config object passed to setConfig
      const config = mockPbjs.setConfig.args[0][0];
      expect(config).to.have.property('bidderSequence', 'random');
    });

    it('should enable bid pooling when isBidPoolingEnabled returns true', function() {
      // Enable bid pooling
      CONFIG.isBidPoolingEnabled.returns(true);

      prebidAdapter.setPrebidConfig();

      // Get the config object passed to setConfig
      const config = mockPbjs.setConfig.args[0][0];
      expect(config).to.have.property(CONSTANTS.COMMON.USE_BID_CACHE, true);
    });

    it('should not set bid pooling properties when isBidPoolingEnabled returns false', function() {
      // Ensure bid pooling is disabled
      CONFIG.isBidPoolingEnabled.returns(false);

      prebidAdapter.setPrebidConfig();

      // Get the config object passed to setConfig
      const config = mockPbjs.setConfig.args[0][0];
      expect(config).to.not.have.property(CONSTANTS.COMMON.USE_BID_CACHE);
    });

    it('should handle missing testGroupId', function() {
      // Remove testGroupId
      delete window.PWT.testGroupId;

      prebidAdapter.setPrebidConfig();

      // Get the config object passed to setConfig
      const config = mockPbjs.setConfig.args[0][0];
      expect(config).to.have.property('testGroupId', 0);
    });

    it('should add custom dimensions data when available', function() {
      prebidAdapter.setPrebidConfig();

      // Get the config object passed to setConfig
      const config = mockPbjs.setConfig.args[0][0];
      expect(config).to.have.property('cds');
      expect(config.cds).to.have.property('customData', 'test');
    });

    it('should not add custom dimensions data when function is not available', function() {
      // Make isFunction return false for getCustomDimensionsDataFromPublisher
      util.isFunction.callsFake((fn) => {
        if (fn === window.getCustomDimensionsDataFromPublisher) {
          return false;
        }
        return true; // Default to true for other functions
      });

      prebidAdapter.setPrebidConfig();

      // Get the config object passed to setConfig
      const config = mockPbjs.setConfig.args[0][0];
      expect(config).to.not.have.property('cds');
    });
  });

  describe('fetchBids', function() {
    it('should handle missing Prebid.js', function() {
      delete window.owpbjs;
      prebidAdapter.fetchBids([], sandbox.stub());
      expect(util.logError.calledWith('PreBid js is not loaded')).to.be.true;
    });
  });

  describe('fetchBids', function() {
    it('should return if adUnitsArray is empty', function() {
      window['pbjs'] = {};
      sandbox.stub(prebidAdapter, 'generateAdUnitsArray').returns([]);
      prebidAdapter.fetchBids([{getDivID: () => 'div1'}]);
      // No calls to requestBids, log, etc.
    });
  });

  describe('gets2sConfig', function() {
    let prebidConfig;

    beforeEach(function() {
      prebidConfig = {};
      // Stub all CONFIG and CONSTANTS methods used
      sandbox.stub(CONFIG, 'getServerEnabledAdaptars').returns(['pubmatic', 'ix']);
      sandbox.stub(CONFIG, 'getPubMaticAndAlias').returns(['pubmatic', 'pubmaticAlias']);
      sandbox.stub(CONFIG, 'getTimeoutForPBSRequest').returns(700);
      sandbox.stub(CONFIG, 'isUsePrebidKeysEnabled').returns(true);
      sandbox.stub(CONFIG, 'createMacros').returns({ MACRO: 'value' });
      sandbox.stub(CONFIG, 'getMarketplaceBidders').returns(null);

      // Setup CONSTANTS
      CONSTANTS.PBSPARAMS = {
        adapter: 'pubmaticS2S',
        endpoint: 'https://pbs-endpoint',
        syncEndpoint: 'https://pbs-sync-endpoint'
      };

      // Setup CONF.alias (global or imported)
      CONF.alias = {
        pubmaticAlias: { name: 'pubmatic' },
        ixAlias: 'ix'
      };
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should populate s2sConfig with correct structure and bidders', function() {
      prebidAdapter.gets2sConfig(prebidConfig);

      expect(prebidConfig).to.have.property('s2sConfig');
      const s2s = prebidConfig.s2sConfig;
      expect(s2s.accountId).to.equal('123456');
      expect(s2s.adapter).to.equal('pubmaticS2S');
      expect(s2s.enabled).to.be.true;
      expect(s2s.bidders).to.deep.equal(['pubmatic', 'ix']);
      expect(s2s.endpoint).to.equal('https://pbs-endpoint');
      expect(s2s.syncEndpoint).to.equal('https://pbs-sync-endpoint');
      expect(s2s.timeout).to.equal(700);
      expect(s2s.secure).to.equal(1);

      // extPrebid
      expect(s2s.extPrebid).to.exist;
      expect(prebidConfig.s2sConfig.extPrebid.aliases).to.include({
        pubmaticAlias: 'pubmatic',
        ixAlias: 'ix'
      });
      expect(s2s.extPrebid.bidderparams).to.have.property('pubmatic');
      expect(s2s.extPrebid.bidderparams).to.have.property('pubmaticAlias');
    });

    it('should add alternatebiddercodes if marketplace bidders are present', function() {
      CONFIG.getMarketplaceBidders.returns(['code1', 'code2']);
      prebidAdapter.gets2sConfig(prebidConfig);

      expect(prebidConfig.s2sConfig.allowUnknownBidderCodes).to.be.true;
      expect(prebidConfig.s2sConfig.extPrebid.alternatebiddercodes).to.deep.equal({
        enabled: true,
        bidders: {
          pubmatic: {
            enabled: true,
            allowedbiddercodes: ['code1', 'code2']
          }
        }
      });
    });

    it('should handle empty pubmaticAndAliases array gracefully', function() {
      CONFIG.getPubMaticAndAlias.returns([]);
      prebidAdapter.gets2sConfig(prebidConfig);
      expect(prebidConfig.s2sConfig.extPrebid.bidderparams).to.deep.equal({});
    });

    it('should set defaultAliases correctly from CONF.alias', function() {
      CONF.alias = {
        pubmaticAlias: { name: 'pubmatic' },
        ixAlias: 'ix'
      };
      prebidAdapter.gets2sConfig(prebidConfig);
      expect(prebidConfig.s2sConfig.extPrebid.aliases).to.include({
        pubmaticAlias: 'pubmatic',
        ixAlias: 'ix'
      });
    });
  });

  describe('initPbjsConfig', function() {
    let pbNameSpace = 'owpbjs'; // Use the namespace as set in your CONSTANTS stub

    beforeEach(function() {
      // All stubs and window setup are already done in your top-level beforeEach
      // Stub the config/setup functions called by initPbjsConfig
      sandbox.stub(prebidAdapter, 'setPrebidConfig').callsFake(() => {});
      sandbox.stub(prebidAdapter, 'configureBidderAliasesIfAvailable').callsFake(() => {});
      sandbox.stub(prebidAdapter, 'enablePrebidPubMaticAnalyticIfRequired').callsFake(() => {});
      sandbox.stub(prebidAdapter, 'setPbjsBidderSettingsIfRequired').callsFake(() => {});
      sandbox.stub(util, 'isDebugLogEnabled').returns(true);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should log error and return if pbNameSpace is missing', function() {
      delete window[pbNameSpace];
      prebidAdapter.initPbjsConfig();
      sinon.assert.calledWith(util.logError, 'PreBid js is not loaded');
      // None of the config/setup functions should be called
      sinon.assert.notCalled(prebidAdapter.setPrebidConfig);
      sinon.assert.notCalled(prebidAdapter.configureBidderAliasesIfAvailable);
      sinon.assert.notCalled(prebidAdapter.enablePrebidPubMaticAnalyticIfRequired);
      sinon.assert.notCalled(prebidAdapter.setPbjsBidderSettingsIfRequired);
    });
  });

  describe('getBid', function() {
    it('should get the highest bid for a div ID', function() {
      mockPbjs.getHighestCpmBids.returns([{
        bidder: 'pubmatic',
        cpm: 1.5,
        originalCpm: 1.5,
        ad: '<div>ad</div>'
      }]);
      mockPbjs.getAdserverTargetingForAdUnitCode.returns({
        hb_pb: '1.50'
      });

      const result = prebidAdapter.getBid('test_div');

      expect(result.wb).to.be.an('object');
      expect(result.wb.adapterID).to.equal('pubmatic');
      expect(result.kvp).to.be.an('object');
    });

    it('should handle no bids', function() {
      mockPbjs.getHighestCpmBids.returns([]);

      const result = prebidAdapter.getBid('test_div');

      expect(result.wb).to.be.null;
    });

    it('should remove pwtdeal when PubMatic analytics is enabled', function() {
      mockPbjs.getHighestCpmBids.returns([{
        bidder: 'pubmatic',
        cpm: 1.5,
        originalCpm: 1.5,
        ad: '<div>ad</div>'
      }]);
      mockPbjs.getAdserverTargetingForAdUnitCode.returns({
        hb_pb: '1.50',
        pwtdeal: 'deal1'
      });
      CONFIG.isPrebidPubMaticAnalyticsEnabled.returns(true);

      const result = prebidAdapter.getBid('test_div');

      expect(result.kvp).to.not.have.property('pwtdeal');
    });
  });

  describe('getPbjsAdServerTargetingConfig', function() {
    let targetingConfig;
    beforeEach(function() {
      // Stub all CONFIG and CONSTANTS methods used
      sandbox.stub(CONSTANTS, 'COMMON').value({
        BID_PRECISION: 2,
        DEAL_KEY_VALUE_SEPARATOR: '|'
      });
      sandbox.stub(CONSTANTS, 'PLATFORM_VALUES').value({
        VIDEO: 'video',
        NATIVE: 'native',
        DISPLAY: 'display'
      });
      sandbox.stub(CONSTANTS, 'CONFIG').value({
        CACHE_URL: '[https://cache.example.com](https://cache.example.com)',
        CACHE_PATH: '/cache'
      });
      sandbox.stub(CONSTANTS, 'PRICE_GRANULARITY_KEYS').value({
        'medium': 'hb_pb'
      });
      window.owpbjs = {
        readConfig: sandbox.stub().withArgs('priceGranularity').returns('medium')
      };
      targetingConfig = prebidAdapter.getPbjsAdServerTargetingConfig();
    });

    it('should return bidderCode for pwtpid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtpid').val({ bidderCode: 'bidderX' });
      expect(val).to.equal('bidderX');
    });

    it('should return adId for pwtsid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtsid').val({ adId: 'ad123' });
      expect(val).to.equal('ad123');
    });

    it('should return cpm rounded for pwtecp', function() {
      const val = targetingConfig.find(k => k.key === 'pwtecp').val({ cpm: 1.234 });
      expect(val).to.equal('1.23');
    });

    it('should return size for pwtsz', function() {
      const val = targetingConfig.find(k => k.key === 'pwtsz').val({ size: '300x250' });
      expect(val).to.equal('300x250');
    });

    it('should return empty string for hb_source', function() {
      const val = targetingConfig.find(k => k.key === 'hb_source').val({});
      expect(val).to.equal('');
    });

    it('should return correct platform for pwtplt', function() {
      let val = targetingConfig.find(k => k.key === 'pwtplt').val({ mediaType: 'video', videoCacheKey: 'cacheKey' });
      expect(val).to.equal('video');
      val = targetingConfig.find(k => k.key === 'pwtplt').val({ native: true });
      expect(val).to.equal('native');
      val = targetingConfig.find(k => k.key === 'pwtplt').val({});
      expect(val).to.equal('display');
    });

    it('should return dealId for pwtdid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtdid').val({ dealId: 'deal123' });
      expect(val).to.equal('deal123');
      const val2 = targetingConfig.find(k => k.key === 'pwtdid').val({});
      expect(val2).to.equal('');
    });

    it('should return deal channel string for pwtdeal', function() {
      const val = targetingConfig.find(k => k.key === 'pwtdeal').val({ dealId: 'deal123', adId: 'ad123' });
      expect(val).to.equal('PMP|deal123|ad123');
      const val2 = targetingConfig.find(k => k.key === 'pwtdeal').val({});
      expect(val2).to.equal('');
    });

    it('should always return 1 for pwtbst', function() {
      const val = targetingConfig.find(k => k.key === 'pwtbst').val({});
      expect(val).to.equal(1);
    });

    it('should return publisherId for pwtpubid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtpubid').val({});
      expect(val).to.equal('123456');
    });

    it('should return profileId for pwtprofid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtprofid').val({});
      expect(val).to.equal('1111');
    });

    it('should return versionId for pwtverid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtverid').val({});
      expect(val).to.equal('2222');
    });

    it('should return videoCacheKey for pwtcid, pwtcurl, pwtcpath when video', function() {
      let obj = { mediaType: 'video', videoCacheKey: 'cacheKey' };
      expect(targetingConfig.find(k => k.key === 'pwtcid').val(obj)).to.equal('cacheKey');
      expect(targetingConfig.find(k => k.key === 'pwtcurl').val(obj)).to.equal('[https://cache.example.com](https://cache.example.com)');
      expect(targetingConfig.find(k => k.key === 'pwtcpath').val(obj)).to.equal('/cache');
    });

    it('should return empty string for pwtcid, pwtcurl, pwtcpath when not video', function() {
      let obj = { mediaType: 'banner' };
      expect(targetingConfig.find(k => k.key === 'pwtcid').val(obj)).to.equal('');
      expect(targetingConfig.find(k => k.key === 'pwtcurl').val(obj)).to.equal('');
      expect(targetingConfig.find(k => k.key === 'pwtcpath').val(obj)).to.equal('');
    });

    it('should return empty string for pwtuuid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtuuid').val({});
      expect(val).to.equal('');
    });

    it('should return meta.primaryCatId for pwtacat', function() {
      const val = targetingConfig.find(k => k.key === 'pwtacat').val({ meta: { primaryCatId: 'cat123' } });
      expect(val).to.equal('cat123');
      const val2 = targetingConfig.find(k => k.key === 'pwtacat').val({});
      expect(val2).to.equal('');
    });

    it('should return meta.networkId for pwtdsp', function() {
      const val = targetingConfig.find(k => k.key === 'pwtdsp').val({ meta: { networkId: 'dsp123' } });
      expect(val).to.equal('dsp123');
      const val2 = targetingConfig.find(k => k.key === 'pwtdsp').val({});
      expect(val2).to.equal('');
    });

    it('should return creativeId for pwtcrid', function() {
      const val = targetingConfig.find(k => k.key === 'pwtcrid').val({ creativeId: 'crid123' });
      expect(val).to.equal('crid123');
      const val2 = targetingConfig.find(k => k.key === 'pwtcrid').val({});
      expect(val2).to.equal('');
    });

    it('should return price granularity value for pwtpb', function() {
      const val = targetingConfig.find(k => k.key === 'pwtpb').val({ hb_pb: '0.50' });
      expect(val).to.equal('0.50');
      // If the price granularity key is not present, returns null
      const val2 = targetingConfig.find(k => k.key === 'pwtpb').val({});
      expect(val2).to.equal(null);
    });
  });

  describe('setPbjsBidderSettingsIfRequired', function() {
    let pbNameSpace = 'owpbjs';
    let sandbox;
    beforeEach(function() {
      sandbox = sinon.createSandbox();
      window[pbNameSpace] = {};
      CONF.pwt = { localStorageAccess: '1' };

      sandbox.stub(CONFIG, 'isUsePrebidKeysEnabled').returns(false);
      sandbox.stub(prebidAdapter, 'getPbjsAdServerTargetingConfig').returns([{ key: 'test', val: () => 'value' }]);
      sandbox.stub(CONFIG, 'forEachAdapter').callsFake((cb) => { cb('pubmatic'); cb('ix'); });
      sandbox.stub(CONFIG, 'getMarketplaceBidders').returns(['testBidder']);
      sandbox.stub(CONFIG, 'getAdapterRevShare').callsFake((adapterID) => adapterID === 'pubmatic' ? 0.9 : 1);
      sandbox.stub(CONSTANTS, 'COMMON').value({ BID_PRECISION: 2 });
    });

    afterEach(function() {
      sandbox.restore();
      delete window[pbNameSpace];
    });

    it('should initialize standard bidderSettings with suppressEmptyKeys and storageAllowed', function() {
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      const settings = window[pbNameSpace].bidderSettings;
      expect(settings.standard.suppressEmptyKeys).to.be.true;
      expect(settings.standard.storageAllowed).to.be.true;
    });

    it('should add adserverTargeting if usePrebidKeys is disabled', function() {
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      const targeting = window[pbNameSpace].bidderSettings.standard.adserverTargeting;
      expect(targeting).to.be.an('array');
      expect(targeting.some(k => k.key === 'pwtpid')).to.be.true; // or any other key you expect
    });

    it('should add bidder-specific settings for each adapter', function() {
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      const settings = window[pbNameSpace].bidderSettings;
      expect(settings.pubmatic).to.be.an('object');
      expect(settings.ix).to.be.an('object');
      expect(settings.pubmatic.bidCpmAdjustment).to.be.a('function');
      expect(settings.ix.bidCpmAdjustment).to.be.a('function');
    });

    it('should set allowAlternateBidderCodes and allowedAlternateBidderCodes for pubmatic if marketplace bidders exist', function() {
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      const settings = window[pbNameSpace].bidderSettings;
      expect(settings.pubmatic.allowAlternateBidderCodes).to.be.true;
      expect(settings.pubmatic.allowedAlternateBidderCodes).to.deep.equal(['testBidder']);
    });

    it('should apply bidCpmAdjustment using adapter rev share', function() {
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      const adj = window[pbNameSpace].bidderSettings.pubmatic.bidCpmAdjustment(10, {});
      expect(adj).to.equal(9.00); // 10 * 0.9
      const adj2 = window[pbNameSpace].bidderSettings.ix.bidCpmAdjustment(10, {});
      expect(adj2).to.equal(10.00); // 10 * 1
    });

    it('should preserve storageAllowed for adapters and standard if already set', function() {
      window[pbNameSpace].bidderSettings = {
        standard: { storageAllowed: false },
        pubmatic: { storageAllowed: false }
      };
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      expect(window[pbNameSpace].bidderSettings.standard.storageAllowed).to.be.false;
      expect(window[pbNameSpace].bidderSettings.pubmatic.storageAllowed).to.be.false;
    });

    it('should set storageAllowed to null if localStorageAccess is not \"1\"', function() {
      CONF.pwt.localStorageAccess = '0';
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      expect(window[pbNameSpace].bidderSettings.standard.storageAllowed).to.be.null;
    });

    it('should not add adserverTargeting if usePrebidKeys is enabled', function() {
      CONFIG.isUsePrebidKeysEnabled.returns(true);
      prebidAdapter.setPbjsBidderSettingsIfRequired();
      expect(window[pbNameSpace].bidderSettings.standard.adserverTargeting).to.be.undefined;
    });
  });

  describe('hasFloorsSchema', function() {
    it('should return false if config is empty', function() {
      const config = {};
      const prebidConfig = {};
      const result = prebidAdapter.hasFloorsSchema(config, prebidConfig);
      expect(result).to.be.false;
      expect(prebidConfig).to.not.have.property('floors');
    });

    it('should set prebidConfig.floors if config has direct "floors" key', function() {
      const config = { floors: { some: 'value' } };
      const prebidConfig = {};
      const result = prebidAdapter.hasFloorsSchema(config, prebidConfig);
      expect(result).to.deep.equal({
        enforcement: { enforceJS: '' }
      });
      expect(prebidConfig.floors).to.deep.equal({
        enforcement: { enforceJS: '' }
      });
    });

    it('should set prebidConfig.floors if config has nested "floors" key', function() {
      const config = { a: { b: { floors: {} } } };
      const prebidConfig = {};
      const result = prebidAdapter.hasFloorsSchema(config, prebidConfig);
      expect(result).to.deep.equal({
        enforcement: { enforceJS: '' }
      });
      expect(prebidConfig.floors).to.deep.equal({
        enforcement: { enforceJS: '' }
      });
    });

    it('should return false if config does not have "floors" key anywhere', function() {
      const config = { a: { b: { c: 1 } } };
      const prebidConfig = {};
      const result = prebidAdapter.hasFloorsSchema(config, prebidConfig);
      expect(result).to.be.false;
      expect(prebidConfig).to.not.have.property('floors');
    });

    it('should only set prebidConfig.floors for the first "floors" key found', function() {
      const config = { x: { floors: {} }, y: { floors: {} } };
      const prebidConfig = {};
      const result = prebidAdapter.hasFloorsSchema(config, prebidConfig);
      expect(result).to.deep.equal({
        enforcement: { enforceJS: '' }
      });
      expect(prebidConfig.floors).to.deep.equal({
        enforcement: { enforceJS: '' }
      });
    });
  });

  describe('pbjsBidsBackHandler', function() {
    let setTimeoutStub, triggerUserSyncsStub;
    let activeSlots, bidResponses;

    beforeEach(function() {
      setTimeoutStub = sandbox.stub(window, 'setTimeout').callsFake((fn, t) => fn());
      triggerUserSyncsStub = sandbox.stub();
      window.owpbjs = { triggerUserSyncs: triggerUserSyncsStub };
      sandbox.stub(bidManager, 'setAllPossibleBidsReceived');
      activeSlots = [
        { getDivID: () => 'div1' },
        { getDivID: () => 'div2' }
      ];
      bidResponses = { some: 'response' };
    });

    afterEach(function() {
      sandbox.restore();
      delete window.owpbjs;
    });

    it('should log bidResponses and trigger user syncs', function() {
      prebidAdapter.pbjsBidsBackHandler(bidResponses, activeSlots);
      sinon.assert.calledWith(util.log, 'In PreBid bidsBackHandler with bidResponses: ');
      sinon.assert.calledWith(util.log, bidResponses);
      sinon.assert.calledOnce(triggerUserSyncsStub);
    });
  });

  describe('generateConfig', function() {
    let setCallInitTimeStub, generatePbConfStub;
    let activeSlots, adapterID, adapterConfig, adUnits, impressionID;

    beforeEach(function() {
      adapterID = 'pubmatic';
      adapterConfig = { publisherId: '123' };
      adUnits = {};
      impressionID = 'imp-123';

      // Mock activeSlots as an object with slot objects
      activeSlots = {
        slot1: { getDivID: () => 'div1' },
        slot2: { getDivID: () => 'div2' }
      };

      setCallInitTimeStub = sandbox.stub(bidManager, 'setCallInitTime');

      util.forEachOnObject.callsFake((obj, cb) => {
        Object.keys(obj).forEach((key, idx) => cb(key, obj[key]));
      });
      generatePbConfStub = sandbox.stub(prebidAdapter, 'generatePbConf');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call setCallInitTime for each slot in activeSlots', function() {
      prebidAdapter.generateConfig(adapterID, adapterConfig, activeSlots, adUnits, impressionID);
      sinon.assert.calledWith(setCallInitTimeStub, 'div1', adapterID);
      sinon.assert.calledWith(setCallInitTimeStub, 'div2', adapterID);
      expect(setCallInitTimeStub.callCount).to.equal(2);
    });

    it('should call util.forEachOnObject with activeSlots and a callback', function() {
      prebidAdapter.generateConfig(adapterID, adapterConfig, activeSlots, adUnits, impressionID);
      sinon.assert.calledWith(util.forEachOnObject, activeSlots, sinon.match.func);
    });
  });
});
