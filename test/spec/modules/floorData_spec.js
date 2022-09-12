import * as floorData from 'modules/floorData/index.js';
import * as sinon from 'sinon';
import {expect, spy} from 'chai';

describe('floor additional data points', function () {
  let sandbox;

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    sandbox.stub(floorData, 'auctionInitCode').returns(1);
    sandbox.stub(floorData, 'auctionEndCode').returns(1);
    sandbox.stub(floorData, 'auctionBidResponseCode').returns(1);
    sandbox.stub(floorData, 'auctionBidWonCode').returns(1);
    done();
  });

  afterEach(function (done) {
    sandbox.restore();
    done();
  });

  it('First test case', function() {
    expect(floorData.auctionInitCode()).to.equal(1);
    expect(floorData.auctionInitCode()).to.equal(1);
  })

  it('second test case', function() {
    expect(floorData.auctionEndCode()).to.equal(1);
  })

  it('thrid test case', function() {
  	expect(floorData.auctionBidResponseCode()).to.equal(1);
  })

  it('fourth test case', function() {
  	expect(floorData.auctionBidWonCode()).to.equal(1);
  })
})
