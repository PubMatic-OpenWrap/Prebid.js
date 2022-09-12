import * as floorData from 'modules/floorData/index.js';
import * as sinon from 'sinon';
import {expect, spy} from 'chai';

describe('floor additional data points', function () {
  let sandbox;
  let frequencyDepth = {
    pageView: 1,
    slotCnt: 2,
    bidServed: 4,
    impressionServed: 1,
    slotLevelFrquencyDepth: {

    },
    timestamp: {
      date: new Date().getDate(),
      hours: new Date().getHours()
    }
  }

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    sandbox.stub(floorData, 'auctionInitHandler').returns(frequencyDepth);
    sandbox.stub(floorData, 'auctionEndHandler').returns(frequencyDepth);
    sandbox.stub(floorData, 'auctionBidResponseHandler').returns(frequencyDepth);
    sandbox.stub(floorData, 'auctionBidWonHandler').returns(frequencyDepth);
    done();
  });

  afterEach(function (done) {
    sandbox.restore();
    done();
  });

  it('should call auctionInit handler and return storage object', function() {
    const response = floorData.auctionInitHandler();
    expect(response).to.equal(frequencyDepth);
    expect(response.pageView).to.equal(1);
    expect(response.slotCnt).to.equal(2);
    expect(response.bidServed).to.equal(4);
    expect(response.impressionServed).to.equal(1);
  })

  it('should call auctionEnd handler and return storage object', function() {
    const response = floorData.auctionEndHandler();
    expect(response).to.equal(frequencyDepth);
  })

  it('should call auctionBid handler and return storage object', function() {
    const response = floorData.auctionBidResponseHandler();
    frequencyDepth.slotLevelFrquencyDepth = {'/43743431/DMDemo': {
      bidServed: 1
    }}
  	expect(response).to.equal(frequencyDepth);
    expect(response.bidServed).to.equal(4);
    expect(response.slotLevelFrquencyDepth['/43743431/DMDemo'].bidServed).to.equal(1);
  })

  it('should call auctionBidWon handler and return storage object', function() {
    const response = floorData.auctionBidWonHandler();
  	expect(response).to.equal(frequencyDepth);
    expect(response.impressionServed).to.equal(1);
  })
})
