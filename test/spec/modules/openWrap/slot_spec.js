import { Slot, createSlot } from '../../../../modules/openWrap/slot.js';
import * as CONSTANTS from '../../../../modules/openWrap/constants.js';

describe('OpenWrap Core Module: slot.js', function () {
  const TEST_SLOT_NAME = 'test_slot';
  let slot;

  beforeEach(function () {
    slot = new Slot(TEST_SLOT_NAME);
  });

  describe('Constructor', function () {
    it('should initialize slot with correct default values', function () {
      expect(slot.name).to.equal(TEST_SLOT_NAME);
      expect(slot.status).to.equal(CONSTANTS.SLOT_STATUS.CREATED);
      expect(slot.divID).to.equal('');
      expect(slot.adUnitID).to.equal('');
      expect(slot.adUnitIndex).to.equal(0);
      expect(slot.sizes).to.deep.equal([]);
      expect(slot.keyValues).to.deep.equal({});
      expect(slot.arguments).to.deep.equal([]);
      expect(slot.pubAdServerObject).to.be.null;
      expect(slot.displayFunctionCalled).to.be.false;
      expect(slot.refreshFunctionCalled).to.be.false;
    });
  });

  describe('Basic Getters and Setters', function () {
    it('getName should return correct name', function () {
      expect(slot.getName()).to.equal(TEST_SLOT_NAME);
    });

    it('setStatus and getStatus should work correctly', function () {
      const testStatus = CONSTANTS.SLOT_STATUS.DISPLAYED;
      expect(slot.setStatus(testStatus)).to.equal(slot);
      expect(slot.getStatus()).to.equal(testStatus);
    });

    it('setDivID and getDivID should work correctly', function () {
      const testDivId = 'test_div_id';
      expect(slot.setDivID(testDivId)).to.equal(slot);
      expect(slot.getDivID()).to.equal(testDivId);
    });

    it('setAdUnitID and getAdUnitID should work correctly', function () {
      const testAdUnitId = 'test_ad_unit_id';
      expect(slot.setAdUnitID(testAdUnitId)).to.equal(slot);
      expect(slot.getAdUnitID()).to.equal(testAdUnitId);
    });

    it('setAdUnitIndex and getAdUnitIndex should work correctly', function () {
      const testIndex = 5;
      expect(slot.setAdUnitIndex(testIndex)).to.equal(slot);
      expect(slot.getAdUnitIndex()).to.equal(testIndex);
    });

    it('setSizes and getSizes should work correctly', function () {
      const testSizes = [[300, 250], [300, 600]];
      expect(slot.setSizes(testSizes)).to.equal(slot);
      expect(slot.getSizes()).to.deep.equal(testSizes);
    });
  });

  describe('Key Value Management', function () {
    it('setKeyValue should add individual key-value pairs', function () {
      expect(slot.setKeyValue('key1', 'value1')).to.equal(slot);
      expect(slot.setKeyValue('key2', 'value2')).to.equal(slot);
      expect(slot.getkeyValues()).to.deep.equal({
        key1: 'value1',
        key2: 'value2'
      });
    });

    it('setKeyValues should replace all key-values', function () {
      const testKeyValues = { test1: 'value1', test2: 'value2' };
      expect(slot.setKeyValues(testKeyValues)).to.equal(slot);
      expect(slot.getkeyValues()).to.deep.equal(testKeyValues);
    });

    it('setKeyValues should override previous key-values', function () {
      slot.setKeyValue('key1', 'value1');
      const newKeyValues = { newKey: 'newValue' };
      slot.setKeyValues(newKeyValues);
      expect(slot.getkeyValues()).to.deep.equal(newKeyValues);
    });
  });

  describe('Arguments Management', function () {
    it('setArguments and getArguments should work correctly', function () {
      const testArgs = ['arg1', 'arg2'];
      expect(slot.setArguments(testArgs)).to.equal(slot);
      expect(slot.getArguments()).to.deep.equal(testArgs);
    });
  });

  describe('PubAdServer Object Management', function () {
    it('setPubAdServerObject and getPubAdServerObject should work correctly', function () {
      const testObject = { test: 'value' };
      expect(slot.setPubAdServerObject(testObject)).to.equal(slot);
      expect(slot.getPubAdServerObject()).to.equal(testObject);
    });
  });

  describe('Display and Refresh Function Status', function () {
    it('setDisplayFunctionCalled and isDisplayFunctionCalled should work correctly', function () {
      expect(slot.setDisplayFunctionCalled(true)).to.equal(slot);
      expect(slot.isDisplayFunctionCalled()).to.be.true;
    });

    it('setRefreshFunctionCalled and isRefreshFunctionCalled should work correctly', function () {
      expect(slot.setRefreshFunctionCalled(true)).to.equal(slot);
      expect(slot.isRefreshFunctionCalled()).to.be.true;
    });
  });

  describe('Status Update After Rendering', function () {
    beforeEach(function () {
      slot.setArguments(['test_arg']);
      slot.setDisplayFunctionCalled(true);
      slot.setRefreshFunctionCalled(true);
    });

    it('should update status correctly after display', function () {
      slot.updateStatusAfterRendering(false);
      
      expect(slot.getStatus()).to.equal(CONSTANTS.SLOT_STATUS.DISPLAYED);
      expect(slot.getArguments()).to.deep.equal([]);
      expect(slot.isDisplayFunctionCalled()).to.be.false;
      expect(slot.isRefreshFunctionCalled()).to.be.true;
    });

    it('should update status correctly after refresh', function () {
      slot.updateStatusAfterRendering(true);
      
      expect(slot.getStatus()).to.equal(CONSTANTS.SLOT_STATUS.DISPLAYED);
      expect(slot.getArguments()).to.deep.equal([]);
      expect(slot.isDisplayFunctionCalled()).to.be.true;
      expect(slot.isRefreshFunctionCalled()).to.be.false;
    });
  });

  describe('Factory Function', function () {
    it('createSlot should return new Slot instance', function () {
      const newSlot = createSlot(TEST_SLOT_NAME);
      expect(newSlot).to.be.instanceof(Slot);
      expect(newSlot.getName()).to.equal(TEST_SLOT_NAME);
    });
  });
});