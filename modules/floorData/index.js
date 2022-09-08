import * as events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json';

const HOSTNAME = window.location.host;
const PREFIX = 'FLOOR_';
let storedObject = {};
let storedDate;
let frequencyDepth = {
  pageView: 0,
  slotCnt: 0,
  bidServed: 0,
  impressionServed: 0,
  slotLevelFrquencyDepth: {},
  timestamp: {
    date: new Date().getDate(),
    hours: new Date().getHours()
  }
};
let codeAdUnitMap = {};

export let clearStorage = (storedDate) => {
  let currentDate = new Date().getDate();
  if (storedDate !== currentDate) {
    localStorage.removeItem(PREFIX + HOSTNAME);
    return true;
  }
  return false;
}

export let init = () => {
  events.on(CONSTANTS.EVENTS.AUCTION_INIT, function () {
    let slotCount = window.owpbjs.adUnits.length;
    storedObject = localStorage.getItem(PREFIX + HOSTNAME);

    if (storedObject !== null) {
      storedDate = JSON.parse(storedObject).timestamp.date;
      const isStorageCleared = clearStorage(storedDate);
      frequencyDepth = isStorageCleared ? frequencyDepth : JSON.parse(storedObject);
      frequencyDepth.pageView = frequencyDepth.pageView + 1;
      frequencyDepth.slotCnt = frequencyDepth.slotCnt + slotCount;
    } else {
      frequencyDepth.pageView = 1;
      frequencyDepth.slotCnt = slotCount;
    }

    window.owpbjs.adUnits.forEach((adUnit) => {
      frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId] = {
        slotCnt: 1 + (frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId]?.slotCnt || 0),
        bidServed: 0 + (frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId]?.bidServed || 0),
        impressionServed: 0 + (frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId]?.impressionServed || 0),
      };
      codeAdUnitMap[adUnit.code] = adUnit.adUnitId;
    })
    frequencyDepth.codeAdUnitMap = codeAdUnitMap;
  });

  events.on(CONSTANTS.EVENTS.AUCTION_END, function () {
    localStorage.setItem(PREFIX + HOSTNAME, JSON.stringify(frequencyDepth));
  });

  events.on(CONSTANTS.EVENTS.BID_RESPONSE, function (bid) {
    if (bid.cpm > 0) {
      frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].bidServed = frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].bidServed + 1;
      frequencyDepth.bidServed = frequencyDepth.bidServed + 1;
    }
  });

  events.on(CONSTANTS.EVENTS.BID_WON, (bid) => {
    frequencyDepth = JSON.parse(localStorage.getItem(PREFIX + HOSTNAME));
    frequencyDepth.impressionServed = frequencyDepth.impressionServed + 1;
    frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].impressionServed = frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].impressionServed + 1;
    localStorage.setItem(PREFIX + HOSTNAME, JSON.stringify(frequencyDepth));
  });
}
init()
