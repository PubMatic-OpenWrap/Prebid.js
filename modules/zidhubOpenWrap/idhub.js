let CONFIG = {};
let CONSTANTS = {};
let util = {};
let COMMON_CONFIG = {};
let pbNameSpace = {};
let isPubmaticIHAnalyticsEnabled = {};
let consentConfigResolver = {};

export function initializeModule(idhubUtils) {
  CONFIG = idhubUtils.CONFIG;
  CONSTANTS = idhubUtils.CONSTANTS;
  util = idhubUtils.util;
  COMMON_CONFIG = idhubUtils.COMMON_CONFIG;
  consentConfigResolver = idhubUtils.consentConfigResolver;

  pbNameSpace = CONFIG.isIdentityOnly() ? CONSTANTS.COMMON.IH_NAMESPACE : CONSTANTS.COMMON.PREBID_NAMESPACE;
  isPubmaticIHAnalyticsEnabled = CONFIG.isPubMaticIHAnalyticsEnabled();
  init(window);
}

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
      let prebidConfig = {
        debug: util.isDebugLogEnabled(),
        userSync: {
          syncDelay: 2000,
          auctionDelay: 1,
        }
      };

      window.IHPWT.ssoEnabled = CONFIG.isSSOEnabled() || false;
      if (CONFIG.isUserIdModuleEnabled()) {
        prebidConfig['userSync']['userIds'] = util.getUserIdConfiguration();
      }
      // Adding a hook for publishers to modify the Prebid Config we have generated
      util.handleHook(CONSTANTS.HOOKS.PREBID_SET_CONFIG, [ prebidConfig ]);

      consentConfigResolver.getConsentManagementConfig(function (cmConfig) {
        const cmEnabled = COMMON_CONFIG.consentManagentEnabled();
        const message =  cmEnabled ? "setting" : "not setting";
        util.log("ConsentManagement: " + cmEnabled + ", " + message + " the consentManagement config: " + JSON.stringify(cmConfig));
        if(cmConfig && !util.isEmptyObject(cmConfig)) {
          prebidConfig.consentManagement = cmConfig;
        }
        window[pbNameSpace].setConfig(prebidConfig);
      });
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
      if (CONFIG.getIdentityConsumers().includes(CONSTANTS.COMMON.PREBID) && !util.isUndefined(win[CONFIG.getPBJSNamespace()]) && !util.isUndefined(win[CONFIG.getPBJSNamespace()].que)) {
        win[CONFIG.getPBJSNamespace()].que.unshift(() => {
          const vdetails = win[CONFIG.getPBJSNamespace()].version.split('.');
          // todo: check the oldest pbjs version in use, do we still need this check?
          if (vdetails.length === 3 && (+vdetails[0].split('v')[1] > 3 || (vdetails[0] === 'v3' && +vdetails[1] >= 3))) {
            util.log(`Adding On Event ${win[CONFIG.getPBJSNamespace()]}.addAddUnits()`);
            win[CONFIG.getPBJSNamespace()].onEvent('addAdUnits', () => {
              util.updateAdUnits(win[CONFIG.getPBJSNamespace()]['adUnits']);
            });
            win[CONFIG.getPBJSNamespace()].onEvent('beforeRequestBids', adUnits => {
              util.updateAdUnits(adUnits);
            });
          } else {
            // todo: check the oldest pbjs version in use, do we still need this check?
            util.log(`Adding Hook on${win[CONFIG.getPBJSNamespace()]}.addAddUnits()`);
            const theObject = win[CONFIG.getPBJSNamespace()];
            const functionName = 'addAdUnits';
            /* eslint-disable no-undef */
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
