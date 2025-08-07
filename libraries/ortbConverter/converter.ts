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
  [key: string]: any;
  currency?: Currency;
  mediaType?: MediaType;
  nativeRequest?: Partial<NativeRequest>;
  netRevenue?: boolean;
  ttl?: number;
}

type RequestContext = Context & {
  impContext: { [impId: string]: Context };
}

type Params<B extends BidderCode> = {
  [IMP]: (
    bidRequest: BidRequest<B>,
    context: Context & { bidderRequest: BidderRequest<B> }
  ) => ORTBImp;
  [REQUEST]: (
    imps: ORTBImp[],
    bidderRequest: BidderRequest<B>,
    context: RequestContext & { bidRequests: BidRequest<B>[] }
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
  ) => AdapterResponse;
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
  let impressionReqIdMap: Record<string, string> = {};
  let firstBidRequest: BidRequest<B> | undefined;

  (window as any).partnersWithoutErrorAndBids = (window as any).partnersWithoutErrorAndBids || {};
  (window as any).matchedimpressions = (window as any).matchedimpressions || {};
  (window as any).pbsLatency = (window as any).pbsLatency || {};

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

      const page = bidderRequest?.refererInfo?.page || '';
      const domain = bidderRequest?.refererInfo?.domain || '';
      const ref = (window as any)?.document?.referrer;
      if (bidderRequest?.src === 's2s' && ortbRequest.site) {
        ortbRequest.site = Object.assign(ortbRequest.site, { page, domain });
        if (ref?.length) {
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
    impressionReqIdMap[id] = impressionID;
    (window as any).pbsLatency[impressionID] = {
      startTime: timestamp()
    };
  }

  function getErroredPartners(responseExt: any): string[] | undefined {
    if (responseExt?.errors) {
      return Object.keys(responseExt.errors);
    }
  }

  function findPartnersWithoutErrorsAndBids(
    erroredPartners: string[],
    partnerList: string[],
    responseExt: any,
    impValue: string
  ) {
    (window as any).partnersWithoutErrorAndBids[impValue] = partnerList.filter(partner => !erroredPartners.includes(partner));
    erroredPartners.forEach(partner => {
      if (responseExt?.errors[partner]?.[0]?.code === 1) {
        (window as any).partnersWithoutErrorAndBids[impValue].push(partner);
      }
    });
  }

  return {
    toORTB({bidderRequest, bidRequests, context = {}}: {
      bidderRequest: BidderRequest<B>,
      bidRequests?: BidRequest<B>[],
      context?: Context
    }): ORTBRequest {
      bidRequests = bidRequests || bidderRequest.bids;
      const ctx = {
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
        if (result != null && result.hasOwnProperty('id')) {
          Object.assign(impContext, {bidRequest, imp: result});
          ctx.imp[result.id] = impContext;
          return result;
        }
        logError('Converted ORTB imp does not specify an id, ignoring bid request', bidRequest, resultCopy);
      }).filter(Boolean);

      const request = buildRequest(imps, bidderRequest, ctx.req);
      ctx.req.bidderRequest = bidderRequest;
      if (request != null) {
        REQ_CTX.set(request, ctx);
      }
      firstBidRequest = ctx.req?.actualBidderRequests?.[0];
      const s2sConfig = ctx.req?.s2sBidRequest?.s2sConfig;
      let isAnalyticsEnabled = s2sConfig?.extPrebid?.isPrebidPubMaticAnalyticsEnabled;
      if (firstBidRequest) {
        const iidValue = isAnalyticsEnabled ? firstBidRequest.auctionId : firstBidRequest?.bids[0]?.params?.wiid;
        createLatencyMap(iidValue, firstBidRequest.auctionId);
      }
      return request;
    },

    fromORTB({request, response}: {
      request: ORTBRequest;
      response: ORTBResponse | null;
    }): AdapterResponse {
      let impValue = impressionReqIdMap[response?.id];
      if (impValue && (window as any).pbsLatency[impValue]) {
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
      if (firstBidRequest && firstBidRequest.hasOwnProperty('adUnitsS2SCopy')) {
        impForSlots = (firstBidRequest as any).adUnitsS2SCopy.length;
      }
      let extObj = response?.ext || {};
      let miObj = extObj.matchedimpression || {};
      (window as any).matchedimpressions = {...(window as any).matchedimpressions, ...miObj};
      const listofPartnersWithmi = Object.keys(miObj);
      (window as any).partnersWithoutErrorAndBids[impValue] = listofPartnersWithmi;
      const erroredPartners = getErroredPartners(extObj);
      if (erroredPartners) {
        findPartnersWithoutErrorsAndBids(erroredPartners, listofPartnersWithmi, extObj, impValue);
      }
      const bidResponses = (response?.seatbid || []).flatMap(seatbid => {
        if (seatbid.hasOwnProperty('bid')) {
          partnerBidsForslots = seatbid.bid.length;
        }
        (window as any).partnersWithoutErrorAndBids[impValue] = (window as any).partnersWithoutErrorAndBids[impValue].filter((partner) => {
          return ((partner !== seatbid.seat) || (impForSlots !== partnerBidsForslots));
        });
        return (seatbid.bid || []).map((bid) => {
          if (impsById.hasOwnProperty(bid.impid) && ctx.imp.hasOwnProperty(bid.impid)) {
            return buildBidResponse(bid, augmentContext(ctx.imp[bid.impid], {imp: impsById[bid.impid], seatbid, ortbResponse: response}));
          }
          logError('ORTB response seatbid[].bid[].impid does not match any imp in request; ignoring bid', bid);
        })
      }).filter(Boolean);
      return buildResponse(bidResponses, response, augmentContext(ctx.req));
    }
  }
}

export const defaultProcessors = memoize(() => mergeProcessors(DEFAULT_PROCESSORS, getProcessors(DEFAULT)));
