import {auctionManager} from '../../../src/auctionManager.js';
import adapterManager from '../../../src/adapterManager.js';
import {deepSetValue} from '../../../src/utils.js';

export function setImpBidParams(
  imp, bidRequest, context,
  {adUnit, bidderRequests, index = auctionManager.index, bidderRegistry = adapterManager.bidderRegistry} = {}) {
  let params = bidRequest.params;
  const adapter = bidderRegistry[bidRequest.bidder];
  let owAliases;

  if (adapter && adapter.getSpec().transformBidParams) {
    adUnit = adUnit || index.getAdUnit(bidRequest);
    bidderRequests = bidderRequests || [context.bidderRequest];
    params = adapter.getSpec().transformBidParams(params, true, adUnit, bidderRequests);
  }
  // init OWAlias
  if (context && context.s2sBidRequest && context.s2sBidRequest.s2sConfig && context.s2sBidRequest.s2sConfig.extPrebid) {
    owAliases = context.s2sBidRequest.s2sConfig.extPrebid.aliases;
  }

  if (params) {
    deepSetValue(
      imp,
      `ext.prebid.bidder.${bidRequest.bidder}`,
      params
    );
  }
}
