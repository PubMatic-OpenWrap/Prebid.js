import { expect } from 'chai';
import { spec } from 'modules/pubmaticBidAdapter.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import * as constants from 'src/constants.js';

describe('PubMatic adapter', () => {
  let firstBid, secondBid, firstResponse, secondResponse, bidResponses;
  firstBid = {
	adUnitCode: 'Div1',
    bidder: 'pubmatic',
    mediaTypes: {
		banner: {
			sizes: [[728, 90], [160, 600]]
		}
    },
    params: {
		publisherId: '5670',
		adSlot: '/15671365/DMDemo@300x250:0',
		kadfloor: '1.2',
		pmzoneid: 'aabc, ddef',
		kadpageurl: 'www.publisher.com',
		yob: '1986',
		gender: 'M',
		lat: '12.3',
		lon: '23.7',
		wiid: '1234567890',
		profId: '100',
		verId: '200',
		currency: 'AUD',
		dctr: 'key1:val1,val2|key2:val1'
    },
    placementCode: '/19968336/header-bid-tag-1',
    sizes: [
		[300, 250],
		[300, 600],
		['fluid']
    ],
    bidId: '23acc48ad47af5',
    requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
    bidderRequestId: '1c56ad30b9b8ca8',
	ortb2: {
		device: {},
		site: {domain: "ebay.com", page: "https://ebay.com"},
		source: {}
	},
    ortb2Imp: {
		ext: {
        	tid: '92489f71-1bf2-49a0-adf9-000cea934729',
        	gpid: '/1111/homepage-leftnav'
		}
    },
    // schain: schainConfig
  }
  firstResponse = {
    'seat': 'seat-id',
    'ext': {
		  'buyid': 'BUYER-ID-987'
    },
    'bid': [{
		  'id': '74858439-49D7-4169-BA5D-44A046315B2F',
		  'impid': '23acc48ad47af5',
		  'price': 1.3,
		  'adm': 'image3.pubmatic.com Layer based creative',
		  'adomain': ['blackrock.com'],
		  'h': 250,
		  'w': 300,
		  'ext': {
        'deal_channel': 6,
        'advid': 976,
        'dspid': 123
		  }
    }]
  };
  secondResponse = {
    'ext': {
		  'buyid': 'BUYER-ID-789'
    },
    'bid': [{
		  'id': '74858439-49D7-4169-BA5D-44A046315BEF',
		  'impid': '22bddb28db77e',
		  'price': 1.7,
		  'adm': 'image3.pubmatic.com Layer based creative',
		  'adomain': ['hivehome.com'],
		  'h': 250,
		  'w': 300,
		  'ext': {
        'deal_channel': 5,
        'advid': 832,
        'dspid': 422
		  }
    }]
  };
  bidResponses = {
    'body': {
		  'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
		  'seatbid': [firstResponse, secondResponse]
    }
  };
  let validBidRequests = [firstBid];
  let bidderRequest = {
	bids : [firstBid],
	auctionId: "ee3074fe-97ce-4681-9235-d7622aede74c",
	auctionStart: 1725514077194,
	bidderCode: "pubmatic",
	bidderRequestId: "1c56ad30b9b8ca8",
	refererInfo: {
		page: "https://ebay.com",
		ref: ""
	},
	ortb2: {
		device: {},
		site: {domain: "ebay.com", page: "https://ebay.com"},
		source: {}
	},
	timeout: 2000
  }

  describe('Bid validations', () => {
    it('should return true if publisherId is present in params', () => {
		const isValid = spec.isBidRequestValid(validBidRequests[0]);
		expect(isValid).to.equal(true);
    });

	it('should return false if publisherId is missing', () => {
		const bid = utils.deepClone(validBidRequests[0]);
		delete bid.params.publisherId;
	    const isValid = spec.isBidRequestValid(bid);
	    expect(isValid).to.equal(false);
  	});

	it('should return false if publisherId is not of type string', () => {
		const bid = utils.deepClone(validBidRequests[0]);
		bid.params.publisherId = 5890;
	    const isValid = spec.isBidRequestValid(bid);
	    expect(isValid).to.equal(false);
  	});


	describe('VIDEO', () => {
		let videoBid = {};
		beforeEach(function () {
			videoBid = utils.deepClone(validBidRequests[0]);
			delete videoBid.mediaTypes.banner;
			videoBid.mediaTypes.video = {
				playerSize: [
					[640, 480]
				],
				protocols: [1, 2, 5],
				context: 'instream',
				skippable: false,
				skip: 1,
				linearity: 2
			}
		});
		it('should return false if mimes are missing in a video impression request', () => {
			const isValid = spec.isBidRequestValid(videoBid);
			expect(isValid).to.equal(false);
		});

		it('should return false if context is missing in a video impression request', () => {
			delete videoBid.mediaTypes.context;
			const isValid = spec.isBidRequestValid(videoBid);
			expect(isValid).to.equal(false);
		})

		it('should return true if banner/native present, but outstreamAU or renderer is missing', () => {
			videoBid.mediaTypes.video.mimes = ['video/flv'];
			videoBid.mediaTypes.video.context = 'outstream';
			videoBid.mediaTypes.banner = {
				sizes: [[728, 90], [160, 600]]
			}
			const isValid = spec.isBidRequestValid(videoBid);
			expect(isValid).to.equal(true);
		});

		it('should return false if outstreamAU or renderer is missing', () => {
			const isValid = spec.isBidRequestValid(videoBid);
			expect(isValid).to.equal(false);
		});
	})
  });

  describe('Request formation', () => {
	it('should return true if publisherId is present in params', () => {
		const request = spec.buildRequests(validBidRequests, bidderRequest);
		console.log('*****', request);
		expect(request.imp).to.have('banner');
    });
  });
})
