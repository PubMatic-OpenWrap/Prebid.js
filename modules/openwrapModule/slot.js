import * as CONSTANTS from './constants.js';

class Slot {
  constructor(name) {
    this.name = name;
    this.status = CONSTANTS.SLOT_STATUS.CREATED;
    this.divID = '';
    this.adUnitID = '';
    this.adUnitIndex = 0;
    this.sizes = [];
    this.keyValues = {};
    this.arguments = [];
    this.pubAdServerObject = null;
    this.displayFunctionCalled = false;
    this.refreshFunctionCalled = false;
  }

  getName() {
    return this.name;
  }

  setStatus(status) {
    // check is it a valid status
    this.status = status;
    return this;
  }

  getStatus() {
    return this.status;
  }

  setDivID(divID) {
    // check is it a valid divID, string
    this.divID = divID;
    return this;
  }

  getDivID() {
    return this.divID;
  }

  setAdUnitID(value) {
    // check is it a valid divID, string
    this.adUnitID = value;
    return this;
  }

  getAdUnitID() {
    return this.adUnitID;
  }

  setAdUnitIndex(value) {
    // check is it a valid divID, string or number
    this.adUnitIndex = value;
    return this;
  }

  getAdUnitIndex() {
    return this.adUnitIndex;
  }

  setSizes(value) {
    // check is it a valid value, array
    this.sizes = value;
    return this;
  }

  getSizes() {
    return this.sizes;
  }

  setKeyValue(key, value) {
    // check is it a valid value, array
    this.keyValues[key] = value;
    return this;
  }

  setKeyValues(value) {
    // check is it a valid value, array
    this.keyValues = value;
    return this;
  }

  getkeyValues() {
    return this.keyValues;
  }

  setArguments(value) {
    // check is it a valid value, array
    this.arguments = value;
    return this;
  }

  getArguments() {
    return this.arguments;
  }

  setPubAdServerObject(value) {
    // check is it a valid value, array
    this.pubAdServerObject = value;
    return this;
  }

  getPubAdServerObject() {
    return this.pubAdServerObject;
  }

  setDisplayFunctionCalled(value) {
    this.displayFunctionCalled = value;
    return this;
  }

  isDisplayFunctionCalled() {
    return this.displayFunctionCalled;
  }

  setRefreshFunctionCalled(value) {
    this.refreshFunctionCalled = value;
    return this;
  }

  isRefreshFunctionCalled() {
    return this.refreshFunctionCalled;
  }

  updateStatusAfterRendering(isRefreshCalled) {
    this.status = CONSTANTS.SLOT_STATUS.DISPLAYED;
    this.arguments = [];
    if (isRefreshCalled) {
      this.refreshFunctionCalled = false;
    } else {
      this.displayFunctionCalled = false;
    }
  }
}

/* start-test-block */
export {Slot};

/* end-test-block */

export function createSlot(name) {
  return new Slot(name);
}
