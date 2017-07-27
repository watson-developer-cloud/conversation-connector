'use strict';

/**
 * Starter Code Integration Tests (pre-conversation and post-conversation)
 */

const assert = require('assert');
const openwhisk = require('openwhisk');
const openWhiskAuthObj = require('../../resources/openwhisk-bindings.json').openwhisk;
const facebookBindings = require('./../../resources/facebook-bindings.json').facebook;

describe('starter-code integration tests for facebook', () => {
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
      facebook: {
        app_secret: facebookBindings.app_secret,
        object: 'page',
        entry: [
          {
            id: facebookBindings.sender.id,
            time: 1458692752478,
            messaging: [
              {
                sender: facebookBindings.recipient,
                recipient: facebookBindings.sender,
                message: {
                  text: 'hello, world!'
                }
              }
            ]
          }
        ]
      },
      provider: 'facebook'
    };

    expectedResult = {
      message: {
        text: 'Output text from mock-convo.'
      },
      recipient: facebookBindings.recipient,
      workspace_id: 'e808d814-9143-4dce-aec7-68af02e650a8',
      raw_input_data: {
        cloudant_key: 'facebook_1481847138543615_e808d814-9143-4dce-aec7-68af02e650a8_185643828639058',
        conversation: {
          input: {
            text: 'hello, world!'
          }
        },
        facebook: params.facebook,
        provider: 'facebook'
      },
      raw_output_data: {
        conversation: {
          context: {
            conversation_id: '06aae48c-a5a9-4bbc-95eb-2ddd26db9a7b',
            system: {
              _node_output_map: {
                'Anything else': [0]
              },
              branch_exited: true,
              branch_exited_reason: 'completed',
              dialog_request_counter: 1,
              dialog_stack: [
                {
                  dialog_node: 'root'
                }
              ],
              dialog_turn_counter: 1
            }
          },
          output: {
            text: ['Output text from mock-convo.']
          }
        }
      }
    };
  });

  it('validate starter-code-facebook actions work', () => {
    const actionName = 'starter-code/integration-pipeline-facebook';

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
