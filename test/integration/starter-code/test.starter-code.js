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
      message: 'Turn on lights',
      context: {}
    };

    expectedResult = {
      channel: 'D024BE91L',
      text: 'Output text from mock-convo.',
      ow_api_host: options.apihost,
      ow_api_key: options.api_key,
      workspace_id: 'e808d814-9143-4dce-aec7-68af02e650a8',
      raw_input_data: {
        conversation: {
          input: {
            text: 'Turn on lights'
          }
        },
        slack: params.slack,
        provider: 'slack',
        cloudant_key: 'slack_TXXXXXXXX_e808d814-9143-4dce-aec7-68af02e650a8_U2147483697_D024BE91L'
      },
      raw_output_data: {
        conversation: {
          output: {
            text: ['Output text from mock-convo.']
          },
          context: {
            conversation_id: '06aae48c-a5a9-4bbc-95eb-2ddd26db9a7b',
            system: {
              branch_exited_reason: 'completed',
              dialog_request_counter: 1,
              branch_exited: true,
              dialog_turn_counter: 1,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              _node_output_map: {
                'Anything else': [0]
              }
            }
          }
        }
      }
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
