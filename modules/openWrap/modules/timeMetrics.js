import * as commonUtil from '../common.util.js';

let metrics = {};
export function resetMetricsObject() {
  metrics = {};
}
// Get a metrics object within PWT
export function getMetricsObject() {
  return metrics;
}
commonUtil.getGlobalOwObject().getMetrics = getMetricsObject;
// Function to set entry and exit times for a specific module and/or function
function setMetrics(options) {
  const { keyName, entryTime = null, exitTime = null, duration = null } = options;
  if (keyName) {
    if (!getMetricsObject()[keyName]) {
      getMetricsObject()[keyName] = {
        st: entryTime,
        et: exitTime,
        tt: duration
      };
    }
  }
}
// Function to get metrics for a specific module and/or function
function getMetrics(keyName) {
  return keyName ? getMetricsObject()[keyName] || null : null;
}
/**
 * Retrieves the duration of a specific keyName
 */
export function getDurationOf(keyName) {
  const metric = getMetrics(keyName);
  return metric ? metric.tt : null;
}
commonUtil.getGlobalOwObject().getDurationOf = getDurationOf;
// Function to record the entry time for one or multiple keys with defaultTotaltime
export function recordEntryTime(keyNames, defaultTotalTime = 0) {
  const currentTime = Date.now();
  const namesArray = Array.isArray(keyNames) ? keyNames : [keyNames];
  namesArray.forEach((keyName) => {
    setMetrics({ keyName, entryTime: currentTime, duration: defaultTotalTime });
  });
}
commonUtil.getGlobalOwObject().recordEntryTime = recordEntryTime;
// Function to record the exit time and total time for one or multiple keys
export function recordExitTime(keyNames, defaultTotalTime = 0) {
  const currentTime = Date.now();
  const namesArray = Array.isArray(keyNames) ? keyNames : [keyNames];
  namesArray.forEach((keyName) => {
    const metric = getMetrics(keyName);
    if (metric) {
      metric.tt = defaultTotalTime || ((metric.et = currentTime), currentTime - metric.st);
    }
  });
}
commonUtil.getGlobalOwObject().recordExitTime = recordExitTime;
// Initializing the module
export function init() {}