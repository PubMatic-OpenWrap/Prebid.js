import * as CONSTANTS from './constants.js';
import * as util from './util.js';
import * as bidManager from './bidManager.js';
// todo: how we can do it optionally (include only iff required) ?
// var prebid = require("./adapters/prebid.js");

const registeredAdapters = {};

/* start-test-block */
export {registeredAdapters};

/* end-test-block */

const refThis = this;

// when this function executes, it is only called for prebid adapter; we can remove this flow totally
// todo: this function can be removed
export function callAdapters(activeSlots) {
  const impressionID = util.generateUUID();
  refThis.resetSlots(activeSlots, impressionID);
  refThis.callAdapter(registeredAdapters, activeSlots, impressionID);
}

// when this function executes, it is only called for prebid adapter; we can remove this flow totally
// todo: this function can be removed
function callAdapter(adapters, slots, impressionID) {
  util.forEachOnObject(adapters, (adapterID, theAdapter) => {
    // Note: if you have any other parent-adapter like prebid, and
    //    want to add throttling on the parent-adapters then
    //    you will need to add throttling logic here as well
    refThis.setInitTimeForSlotsForAdapter(slots, adapterID);
    theAdapter.fB(slots, impressionID);
  });
}

/* start-test-block */
export {callAdapter};

/* end-test-block */

// todo: this function can be removed
function resetSlots(slots, impressionID) {
  util.forEachOnArray(slots, (key, slot) => {
    const divID = slot.getDivID();
    bidManager.resetBid(divID, impressionID);
    bidManager.setSizes(divID, util.generateSlotNamesFromPattern(slot, '_W_x_H_'));
  });
}

/* start-test-block */
export {resetSlots};

/* end-test-block */

// this function is also called by adapters/Prebid to log the init time
// todo: this function can be removed
function setInitTimeForSlotsForAdapter(slots, adapterID) {
  util.forEachOnObject(slots, (j, slot) => {
    bidManager.setCallInitTime(slot.getDivID(), adapterID);
  });
}

export {setInitTimeForSlotsForAdapter};

// todo: this function can be removed
function registerAdapter(bidAdaptor) {
  if (bidAdaptor) {
    const adapterID = bidAdaptor.ID();
    if (util.isFunction(bidAdaptor.fB)) {
      refThis.registeredAdapters[adapterID] = bidAdaptor;
    } else {
      util.log(adapterID + CONSTANTS.MESSAGES.M3);
    }
  } else {
    util.log(CONSTANTS.MESSAGES.M3);
    util.log(bidAdaptor);
  }
}

/* start-test-block */
export {registerAdapter};

/* end-test-block */

// todo: this function can be removed
function registerAdapters() {
  refThis.registerAdapter(
    // prebid.register()
  );
}
export {registerAdapters};
