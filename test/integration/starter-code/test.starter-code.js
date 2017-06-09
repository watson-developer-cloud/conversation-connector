'use strict';

/**
 * Starter Code Integration Tests (pre-conversation and post-conversation)
 */

const assert = require('assert');
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
  let expectedResult;

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
      provider: 'slack',
      channel_id: 'D024BE91L',
      message: 'Turn on lights'
    };

    expectedResult = {
      channel: 'D024BE91L',
      text: 'Output text from mock-convo.'
    };
  });

  it('validate starter-code actions work', () => {
    const actionName = 'starter-code/integration-pipeline';

    return ow.actions
      .invoke({
        name: actionName,
        blocking: true,
        result: true,
        params
      })
      .then(
        success => {
          assert.deepEqual(success, expectedResult);
        },
        error => {
          assert(false, error);
        }
      );
  }).retries(5);
});
