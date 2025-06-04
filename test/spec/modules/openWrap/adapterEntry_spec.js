
import * as util from '../../../../modules/openWrap/util.js';
import { AdapterEntry } from '../../../../modules/openWrap/adapterEntry.js';

describe('openWrap/adapterEntry.js', () => {
  let sandbox;
  let mockBid;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock getCurrentTimestampInMs function
    sandbox.stub(util, 'getCurrentTimestampInMs').returns(1234567890);

    // Create a mock bid object
    mockBid = {
      getBidID: sandbox.stub().returns('bid123'),
      id: 'bid123'
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Constructor', () => {
    it('should initialize with adapterID', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      expect(adapterEntry.adapterID).to.equal('adapter1');
      expect(adapterEntry.callInitiatedTime).to.equal(1234567890);
      expect(adapterEntry.bids).to.deep.equal({});
      expect(adapterEntry.lastBidID).to.equal('');
    });

    it('should set callInitiatedTime using util.getCurrentTimestampInMs', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      expect(adapterEntry.callInitiatedTime).to.equal(1234567890);
      expect(util.getCurrentTimestampInMs.calledOnce).to.be.true;
    });
  });

  describe('getCallInitiatedTime', () => {
    it('should return the callInitiatedTime', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      expect(adapterEntry.getCallInitiatedTime()).to.equal(1234567890);
    });

    it('should return the same value on multiple calls', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      const firstCall = adapterEntry.getCallInitiatedTime();
      const secondCall = adapterEntry.getCallInitiatedTime();
      expect(firstCall).to.equal(secondCall);
    });
  });

  describe('getLastBidID', () => {
    it('should return the lastBidID', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      adapterEntry.lastBidID = 'lastBid123';
      expect(adapterEntry.getLastBidID()).to.equal('lastBid123');
    });

    it('should return empty string when no lastBidID is set', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      expect(adapterEntry.getLastBidID()).to.equal('');
    });
  });

  describe('getBid', () => {
    it('should return null when no bid exists for the given bidID', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      expect(adapterEntry.getBid('nonexistent')).to.be.null;
    });

    it('should return the bid for a given bidID', () => {
      const adapterEntry = new AdapterEntry('adapter1');
      const mockBid = { id: 'bid123' };
      adapterEntry.bids['bid123'] = mockBid;
      expect(adapterEntry.getBid('bid123')).to.equal(mockBid);
    });

    it('should check bid existence using util.isOwnProperty', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      // Mock isOwnProperty function
      sandbox.stub(util, 'isOwnProperty').returns(true);

      // Add a mock bid
      adapterEntry.bids['bid123'] = { id: 'bid123' };

      adapterEntry.getBid('bid123');

      expect(util.isOwnProperty.calledOnce).to.be.true;
      expect(util.isOwnProperty.calledWith(adapterEntry.bids, 'bid123')).to.be.true;
    });
  });

  describe('setNewBid', () => {
    it('should delete the last bid and set the new one', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      // Setup initial state with an existing bid
      const oldBid = { id: 'oldBid' };
      adapterEntry.lastBidID = 'oldBid';
      adapterEntry.bids['oldBid'] = oldBid;

      // Mock new bid
      const newBid = {
        getBidID: sandbox.stub().returns('newBid')
      };

      adapterEntry.setNewBid(newBid);

      // Verify the old bid is deleted
      expect(adapterEntry.bids).to.not.have.property('oldBid');

      // Verify the new bid is added and lastBidID is updated
      expect(adapterEntry.bids).to.have.property('newBid');
      expect(adapterEntry.bids['newBid']).to.equal(newBid);
      expect(adapterEntry.lastBidID).to.equal('newBid');
    });

    it('should handle the case when there is no previous bid', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      // Ensure no previous bid is set
      expect(adapterEntry.lastBidID).to.equal('');

      // Mock new bid
      const newBid = {
        getBidID: sandbox.stub().returns('newBid')
      };

      adapterEntry.setNewBid(newBid);

      // Verify the new bid is added and lastBidID is updated
      expect(adapterEntry.bids).to.have.property('newBid');
      expect(adapterEntry.bids['newBid']).to.equal(newBid);
      expect(adapterEntry.lastBidID).to.equal('newBid');
    });

    it('should handle the case when getBidID returns a different value', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      // Setup initial state with an existing bid
      const oldBid = { id: 'oldBid' };
      adapterEntry.lastBidID = 'oldBid';
      adapterEntry.bids['oldBid'] = oldBid;

      // Mock new bid with a different bid ID
      const newBid = {
        getBidID: sandbox.stub().returns('completelyDifferentBidID')
      };

      adapterEntry.setNewBid(newBid);

      // Verify the old bid is deleted
      expect(adapterEntry.bids).to.not.have.property('oldBid');

      // Verify the new bid is added and lastBidID is updated
      expect(adapterEntry.bids).to.have.property('completelyDifferentBidID');
      expect(adapterEntry.bids['completelyDifferentBidID']).to.equal(newBid);
      expect(adapterEntry.lastBidID).to.equal('completelyDifferentBidID');
    });

    it('should handle multiple calls by maintaining only the latest bid', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      // First bid
      const firstBid = {
        getBidID: sandbox.stub().returns('bid1')
      };
      adapterEntry.setNewBid(firstBid);

      // Second bid
      const secondBid = {
        getBidID: sandbox.stub().returns('bid2')
      };
      adapterEntry.setNewBid(secondBid);

      // Third bid
      const thirdBid = {
        getBidID: sandbox.stub().returns('bid3')
      };
      adapterEntry.setNewBid(thirdBid);

      // Verify only the last bid is maintained
      expect(adapterEntry.bids).to.not.have.property('bid1');
      expect(adapterEntry.bids).to.not.have.property('bid2');
      expect(adapterEntry.bids).to.have.property('bid3');
      expect(adapterEntry.lastBidID).to.equal('bid3');
    });
  });

  // Test class behavior with different adapter IDs
  describe('Behavior with different adapter IDs', () => {
    it('should keep separate state for different adapter instances', () => {
      const adapterEntry1 = new AdapterEntry('adapter1');
      const adapterEntry2 = new AdapterEntry('adapter2');

      // Mock bids
      const bid1 = {
        getBidID: sandbox.stub().returns('bid1')
      };

      const bid2 = {
        getBidID: sandbox.stub().returns('bid2')
      };

      // Add bids to respective adapters
      adapterEntry1.setNewBid(bid1);
      adapterEntry2.setNewBid(bid2);

      // Verify each adapter maintains its own state
      expect(adapterEntry1.adapterID).to.equal('adapter1');
      expect(adapterEntry1.lastBidID).to.equal('bid1');
      expect(adapterEntry1.bids).to.have.property('bid1');

      expect(adapterEntry2.adapterID).to.equal('adapter2');
      expect(adapterEntry2.lastBidID).to.equal('bid2');
      expect(adapterEntry2.bids).to.have.property('bid2');
    });
  });

  // Edge case tests
  describe('Edge cases', () => {
    it('should handle undefined or null bid object gracefully', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      // This should not throw an error
      expect(() => {
        adapterEntry.setNewBid(undefined);
      }).to.throw(); // Since getBidID() would be called on undefined

      expect(() => {
        adapterEntry.setNewBid(null);
      }).to.throw(); // Since getBidID() would be called on null
    });

    it('should handle bid objects without getBidID method', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      const invalidBid = {
        // No getBidID method
      };

      // This should throw an error because getBidID is not a function
      expect(() => {
        adapterEntry.setNewBid(invalidBid);
      }).to.throw();
    });

    it('should handle bid objects where getBidID returns null or undefined', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      const nullBidId = {
        getBidID: sandbox.stub().returns(null)
      };

      const undefinedBidId = {
        getBidID: sandbox.stub().returns(undefined)
      };

      // These should not throw errors and should handle the null/undefined values appropriately
      adapterEntry.setNewBid(nullBidId);
      expect(adapterEntry.lastBidID).to.be.null;

      adapterEntry.setNewBid(undefinedBidId);
      expect(adapterEntry.lastBidID).to.be.undefined;
    });
  });

  // Test integration scenarios
  describe('Integration scenarios', () => {
    it('should work in a complete bidding flow scenario', () => {
      const adapterEntry = new AdapterEntry('adapter1');

      // Initial bid with getBidID method
      const initialBid = {
        getBidID: sandbox.stub().returns('initial-bid'),
        amount: 1.0
      };

      // Set initial bid and verify state
      adapterEntry.setNewBid(initialBid);
      expect(adapterEntry.getLastBidID()).to.equal('initial-bid');
      expect(adapterEntry.getBid('initial-bid')).to.equal(initialBid);

      // Another bid comes in with higher amount
      const higherBid = {
        getBidID: sandbox.stub().returns('higher-bid'),
        amount: 1.5
      };

      // Set higher bid and verify state
      adapterEntry.setNewBid(higherBid);
      expect(adapterEntry.getLastBidID()).to.equal('higher-bid');
      expect(adapterEntry.getBid('higher-bid')).to.equal(higherBid);
      expect(adapterEntry.getBid('initial-bid')).to.be.null; // Initial bid should be removed

      // Final and winning bid
      const winningBid = {
        getBidID: sandbox.stub().returns('winning-bid'),
        amount: 2.0
      };

      // Set winning bid and verify state
      adapterEntry.setNewBid(winningBid);
      expect(adapterEntry.getLastBidID()).to.equal('winning-bid');
      expect(adapterEntry.getBid('winning-bid')).to.equal(winningBid);
      expect(adapterEntry.getBid('higher-bid')).to.be.null; // Higher bid should be removed
    });
  });
});
