import * as events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json';

const HOSTNAME = window.location.host;
const PREFIX = 'PROFILE_AUCTION_INFO_';
let storedObject = {};
let storedDate;
let frequencyDepth = {
  pageView: 0,
  slotCnt: 0,
  bidServed: 0,
  impressionServed: 0,
  slotLevelFrquencyDepth: {},
  timestamp: {
    date: new Date().getDate()
  },
  userAgentDetails: getUserAgentDetails(),
  lip: []
};
let codeAdUnitMap = {};

export function clearStorage(storedDate) {
  let currentDate = new Date().getDate();
  if (storedDate !== currentDate) {
    localStorage.removeItem(PREFIX + HOSTNAME);
    return true;
  }
  return false;
}

export function getBrowser(ua) {
  let browserName = '';
  if (ua.match(/chrome|chromium|crios/i)) browserName = 'chrome';
  else if (ua.match(/firefox|fxios/i)) browserName = 'firefox';
  else if (ua.match(/safari/i)) browserName = 'safari';
  else if (ua.match(/opr\//i)) browserName = 'opera';
  else if (ua.match(/edg/i))browserName = 'edge';
  return browserName;
}

export function getUserAgentDetails() {
  if (navigator.userAgentData) {
    const {brands, mobile, platform} = navigator.userAgentData;
    return {
      browser: brands && brands[0] && brands[0].brand,
      isMobile: mobile,
      platform: platform
    }
  } else {
    const ua = navigator.userAgent;
    return {
      isMobile: !!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      platform: ua.platform,
      browser: getBrowser(ua)
    }
  }
}

export function auctionBidWonHandler(bid) {
  if (frequencyDepth) {
    frequencyDepth = JSON.parse(localStorage.getItem(PREFIX + HOSTNAME));
    frequencyDepth.impressionServed = frequencyDepth.impressionServed + 1;
    frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].impressionServed = frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].impressionServed + 1;
    localStorage.setItem(PREFIX + HOSTNAME, JSON.stringify(frequencyDepth));
  }
  return frequencyDepth;
}

export function auctionBidResponseHandler(bid) {
  if (frequencyDepth) {
    if (bid.cpm > 0) {
      frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].bidServed = frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].bidServed + 1;
      frequencyDepth.bidServed = frequencyDepth.bidServed + 1;
    }
  }
  return frequencyDepth;
}

export function auctionEndHandler () {
  if (frequencyDepth) {
	frequencyDepth.lip = window.owpbjs.adUnits[0]?.bids[0]?.userId && Object.keys(window.owpbjs.adUnits[0].bids[0].userId);
    localStorage.setItem(PREFIX + HOSTNAME, JSON.stringify(frequencyDepth));
  }
  return frequencyDepth;
}

export function auctionInitHandler () {
  if (frequencyDepth) {
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
        slotCnt: (frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId]?.slotCnt || 0) + 1,
        bidServed: (frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId]?.bidServed || 0) + 0,
        impressionServed: (frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId]?.impressionServed || 0) + 0,
      };
      codeAdUnitMap[adUnit.code] = adUnit.adUnitId;
    })
    frequencyDepth.codeAdUnitMap = codeAdUnitMap;
  }
  return frequencyDepth;
}

export let init = () => {
  events.on(CONSTANTS.EVENTS.AUCTION_INIT, () => {
    frequencyDepth = auctionInitHandler();
  });

  events.on(CONSTANTS.EVENTS.AUCTION_END, () => {
    frequencyDepth = auctionEndHandler();
  });

  events.on(CONSTANTS.EVENTS.BID_RESPONSE, (bid) => {
    frequencyDepth = auctionBidResponseHandler(bid);
  });

  events.on(CONSTANTS.EVENTS.BID_WON, (bid) => {
    frequencyDepth = auctionBidWonHandler(bid);
  });
}
init()
