const localStorageKey = 'OpenWrap';
const DUMMY_PUB_ID = 909090;

// Adding util here creating cyclic dependecies between the modules so avoided it & added two util function manually
function isA(object, testForType) {
  return toString.call(object) === `[object ${testForType}]`;
}

const isFunction = object => {
  return isA(object, 'Function');
};

const isLocalStoreEnabled = (() => {
  try {
    return window.localStorage && isFunction(window.localStorage.getItem) && isFunction(window.localStorage.setItem);
  } catch (e) {
    return false;
  }
})();

/*
  localStorage = {
    localStorageKey : {
      pubID: {
        c: "encoded user consent"
      }
    }
  }
*/

const setConsentDataInLS = (pubId, dataType, data, gdprApplies) => {
  let pm;

  if (!isLocalStoreEnabled) {
    return;
  }
  try {
    pm = window.localStorage.getItem(localStorageKey);
  } catch (e) { }
  if (pm && typeof pm === 'string') {
    try {
      pm = JSON.parse(pm);
    } catch (e) {
      pm = {};
    }
  } else {
    pm = {};
  }
  if (pm) {
    if (!pm.hasOwnProperty(pubId)) {
      pm[pubId] = {};
    }
    pm[pubId].t = (new Date()).getTime();
    pm[pubId][dataType] = data;
    if (dataType == 'c') {
      pm[pubId]['g'] = gdprApplies ? 1 : 0;
    }
  }
  try {
    window.localStorage.setItem(localStorageKey, JSON.stringify(pm));
  } catch (e) { }
};

/* start-test-block */
export { setConsentDataInLS };

/* end-test-block */

export function isCmpFound() {
  return !!window.__cmp;
}

/**
  * getUserConsentDataFromCMP() method return nothing
  * Here, We try to call get the ConsentData for vendorConsents from CMP using getConsentData() method
  * Once, We get that we will this data in Local Storage againg a dummy ID
  * If CMP is not detected in current document we try to look into upper iframe & fetch the infoa
  */
export function getUserConsentDataFromCMP() {
  // Adding dummy pubId to store data against
  const pubId = DUMMY_PUB_ID; // CONFIG.getPublisherId();
  let callId = 0;
  const getConsentDataReq = {
    __cmp: {
      callId: `iframe:${++callId}`,
      command: 'getConsentData'
    }
  };

  function receiveMessage(event) {
    if (event && event.data && event.data.__cmp && event.data.__cmp.result) {
      const result = event.data.__cmp.result;

      if (result && result.consentData) {
        /**
          * CMP API 1.1 - result is object which includes
          *   {
          *      consentData: base64 string,
          *      gdprApplies: boolean
          *   }
          */
        setConsentDataInLS(pubId, 'c', result.consentData, result.gdprApplies);
      } else if (typeof result === 'string') {
        // CMP API 1.0 - result is base64 consent string
        setConsentDataInLS(pubId, 'c', result);
      }
    }
  }

  function callCMP() {
    window.__cmp('getConsentData', 'vendorConsents', result => {
      if (result && result.consentData) {
        setConsentDataInLS(pubId, 'c', result.consentData, result.gdprApplies);
      } else if (typeof result === 'string') {
        setConsentDataInLS(pubId, 'c', result);
      }
    });
  }

  if (window.__cmp) {
    if (typeof window.__cmp === 'function') {
      callCMP();
    } else {
      setTimeout(() => {
        if (typeof window.__cmp === 'function') {
          callCMP();
        }
      }, 500);
    }
  } else {
    // we may be inside an iframe and CMP may exist outside, so we"ll use postMessage to interact with CMP
    window.top.postMessage(getConsentDataReq, '*');
    window.addEventListener('message', receiveMessage);
  }
}

/**
  * getUserConsentDataFromLS() method return the object { c: "XXX", g: 0/1 }
  * Here c is Consent String We got from CMP APIs
  * & g is gdpr flag i.e. gdprApplies in terms of CMP 1.1 API
  * @return {object} { c: String, g: Number 0/1 }
  */

export function getUserConsentDataFromLS() {
  // Adding dummy pubId to store data against
  const pubId = DUMMY_PUB_ID;
  const data = { c: '', g: 0 };

  if (!isLocalStoreEnabled) {
    return data;
  }
  let pm;

  try {
    pm = window.localStorage.getItem(localStorageKey);
  } catch (e) { }
  if (pm && typeof pm === 'string') {
    try {
      pm = JSON.parse(pm);
    } catch (e) {
      pm = {};
    }
    if (pm.hasOwnProperty(pubId)) {
      const pmRecord = pm[pubId];

      if (pmRecord && pmRecord.c && pmRecord.t) {
        // check timestamp of data and current; if older than a day do not use it
        if (pmRecord.t && parseInt(pmRecord.t, 10) > ((new Date()).getTime() - (24 * 60 * 60 * 1000))) {
          data.c = pmRecord.c;
          data.g = pmRecord.g;
        }
      }
    }
  }
  return data;
}
