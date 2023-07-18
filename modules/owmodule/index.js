
import {config} from '../../src/config.js';

export let init = () => { // TDD, i/o : done
  let prebidConfig = {};
  setPrebidConfig(prebidConfig);
  /* eslint-disable no-console */
  console.log('I am ow module', prebidConfig);
  config.setConfig(prebidConfig);
};

function setPrebidConfig(prebidConfig) {
  getFloorsConfiguration(prebidConfig);
}

function getFloorsConfiguration(prebidConfig) {
  prebidConfig['floors'] = {
    enforcement: {
      enforceJS: false
    },
    auctionDelay: 100,
    endpoint: {
      url: 'https://stagingams.pubmatic.com:8443/openwrap/bidfloor/pattern_mediatype.json'
    }
  }
}

init()
