import * as compAnalyticsAdapter from 'modules/complianceAnalyticsAdapter.js';
import complianceAnalyticsAdapter from 'modules/complianceAnalyticsAdapter.js';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';
import { getGlobal } from '../../../src/prebidGlobal';

let events = require('src/events');
let utils = require('src/utils');


window.PWT = window.IHPWT || {};
// window.PWT.ihAnalyticsAdapterExpiry = 7;

const {
  EVENTS: {
    COMPLIANCE_INIT
  }
} = CONSTANTS;

function getLoggerJsonFromRequest(requestBody) {
  return JSON.parse(decodeURIComponent(requestBody.split('json=')[1]));
}

describe('compliance analytics adapter', function () {
  let sandbox;
  let xhr;
  let requests;
  let clock;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
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
    complianceAnalyticsAdapter.enableAnalytics({
      options: {}
    });
    expect(utils.logError.called).to.equal(true);
  });

  describe('when handling events', function() {
    var obj = null;
    var newSpy;
    beforeEach(function () {
     
      sandbox.stub(compAnalyticsAdapter, 'collectBasicConsentData')
      complianceAnalyticsAdapter.enableAnalytics({
        options: {
          publisherId: '5890',
          profileId: '20',
          profileVersionId: '1',
          identityOnly: 2, // OW profile
          domain: 'www.test-pubmatic.com',
          userIDModules: ['hadronId', 'id5IdSystem'],
          cmpConfig: {
            gdprEnabled: '1',
            cmpApi: 'iab',
            gdprTO: 10000,
            // actionTO: CONFIG.getActionTimeout(),
            ccpaEnabled: '0',
            ccpaCmpAPI: '',
            ccpaTO: '0'
          }
        }
      });
    });

    afterEach(function () {
      window.PWT = {};
      complianceAnalyticsAdapter.disableAnalytics();
     
      sandbox.restore();
    });

    xit('COMPLIANCE_INIT: expect collectBasicConsentData to be called when cmp loads', function() {
      events.emit(COMPLIANCE_INIT, {
        'consentData': {
          'eventStatus': 'tcloaded'
        }
      });
      console.log('1 ', compAnalyticsAdapter.collectBasicConsentData);
      newSpy.called.should.be.true;
      // expect(compAnalyticsAdapter.collectBasicConsentData).to.be.called;
      // compAnalyticsAdapter.collectBasicConsentData.should.have.been.called();
      sinon.assert.callCount(compAnalyticsAdapter.collectBasicConsentData, 1);

      // done();
      console.log('2');
    });
  });
});
