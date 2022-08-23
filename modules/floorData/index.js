import * as events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json';

const HOSTNAME = window.location.host;
const PREFIX = 'FLOOR_';
let storedObject = {};
let frequencyDepth = {
	pageView: 1,
	slotCnt: 0,
	bidServed: 0,
	impressionServed: 0,
	slotLevelFrquencyDepth:{},
	timestamp: {
		date: new Date().getDate(),
		hours: new Date().getHours()
	} 
};
let codeAdUnitMap = {};

export let clearStorage = () => {
	let currentDate = new Date().getDate();
	if(frequencyDepth.timestamp.date !== currentDate) {
		localStorage.removeItem(PREFIX + HOSTNAME);
	}
}

export let init = () => {
	clearStorage();
	events.on(CONSTANTS.EVENTS.AUCTION_INIT, function () {
		let slotCount = window.owpbjs.adUnits.length;
		window.owpbjs.adUnits.forEach((adUnit) => {
			frequencyDepth.slotLevelFrquencyDepth[adUnit.adUnitId] = {
				slotCnt: 1,
				bidServed: 0,
				impressionServed: 0,
			};
			codeAdUnitMap[adUnit.code] = adUnit.adUnitId;
		})
		storedObject = localStorage.getItem(PREFIX + HOSTNAME);
		
		if (storedObject !== null) {
		  frequencyDepth = JSON.parse(storedObject);
		  frequencyDepth.pageView = frequencyDepth.pageView + 1;
		  frequencyDepth.slotCnt = frequencyDepth.slotCnt + slotCount;
		  frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].slotCnt = frequencyDepth.slotLevelFrquencyDepth[codeAdUnitMap[bid.adUnitCode]].slotCnt + 1;
		} else {
		  frequencyDepth.slotCnt = slotCount;
		}
	  });
	  events.on(CONSTANTS.EVENTS.AUCTION_END, function () {
		localStorage.setItem(PREFIX + HOSTNAME, JSON.stringify(frequencyDepth));
	  });

	  events.on(CONSTANTS.EVENTS.BID_RESPONSE, function (bid) {
		if(bid.cpm > 0) {
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