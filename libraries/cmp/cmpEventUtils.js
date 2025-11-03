/**
 * Shared utilities for CMP event listener management
 * Used by TCF and GPP consent management modules
 */

import { logError, logInfo } from "../../src/utils.js";

/**
 * Base CMP event manager implementation
 */
export class BaseCmpEventManager {
  constructor() {
    this.cmpApi = null;
    this.listenerId = undefined;
  }

  setCmpApi(cmpApi) {
    this.cmpApi = cmpApi;
  }

  getCmpApi() {
    return this.cmpApi;
  }

  setCmpListenerId(listenerId) {
    this.listenerId = listenerId;
  }

  getCmpListenerId() {
    return this.listenerId;
  }

  resetCmpApis() {
    this.cmpApi = null;
    this.listenerId = undefined;
  }

  /**
   * Helper method to get base removal parameters
   * Can be used by subclasses that need to remove event listeners
   */
  getRemoveListenerParams() {
    const cmpApi = this.getCmpApi();
    const listenerId = this.getCmpListenerId();

    // Comprehensive validation for all possible failure scenarios
    if (cmpApi && typeof cmpApi === 'function' && listenerId !== undefined && listenerId !== null) {
      return {
        command: "removeEventListener",
        callback: () => this.resetCmpApis(),
        parameter: listenerId
      };
    }
    return null;
  }

  /**
   * Base method - subclasses should override this
   */
  removeCmpEventListener() {
    // Base implementation - to be overridden by subclasses
  }
}

/**
 * TCF-specific CMP event manager
 */
export class TcfCmpEventManager extends BaseCmpEventManager {
  constructor(getConsentData) {
    super();
    this.getConsentData = getConsentData || (() => null);
  }

  removeCmpEventListener() {
    const params = this.getRemoveListenerParams();
    if (params) {
      const consentData = this.getConsentData();
      params.apiVersion = (consentData && consentData.apiVersion) || 2;
      logInfo('Removing TCF CMP event listener');
      this.getCmpApi()(params);
    }
  }
}
/**
 * GPP-specific CMP event manager
 * GPP doesn't require event listener removal, so this is empty
 */
export class GppCmpEventManager extends BaseCmpEventManager {
  removeCmpEventListener() {
    const params = this.getRemoveListenerParams();
    if (params) {
      logInfo('Removing GPP CMP event listener');
      this.getCmpApi()(params);
    }
  }
}

/**
 * Factory function to create appropriate CMP event manager
 */
export function createCmpEventManager(type, getConsentData) {
  switch (type) {
    case 'tcf':
      return new TcfCmpEventManager(getConsentData);
    case 'gpp':
      return new GppCmpEventManager();
    default:
      logError(`Unknown CMP type: ${type}`);
      return null;
  }
}
