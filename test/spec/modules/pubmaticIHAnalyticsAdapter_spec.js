import pubmaticIHAnalyticsAdapter, { getMetadata } from 'modules/pubmaticIHAnalyticsAdapter.js';
import CONSTANTS from 'src/constants.json';
import {server} from '../../mocks/xhr.js';
import { config } from 'src/config.js';
import { getCoreStorageManager } from 'src/storageManager.js';

let events = require('src/events');
let utils = require('src/utils');

window.IHPWT = window.IHPT || {};
window.IHPWT.ihAnalyticsAdapterExpiry = 7;
export const coreStorage = getCoreStorageManager('userid');

function getLoggerJsonFromRequest(requestBody) {
  return JSON.parse(decodeURIComponent(requestBody.split('json=')[1]));
}

const {
  EVENTS: {
    IH_INIT
  }
} = CONSTANTS;

describe('pubmatic analytics adapter', function () {
  let sandbox;
  let xhr;
  let requests;
  let clock;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = server.requests;

    xhr.onCreate = request => requests.push(request);

    sandbox.stub(events, 'getEvents').returns([]);

    clock = sandbox.useFakeTimers(1519767013781);
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  it('should require publisherId', function () {
    sandbox.stub(utils, 'logError');
    pubmaticIHAnalyticsAdapter.enableAnalytics({
      options: {}
    });
    expect(utils.logError.called).to.equal(true);
  });

  describe('when handling events', function() {
    beforeEach(function () {
      pubmaticIHAnalyticsAdapter.enableAnalytics({
        options: {
          publisherId: 9999,
          profileId: 1111,
          profileVersionId: 20,
          identityOnly: 1
        }
      });
    });

    afterEach(function () {
      window.PWT = {};
      pubmaticIHAnalyticsAdapter.disableAnalytics();
    });

    it('IH_INIT: Logger fired when identity hub initialises', function() {
      events.emit(IH_INIT, {});
      let request = requests[0];

      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data).to.be.not.null;
    });

    it('IH_INIT: expect request data to match actual values', function() {
      events.emit(IH_INIT, {});
      let request = requests[0];

      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.pubid).to.be.equal('9999');
      expect(data.pid).to.be.equal('1111');
      expect(data.pdvid).to.be.equal('20');
      expect(data.ih).to.be.equal(1);
      expect(data.orig).to.be.equal('');
    });
  });
});
