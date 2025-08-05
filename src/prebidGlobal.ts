import {getGlobalVarName, shouldDefineGlobal} from "./buildOptions.ts";

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

// if global variable already exists in global document scope, use it, if not, create the object
// global definition should happen BEFORE imports to avoid global undefined errors.
/* eslint-disable */
const globalVarName = getGlobalVarName();
if ((window as any)[globalVarName]) { console.warn(`Namespace clash happened, with name: ${'window.' + globalVarName}, now you can provide your custom namespace, by creating new profile version in the UI. Existing PWT version details: ${JSON.stringify((window as any)?.PWT?.versionDetails)}`); }
/* eslint-disable */

// if the global already exists in global document scope, use it, if not, create the object
const scope: any = !shouldDefineGlobal() ? {} : window;
const global: PrebidJS = scope[getGlobalVarName()] = scope[getGlobalVarName()] || {};
global.cmd = global.cmd || [];
global.que = global.que || [];
global.installedModules = global.installedModules || []

// create a pbjs global pointer
if (scope === window) {
  scope._pbjsGlobals = scope._pbjsGlobals || [];
  scope._pbjsGlobals.push(getGlobalVarName());
}

export function getGlobal() {
  return global;
}

export function registerModule(name: string) {
  global.installedModules.push(name);
}
