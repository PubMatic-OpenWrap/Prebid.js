import { expect } from 'chai';
import sinon from 'sinon';
import { submodule } from '../../../src/hook.js';
import * as utils from '../../../src/utils.js';
import { pubmaticSubmodule } from '../../../modules/pubmaticRtdProvider.js';
import { FloorProvider } from '../../../libraries/pubmaticUtils/plugins/floorProvider.js';
import { UnifiedPricingRule } from '../../../libraries/pubmaticUtils/plugins/unifiedPricingRule.js';

describe('Pubmatic RTD Provider', () => {
  let sandbox;
  let fetchStub;
  let pluginManagerStub;
  let configJsonManagerStub;
  let logErrorStub;
  let originalPluginManager;
  let originalConfigJsonManager;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub(window, 'fetch');

    // Create stubs
    logErrorStub = sinon.stub(utils, 'logError');
    pluginManagerStub = {
      initialize: sinon.stub(),
      executeHook: sinon.stub(),
      register: sinon.stub()
    };

    configJsonManagerStub = {
      fetchConfig: sinon.stub(),
      getYMConfig: sinon.stub(),
      getConfigByName: sinon.stub(),
      get country() { return 'IN'; }
    };

    // Store original implementations
    originalPluginManager = window.PluginManager;
    originalConfigJsonManager = window.ConfigJsonManager;

    // Replace window objects
    window.PluginManager = pluginManagerStub;
    window.ConfigJsonManager = () => configJsonManagerStub;

    // Register plugins
    pluginManagerStub.register('dynamicFloors', FloorProvider);
    pluginManagerStub.register('unifiedPricingRule', UnifiedPricingRule);
  });

  afterEach(() => {
    sandbox.restore();
    // Restore original implementations
    window.PluginManager = originalPluginManager;
    window.ConfigJsonManager = originalConfigJsonManager;
  });

  describe('init', () => {
    const validConfig = {
      params: {
        publisherId: 'test-publisher-id',
        profileId: 'test-profile-id'
      }
    };

    it('should return false if publisherId is missing', () => {
      const config = {
        params: {
          profileId: 'test-profile-id'
        }
      };
      const result = pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticSubmodule.CONSTANTS.LOG_PRE_FIX} Missing publisher Id.`);
    });

    it('should return false if publisherId is not a string', () => {
      const config = {
        params: {
          publisherId: 123,
          profileId: 'test-profile-id'
        }
      };
      const result = pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticSubmodule.CONSTANTS.LOG_PRE_FIX} Publisher Id should be a string.`);
    });

    it('should return false if profileId is missing', () => {
      const config = {
        params: {
          publisherId: 'test-publisher-id'
        }
      };
      const result = pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticSubmodule.CONSTANTS.LOG_PRE_FIX} Missing profile Id.`);
    });

    it('should return false if profileId is not a string', () => {
      const config = {
        params: {
          publisherId: 'test-publisher-id',
          profileId: 345
        }
      };
      const result = pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticSubmodule.CONSTANTS.LOG_PRE_FIX} Profile Id should be a string.`);
    });

    it('should initialize successfully with valid config', () => {
      configJsonManagerStub.fetchConfig.resolves(true);
      pluginManagerStub.initialize.resolves();

      const result = pubmaticSubmodule.init(validConfig);
      expect(result).to.be.true;
      expect(configJsonManagerStub.fetchConfig.calledOnce).to.be.true;
      expect(configJsonManagerStub.fetchConfig.firstCall.args[0]).to.equal('test-publisher-id');
      expect(configJsonManagerStub.fetchConfig.firstCall.args[1]).to.equal('test-profile-id');
      expect(pluginManagerStub.initialize.calledOnce).to.be.true;
      expect(pluginManagerStub.initialize.firstCall.args[0]).to.deep.equal(configJsonManagerStub);
    });

    it('should handle config fetch error gracefully', () => {
      configJsonManagerStub.fetchConfig.resolves(false);
      pluginManagerStub.initialize.resolves();

      const result = pubmaticSubmodule.init(validConfig);
      expect(result).to.be.true;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticSubmodule.CONSTANTS.LOG_PRE_FIX} Failed to fetch configuration`);
    });
  });

  describe('getBidRequestData', () => {
    const adUnitCodes = ['div-1', 'div-2'];
    const config = {
      params: {
        publisherId: 'test-publisher-id',
        profileId: 'test-profile-id'
      }
    };
    const userConsent = {};
    const auction = {};
    const reqBidsConfigObj = {
      ortb2Fragments: {
        bidder: {}
      },
      adUnits: [
        {
          code: 'div-1',
          bids: [{ bidder: 'pubmatic', params: {} }]
        },
        {
          code: 'div-2',
          bids: [{ bidder: 'pubmatic', params: {} }]
        }
      ]
    };
    const callback = sinon.stub();

    it('should call pluginManager executeHook with correct parameters', () => {
      pluginManagerStub.executeHook.resolves();

      pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(pluginManagerStub.executeHook.calledOnce).to.be.true;
      expect(pluginManagerStub.executeHook.firstCall.args[0]).to.equal('processBidRequest');
      expect(pluginManagerStub.executeHook.firstCall.args[1]).to.deep.equal(reqBidsConfigObj);
      expect(callback.calledOnce).to.be.true;
    });

    it('should handle plugin error gracefully', () => {
      pluginManagerStub.executeHook.rejects('Plugin error');

      pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticSubmodule.CONSTANTS.LOG_PRE_FIX} Error in updating floors :`);
      expect(logErrorStub.firstCall.args[1]).to.equal('Plugin error');
      expect(callback.calledOnce).to.be.true;
    });

    it('should add country information to ORTB2', () => {
      pluginManagerStub.executeHook.resolves();

      pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(reqBidsConfigObj.ortb2Fragments.bidder[pubmaticSubmodule.CONSTANTS.SUBMODULE_NAME]).to.deep.equal({
        user: {
          ext: {
            ctr: 'IN'
          }
        }
      });
    });
  });

  describe('getTargetingData', () => {
    const adUnitCodes = ['div-1', 'div-2'];
    const config = {
      params: {
        publisherId: 'test-publisher-id',
        profileId: 'test-profile-id'
      }
    };
    const userConsent = {};
    const auction = {};
    const unifiedPricingRule = {
      'div-1': { key1: 'value1' },
      'div-2': { key2: 'value2' }
    };

    it('should return unified pricing rule targeting', () => {
      pluginManagerStub.executeHook.returns({
        'unifiedPricingRule': unifiedPricingRule
      });

      const result = pubmaticSubmodule.getTargetingData(adUnitCodes, config, userConsent, auction);
      expect(result).to.deep.equal(unifiedPricingRule);
    });

    it('should return empty object if no targeting data', () => {
      pluginManagerStub.executeHook.returns({});

      const result = pubmaticSubmodule.getTargetingData(adUnitCodes, config, userConsent, auction);
      expect(result).to.deep.equal({});
    });

    it('should handle plugin execution errors', () => {
      pluginManagerStub.executeHook.throws(new Error('Plugin error'));

      const result = pubmaticSubmodule.getTargetingData(adUnitCodes, config, userConsent, auction);
      expect(result).to.deep.equal({});
    });
  });
});
