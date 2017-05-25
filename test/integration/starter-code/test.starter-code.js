'use strict';

const assert = require('assert');
const normalize = require('../../../starter-code/normalize');
const openwhisk = require('openwhisk');
const openWhiskAuthObj = require('../../resources/openwhisk-bindings.json').openwhisk;

describe('starter-code integration tests', () => {
  // Setup the ow module for the upcoming calls
  const options = {
    apihost: openWhiskAuthObj.apihost,
    api_key: openWhiskAuthObj.api_key
  };
  const ow = openwhisk(options);
  let params;

  beforeEach(() => {
    params = {
      slack: {
        token: 'XXYYZZ',
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXXX',
        event: {
          type: 'message',
          channel: 'D024BE91L',
          user: 'U2147483697',
          text: 'Turn on lights',
          ts: '1355517523.000005'
        },
        type: 'event_callback',
        authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
        event_id: 'Ev08MFMKH6',
        event_time: 1234567890
      },
      provider: 'slack'
    };
  });

  it('call starter-code using OpenWhisk module ', () => {
    const name = 'starter-code/normalize';
    const blocking = true;
    const result = true;

    return ow.actions
      .invoke({ name, blocking, result, params })
      .then(response => {
        // response contains the raw JSON from the normalize action. It contains
        // OW information, such as what action was called, what namespace it was in

        // response.response contains the result of the action invocation, if it succeeded
        // or not.

        // response.response.result contains the full unaltered response from the action
        assert.equal(
          response.params.text,
          'Hi. It looks like a nice drive today. What would you like me to do?  ',
          'response posted to slack does not contain expected answer.'
        );
      })
      .catch(e => {
        assert(false, e);
      });
  }).timeout(16000);

  it('call starter-code using local sequence like approach', () => {
    params.ow_api_host = openWhiskAuthObj.apihost;
    params.ow_api_key = openWhiskAuthObj.api_key;

    return normalize
      .main(params)
      .then(response => {
        assert.equal(
          response.params.text,
          'Hi. It looks like a nice drive today. What would you like me to do?  ',
          'response posted to slack does not contain expected answer.'
        );
      })
      .catch(e => {
        assert(false, e);
      });
  }).timeout(8000);
});
