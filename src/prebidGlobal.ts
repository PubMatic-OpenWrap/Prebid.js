interface Command {
    (): any;
}

interface CommandQueue extends Omit<Command[], 'push'> {
    push(cmd: Command): void;
}

export interface PrebidJS {
    /**
     * Command queue. Use cmd.push(function F() { ... }) to queue F until Prebid has loaded.
     */
    cmd: CommandQueue,
    /**
     * Alias of `cmd`
     */
    que: CommandQueue
    /**
     * Names of all installed modules.
     */
    installedModules: string[]
    /**
     * Optional scheduler used by pbYield().
     */
    scheduler?: { yield: () => Promise<void> }
}

// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global defination should happen BEFORE imports to avoid global undefined errors.
/* eslint-disable */
if ((window as any).$$PREBID_GLOBAL$$) { console.warn(`Namespace clash happened, with name: ${'window.$$PREBID_GLOBAL$$'}, now you can provide your custom namespace, by creating new profile version in the UI. Existing PWT version details: ${JSON.stringify((window as any)?.PWT?.versionDetails)}`); }
/* eslint-disable */

// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object

declare const $$DEFINE_PREBID_GLOBAL$$: boolean;
const scope: any = !$$DEFINE_PREBID_GLOBAL$$ ? {} : window;
const global: PrebidJS = scope.$$PREBID_GLOBAL$$ = scope.$$PREBID_GLOBAL$$ || {};
global.cmd = global.cmd || [];
global.que = global.que || [];
global.installedModules = global.installedModules || []

// create a pbjs global pointer
if (scope === window) {
  scope._pbjsGlobals = scope._pbjsGlobals || [];
  scope._pbjsGlobals.push('$$PREBID_GLOBAL$$');
}

export function getGlobal() {
  return global;
}

export function registerModule(name: string) {
  global.installedModules.push(name);
}
