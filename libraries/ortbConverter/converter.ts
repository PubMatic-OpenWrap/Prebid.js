import {compose} from './lib/composer.js';
import {deepClone, logError, memoize, timestamp} from '../../src/utils.js';
import {DEFAULT_PROCESSORS} from './processors/default.js';
import {BID_RESPONSE, DEFAULT, getProcessors, IMP, REQUEST, RESPONSE} from '../../src/pbjsORTB.js';
import {mergeProcessors} from './lib/mergeProcessors.js';
import type {MediaType} from "../../src/mediaTypes.ts";
import type {NativeRequest} from '../../src/types/ortb/native.d.ts';
import type {ORTBImp, ORTBRequest} from "../../src/types/ortb/request.d.ts";
import type {Currency, BidderCode} from "../../src/types/common.d.ts";
import type {BidderRequest, BidRequest} from "../../src/adapterManager.ts";
import type {BidResponse} from "../../src/bidfactory.ts";
import type {AdapterResponse} from "../../src/adapters/bidderFactory.ts";
import type {ORTBResponse} from "../../src/types/ortb/response";

type Context = {
    [key: string]: unknown;
    /**
     * A currency string (e.g. `'EUR'`). If specified, overrides the currency to use for computing price floors and `request.cur`.
     * If omitted, both default to `getConfig('currency.adServerCurrency')`.
     */
    currency?: Currency;
    /**
     * A bid mediaType (`'banner'`, `'video'`, or `'native'`). If specified:
     *  - disables `imp` generation for other media types (i.e., if `context.mediaType === 'banner'`, only `imp.banner` will be populated; `imp.video` and `imp.native` will not, even if the bid request specifies them);
     *  - is passed as the `mediaType` option to `bidRequest.getFloor` when computing price floors;
     *  - sets `bidResponse.mediaType`.
     */
    mediaType?: MediaType;
    /**
     * A plain object that serves as the base value for `imp.native.request` (and is relevant only for native bid requests).
     * If not specified, the only property that is guaranteed to be populated is `assets`, since Prebid does not
     * require anything else to define a native adUnit. You can use `context.nativeRequest` to provide other properties;
     * for example, you may want to signal support for native impression trackers by setting it to `{eventtrackers: [{event: 1, methods: [1, 2]}]}` (see also the [ORTB Native spec](https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf)).
     */
    nativeRequest?: Partial<NativeRequest>;
    /**
     * The value to set as `bidResponse.netRevenue`. This is a required property of bid responses that does not have a clear ORTB counterpart.
     */
    netRevenue?: boolean;
    /**
     * the default value to use for `bidResponse.ttl` (if the ORTB response does not provide one in `seatbid[].bid[].exp`).
     */
    ttl?: number;
}

type RequestContext = Context & {
    /**
     * Map from imp id to the context object used to generate that imp.
     */
    impContext: { [impId: string]: Context };
}

type Params<B extends BidderCode> = {
    [IMP]: (
        bidRequest: BidRequest<B>,
        context: Context & {
            bidderRequest: BidderRequest<B>
        }
    ) => ORTBImp;
    [REQUEST]: (
        imps: ORTBImp[],
        bidderRequest: BidderRequest<B>,
        context: RequestContext & {
            bidRequests: BidRequest<B>[]
        }
    ) => ORTBRequest;
    [BID_RESPONSE]: (
        bid: ORTBResponse['seatbid'][number]['bid'][number],
        context: Context & {
            seatbid: ORTBResponse['seatbid'][number];
            imp: ORTBImp;
            bidRequest: BidRequest<B>;
            ortbRequest: ORTBRequest;
            ortbResponse: ORTBResponse;
        }
    ) => BidResponse;
    [RESPONSE]: (
        bidResponses: BidResponse[],
        ortbResponse: ORTBResponse,
        context: RequestContext & {
            ortbRequest: ORTBRequest;
            bidderRequest: BidderRequest<B>;
            bidRequests: BidRequest<B>[];
        }
    ) => AdapterResponse
}

type Processors<B extends BidderCode> = {
    [M in keyof Params<B>]?: {
        [name: string]: (...args: [Partial<ReturnType<Params<B>[M]>>, ...Parameters<Params<B>[M]>]) => void;
    }
}

type Customizers<B extends BidderCode> = {
    [M in keyof Params<B>]?: (buildObject: Params<B>[M], ...args: Parameters<Params<B>[M]>) => ReturnType<Params<B>[M]>;
}

type Overrides<B extends BidderCode> = {
    [M in keyof Params<B>]?: {
        [name: string]: (orig: Processors<B>[M][string], ...args: Parameters<Processors<B>[M][string]>) => void;
    }
}

type ConverterConfig<B extends BidderCode> = Customizers<B> & {
    context?: Context;
    processors?: () => Processors<B>;
    overrides?: Overrides<B>;
}

export function ortbConverter<B extends BidderCode>({
  context: defaultContext = {},
  processors = defaultProcessors,
  overrides = {},
  imp,
  request,
  bidResponse,
  response,
}: ConverterConfig<B> = {}) {
  const REQ_CTX = new WeakMap();
  let impressionReqIdMap: { [id: string]: string } = {};
  let firstBidRequest: BidderRequest<B>;
  (window as any).partnersWithoutErrorAndBids = {};
  (window as any).matchedimpressions = {};

  function builder(slot, wrapperFn, builderFn, errorHandler) {
    let build;
    return function (...args) {
      if (build == null) {
        build = (function () {
          let delegate = builderFn.bind(this, compose(processors()[slot] || {}, overrides[slot] || {}));
          if (wrapperFn) {
            delegate = wrapperFn.bind(this, delegate);
          }
          return function (...args) {
            try {
              return delegate.apply(this, args);
            } catch (e) {
              errorHandler.call(this, e, ...args);
            }
          }
        })();
      }
      return build.apply(this, args);
    }
  }

  const buildImp = builder(IMP, imp,
    function (process, bidRequest, context) {
      const imp = {};
      process(imp, bidRequest, context);
      return imp;
    },
    function (error, bidRequest, context) {
      logError('Error while converting bidRequest to ORTB imp; request skipped.', {error, bidRequest, context});
    }
  );

  const buildRequest = builder(REQUEST, request,
    function (process, imps, bidderRequest, context) {
      const ortbRequest: any = {imp: imps};
      process(ortbRequest, bidderRequest, context);

      // PM: Stop overwriting page, domain and ref as mentioned in UOE-8675 for s2s partners
      const page = bidderRequest?.refererInfo?.page || '';
      const domain = bidderRequest?.refererInfo?.domain || '';
      const ref = (window as any)?.document?.referrer;
      if (bidderRequest?.src === 's2s' && ortbRequest.site) {
        ortbRequest.site = Object.assign(ortbRequest.site, { page, domain });
        if (ref && ref.length) {
          ortbRequest.site.ref = ref;
        }
      }

      return ortbRequest;
    },
    function (error, imps, bidderRequest, context) {
      logError('Error while converting to ORTB request', {error, imps, bidderRequest, context});
      throw error;
    }
  );

  const buildBidResponse = builder(BID_RESPONSE, bidResponse,
    function (process, bid, context) {
      const bidResponse = {};
      process(bidResponse, bid, context);
      return bidResponse;
    },
    function (error, bid, context) {
      logError('Error while converting ORTB seatbid.bid to bidResponse; bid skipped.', {error, bid, context});
    }
  );

  const buildResponse = builder(RESPONSE, response,
    function (process, bidResponses, ortbResponse, context) {
      const response = {bids: bidResponses};
      process(response, ortbResponse, context);
      return response;
    },
    function (error, bidResponses, ortbResponse, context) {
      logError('Error while converting from ORTB response', {error, bidResponses, ortbResponse, context});
      throw error;
    }
  );

  function createLatencyMap(impressionID: string, id: string) {
    (window as any).pbsLatency = (window as any).pbsLatency || {};
    impressionReqIdMap[id] = impressionID;
    (window as any).pbsLatency[impressionID] = {
      'startTime': timestamp()
    };
  }

  // Get list of all errored partners
  function getErroredPartners(responseExt: any): string[] | undefined {
    if (responseExt && responseExt.errors) {
      return Object.keys(responseExt.errors);
    }
  }

  function findPartnersWithoutErrorsAndBids(erroredPartners: string[], listofPartnersWithmi: string[], responseExt: any, impValue: string) {
    (window as any).partnersWithoutErrorAndBids[impValue] = listofPartnersWithmi.filter(partner => !erroredPartners.includes(partner));
    erroredPartners.forEach(partner => {
      if (responseExt.errors[partner] && responseExt.errors[partner][0].code == 1) {
        (window as any).partnersWithoutErrorAndBids[impValue].push(partner);
      }
    })
  }

  return {
    toORTB({bidderRequest, bidRequests, context = {}}: {
        bidderRequest: BidderRequest<B>,
        bidRequests?: BidRequest<B>[],
        context?: Context
    }): ORTBRequest {
      bidRequests = bidRequests || bidderRequest.bids;
      const ctx: any = {
        req: Object.assign({bidRequests}, defaultContext, context),
        imp: {}
      }
      ctx.req.impContext = ctx.imp;
      const imps = bidRequests.map(bidRequest => {
        const impContext = Object.assign({bidderRequest, reqContext: ctx.req}, defaultContext, context);
        const result = buildImp(bidRequest, impContext);
        let resultCopy = deepClone(result);
        if (resultCopy?.ext?.prebid?.bidder) {
          for (let bidderCode in resultCopy.ext.prebid.bidder) {
            let bid = resultCopy.ext.prebid.bidder[bidderCode];
            delete bid?.kgpv;
          }
        }
        if (result != null) {
          if (result.hasOwnProperty('id')) {
            Object.assign(impContext, {bidRequest, imp: result});
            ctx.imp[result.id] = impContext;
            return result;
          }
          logError('Converted ORTB imp does not specify an id, ignoring bid request', bidRequest, resultCopy);
        }
      }).filter(Boolean);

      const request = buildRequest(imps, bidderRequest, ctx.req);
      ctx.req.bidderRequest = bidderRequest;
      if (request != null) {
        REQ_CTX.set(request, ctx);
      }

      firstBidRequest = ctx.req?.actualBidderRequests?.[0];
      // check if isPrebidPubMaticAnalyticsEnabled in s2sConfig and if it is then get auctionId from adUnit
      const s2sConfig = ctx.req?.s2sBidRequest?.s2sConfig;
      let isAnalyticsEnabled = s2sConfig?.extPrebid?.isPrebidPubMaticAnalyticsEnabled;
      if (firstBidRequest) {
        const iidValue = isAnalyticsEnabled ? firstBidRequest.auctionId : firstBidRequest?.bids[0]?.params?.wiid;
        if (iidValue) {
          createLatencyMap(String(iidValue), firstBidRequest.auctionId);
        }
      }
      return request;
    },
    fromORTB({request, response}: {
        request: ORTBRequest;
        response: ORTBResponse;
    }): AdapterResponse {
      // Get impressionID from impressionReqIdMap to check response belongs to same request
      let impValue = impressionReqIdMap[(response as any).id];
      if (impValue && (window as any).pbsLatency && (window as any).pbsLatency[impValue]) {
        (window as any).pbsLatency[impValue]['endTime'] = timestamp();
      }

      const ctx = REQ_CTX.get(request);
      if (ctx == null) {
        throw new Error('ortbRequest passed to `fromORTB` must be the same object returned by `toORTB`')
      }
      function augmentContext(ctx, extraParams = {}) {
        return Object.assign(ctx, {ortbRequest: request}, extraParams);
      }
      const impsById = Object.fromEntries((request.imp || []).map(imp => [imp.id, imp]));
      let impForSlots, partnerBidsForslots;
      if (firstBidRequest && (firstBidRequest as any).hasOwnProperty('adUnitsS2SCopy')) {
        impForSlots = (firstBidRequest as any).adUnitsS2SCopy.length;
      }

      let extObj = (response as any).ext || {};
      let miObj = extObj.matchedimpression || {};
      (window as any).matchedimpressions = {...(window as any).matchedimpressions, ...miObj};

      const listofPartnersWithmi = Object.keys(miObj);
      (window as any).partnersWithoutErrorAndBids[impValue] = listofPartnersWithmi;
      const erroredPartners = getErroredPartners(extObj);
      if (erroredPartners) {
        findPartnersWithoutErrorsAndBids(erroredPartners, listofPartnersWithmi, extObj, impValue);
      }

      const bidResponses = (response.seatbid || []).flatMap(seatbid => {
        if (seatbid.hasOwnProperty('bid')) {
          partnerBidsForslots = seatbid.bid.length;
        }
        (window as any).partnersWithoutErrorAndBids[impValue] = (window as any).partnersWithoutErrorAndBids[impValue].filter((partner) => {
          return ((partner !== (seatbid as any).seat) || (impForSlots !== partnerBidsForslots));
        });

        return (seatbid.bid || []).map((bid) => {
          if (impsById.hasOwnProperty(bid.impid) && ctx.imp.hasOwnProperty(bid.impid)) {
            return buildBidResponse(bid, augmentContext(ctx.imp[bid.impid], {imp: impsById[bid.impid], seatbid, ortbResponse: response}));
          }
          logError('ORTB response seatbid[].bid[].impid does not match any imp in request; ignoring bid', bid);
        })
      }
      ).filter(Boolean);
      return buildResponse(bidResponses, response, augmentContext(ctx.req));
    }
  }
}

export const defaultProcessors = memoize(() => mergeProcessors(DEFAULT_PROCESSORS, getProcessors(DEFAULT)));
