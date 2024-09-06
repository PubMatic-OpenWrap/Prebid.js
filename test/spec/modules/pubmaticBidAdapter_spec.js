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
		dctr: 'key1:val1,val2|key2:val1',
		deals: ['deal-1', 'deal-2']
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
  };
  let videoBid, videoBidderRequest, utilsLogWarnMock, nativeBidderRequest;

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
		beforeEach(() => {
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
	describe('IMP', () => {
		it('should generate request with banner', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('banner');
			expect(imp[0]).to.have.property('id').equal('23acc48ad47af5');
		});

		it('should add pmp if deals are present in parameters', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('pmp');
			expect(imp[0]).to.have.property('pmp').to.have.property('deals').with.lengthOf(2);
		});

		it('should not add pmp if deals are absent in parameters', () => {
			delete validBidRequests[0].params.deals;
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.not.have.property('pmp');
		});

		it('should add key_val property if dctr is present in parameters', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('ext');
			expect(imp[0]).to.have.property('ext').to.have.property('key_val');
		});

		it('should not add key_val if dctr is absent in parameters', () => {
			delete validBidRequests[0].params.dctr;
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('ext').to.not.have.property('key_val');
		});
		
		it('should set w and h to the primary size for banner', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('banner');
			expect(imp[0]).to.have.property('banner').to.have.property('w').equal(728);
			expect(imp[0]).to.have.property('banner').to.have.property('h').equal(90);
		});

		it('should have 1 size in the banner.format array', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('banner').to.have.property('format');
			expect(imp[0]).to.have.property('banner').to.have.property('format').with.lengthOf(1);
		});
		  
		it('should add pmZoneId in ext if pmzoneid is present in parameters', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('ext');
			expect(imp[0]).to.have.property('ext').to.have.property('pmZoneId');
		});

		it('should add bidfloor if kadfloor is present in parameters', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('bidfloor');
			expect(imp[0]).to.have.property('bidfloor').equal(1.2);
		});

		it('should add bidfloorcur if currency is present in parameters', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('bidfloorcur');
			expect(imp[0]).to.have.property('bidfloorcur').equal('AUD');
		});

		it('should add bidfloorcur with default value if currency is missing in parameters', () => {
			delete validBidRequests[0].params.currency;
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('bidfloorcur');
			expect(imp[0]).to.have.property('bidfloorcur').equal('USD');
		});

		it('should add tagid', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('tagid');
			expect(imp[0]).to.have.property('tagid').equal('/15671365/DMDemo');
		});
		
		it('should add secure, displaymanager & displaymanagerver', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('secure').equal(1);
			expect(imp[0]).to.have.property('displaymanager').equal('Prebid.js');
			expect(imp[0]).to.have.property('displaymanagerver');
		});

		it('should include the properties topframe and format as an array', () => {
			const request = spec.buildRequests(validBidRequests, bidderRequest);
			const { imp } = request?.data;
			expect(imp).to.be.an('array');
			expect(imp[0]).to.have.property('banner').to.have.property('topframe');
			expect(imp[0]).to.have.property('banner').to.have.property('format').to.be.an('array');
		});

		describe('VIDEO', () => {
			beforeEach(() => {
				utilsLogWarnMock = sinon.stub(utils, 'logWarn');
				videoBidderRequest = utils.deepClone(bidderRequest);
				delete videoBidderRequest.bids[0].mediaTypes.banner;
				videoBidderRequest.bids[0].mediaTypes.video = {
					skip: 1,
					mimes: ['video/mp4', 'video/x-flv'],
					minduration: 5,
					maxduration: 30,
					startdelay: 5,
					playbackmethod: [1, 3],
					api: [1, 2],
					protocols: [2, 3],
					battr: [13, 14],
					linearity: 1,
					placement: 2,
					plcmt: 1,
					minbitrate: 10,
					maxbitrate: 10,
					playerSize: [640, 480]
				}
			});

			afterEach(() => {
				utilsLogWarnMock.restore();
			})

			it('should generate request with mediatype video', () => {
				const request = spec.buildRequests(validBidRequests, videoBidderRequest);
				const { imp } = request?.data;
				expect(imp).to.be.an('array');
				expect(imp[0]).to.have.property('video');
			});

			it('should log a warning if plcmt is missing', () => {
				delete videoBidderRequest.bids[0].mediaTypes.video.playerSize;
				const request = spec.buildRequests(validBidRequests, videoBidderRequest);
				const { imp } = request?.data;
				expect(imp).to.be.an('array');
				sinon.assert.called(utils.logWarn);
			});

			it('should log a warning if playerSize is missing', () => {
				delete videoBidderRequest.bids[0].mediaTypes.video.plcmt;
				const request = spec.buildRequests(validBidRequests, videoBidderRequest);
				const { imp } = request?.data;
				expect(imp).to.be.an('array');
				sinon.assert.called(utils.logWarn);
				expect(imp.video).to.be.undefined;
			});

			it('should have all supporting parameters', () => {
				const request = spec.buildRequests(validBidRequests, videoBidderRequest);
				const { imp } = request?.data;
				expect(imp).to.be.an('array');
				expect(imp[0]).to.have.property('video');
				expect(imp[0]).to.have.property('video').to.have.property('mimes');
				expect(imp[0]).to.have.property('video').to.have.property('minbitrate');
				expect(imp[0]).to.have.property('video').to.have.property('maxbitrate');
				expect(imp[0]).to.have.property('video').to.have.property('minduration');
				expect(imp[0]).to.have.property('video').to.have.property('maxduration');
				expect(imp[0]).to.have.property('video').to.have.property('plcmt');
				expect(imp[0]).to.have.property('video').to.have.property('battr');
				expect(imp[0]).to.have.property('video').to.have.property('startdelay');
				expect(imp[0]).to.have.property('video').to.have.property('playbackmethod');
				expect(imp[0]).to.have.property('video').to.have.property('api');
				expect(imp[0]).to.have.property('video').to.have.property('protocols');
				expect(imp[0]).to.have.property('video').to.have.property('linearity');
				expect(imp[0]).to.have.property('video').to.have.property('placement');
				expect(imp[0]).to.have.property('video').to.have.property('skip');
				expect(imp[0]).to.have.property('video').to.have.property('w');
				expect(imp[0]).to.have.property('video').to.have.property('h');
			});
		});

		describe('NATIVE', () => {
			beforeEach(() => {
				utilsLogWarnMock = sinon.stub(utils, 'logWarn');
				nativeBidderRequest = utils.deepClone(bidderRequest);
				delete nativeBidderRequest.bids[0].mediaTypes.banner;
				nativeBidderRequest.bids[0].nativeOrtbRequest = {
					ver: '1.2',
					assets: [{
						id: 0,
						img: {
							'type': 3,
							'w': 300,
							'h': 250
						},
						required: 1,
					}]
				}
				nativeBidderRequest.bids[0].mediaTypes.native = {
					title: {
						required: true,
						length: 80
					},
					image: {
						required: true,
						sizes: [300, 250]
					},
					sponsoredBy: {
						required: true
					}
				}
			});

			afterEach(() => {
				utilsLogWarnMock.restore();
			})

			it('should generate request with mediatype native', () => {
				const request = spec.buildRequests(validBidRequests, nativeBidderRequest);
				const { imp } = request?.data;
				expect(imp).to.be.an('array');
				expect(imp[0]).to.have.property('native');
			});
		});
	});	
  });
})
