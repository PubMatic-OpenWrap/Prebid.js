/* eslint-disable prebid/validate-imports */
// removeIf(removeIdHubOnlyRelatedCode)
// tdod: we can still reduce the build size for idhub by,
//      - create a separate constants.js with limited required functions

import * as CONFIG from '../config.idhub.js';

import * as CONSTANTS from '../constants.js';
import * as util from '../util.idhub.js';
import * as COMMON_CONFIG from '../common.config.js';
// const refThis = this;
const pbNameSpace = CONFIG.isIdentityOnly() ? CONSTANTS.COMMON.IH_NAMESPACE : CONSTANTS.COMMON.PREBID_NAMESPACE;

const isPubmaticIHAnalyticsEnabled = CONFIG.isPubMaticIHAnalyticsEnabled();

let enablePubMaticIdentityAnalyticsIfRequired = () => {
  window.IHPWT.ihAnalyticsAdapterExpiry = CONFIG.getIHAnalyticsAdapterExpiry();
  if (isPubmaticIHAnalyticsEnabled && util.isFunction(window[pbNameSpace].enableAnalytics)) {
    window[pbNameSpace].enableAnalytics({
      provider: 'pubmaticIH',
      options: {
        publisherId: CONFIG.getPublisherId(),
        profileId: CONFIG.getProfileID(),
        profileVersionId: CONFIG.getProfileDisplayVersionID(),
        identityOnly: CONFIG.isUserIdModuleEnabled() ? CONFIG.isIdentityOnly() ? 2 : 1 : 0,
        domain: util.getDomainFromURL()
      }
    });
  }
}

let setConfig = () => {
  if (util.isFunction(window[pbNameSpace].setConfig) || typeof window[pbNameSpace].setConfig == 'function') {
    if (CONFIG.isIdentityOnly()) {
      const prebidConfig = {
        debug: util.isDebugLogEnabled(),
        userSync: {
          syncDelay: 2000,
          auctionDelay: 1,
        }
      };

      if (CONFIG.getGdpr()) {
        if (!prebidConfig['consentManagement']) {
          prebidConfig['consentManagement'] = {};
        }
        prebidConfig['consentManagement']['gdpr'] = {
          cmpApi: CONFIG.getCmpApi(),
          timeout: CONFIG.getGdprTimeout(),
          allowAuctionWithoutConsent: CONFIG.getAwc(),
          defaultGdprScope: true
        };
        const gdprActionTimeout = COMMON_CONFIG.getGdprActionTimeout();
        if (gdprActionTimeout) {
          util.log(`GDPR IS ENABLED, TIMEOUT: ${prebidConfig['consentManagement']['gdpr']['timeout']}, ACTION TIMEOUT: ${gdprActionTimeout}`);
          prebidConfig['consentManagement']['gdpr']['actionTimeout'] = gdprActionTimeout;
        }
      }

      if (CONFIG.getCCPA()) {
        if (!prebidConfig['consentManagement']) {
          prebidConfig['consentManagement'] = {};
        }
        prebidConfig['consentManagement']['usp'] = {
          cmpApi: CONFIG.getCCPACmpApi(),
          timeout: CONFIG.getCCPATimeout(),
        };
      }
      window.IHPWT.ssoEnabled = CONFIG.isSSOEnabled() || false;
      if (CONFIG.isUserIdModuleEnabled()) {
        prebidConfig['userSync']['userIds'] = util.getUserIdConfiguration();
      }
      // Adding a hook for publishers to modify the Prebid Config we have generated
      util.handleHook(CONSTANTS.HOOKS.PREBID_SET_CONFIG, [ prebidConfig ]);
      window[pbNameSpace].setConfig(prebidConfig);
    }
    if (CONFIG.isUserIdModuleEnabled() && CONFIG.isIdentityOnly()) {
      enablePubMaticIdentityAnalyticsIfRequired();
    }
    util.isFunction(window[pbNameSpace].firePubMaticIHLoggerCall) && window[pbNameSpace].firePubMaticIHLoggerCall();
    window[pbNameSpace].requestBids([]);
  }
};

export function initIdHub(win) {
  if (CONFIG.isUserIdModuleEnabled()) {
    // TODO : Check for Prebid loaded and debug logs
    setConfig();
    if (CONFIG.isIdentityOnly()) {
      if (CONFIG.getIdentityConsumers().includes(CONSTANTS.COMMON.PREBID) && !util.isUndefined(win[CONFIG.PBJS_NAMESPACE]) && !util.isUndefined(win[CONFIG.PBJS_NAMESPACE].que)) {
        win[CONFIG.PBJS_NAMESPACE].que.unshift(() => {
          const vdetails = win[CONFIG.PBJS_NAMESPACE].version.split('.');
          // todo: check the oldest pbjs version in use, do we still need this check?
          if (vdetails.length === 3 && (+vdetails[0].split('v')[1] > 3 || (vdetails[0] === 'v3' && +vdetails[1] >= 3))) {
            util.log(`Adding On Event ${win[CONFIG.PBJS_NAMESPACE]}.addAddUnits()`);
            win[CONFIG.PBJS_NAMESPACE].onEvent('addAdUnits', () => {
              util.updateAdUnits(win[CONFIG.PBJS_NAMESPACE]['adUnits']);
            });
            win[CONFIG.PBJS_NAMESPACE].onEvent('beforeRequestBids', adUnits => {
              util.updateAdUnits(adUnits);
            });
          } else {
            // todo: check the oldest pbjs version in use, do we still need this check?
            util.log(`Adding Hook on${win[CONFIG.PBJS_NAMESPACE]}.addAddUnits()`);
            const theObject = win[CONFIG.PBJS_NAMESPACE];
            const functionName = 'addAdUnits';
            util.addHookOnFunction(theObject, false, functionName, newAddAdUnitFunction);
          }
        });
        util.log('Identity Only Enabled and setting config');
      } else {
        util.logWarning('window.pbjs is undefined');
      }
    }
  }
}

export function init(win) {
  if (util.isObject(win)) {
    initIdHub(win);
    return true;
  } else {
    return false;
  }
}
// endRemoveIf(removeIdHubOnlyRelatedCode)
