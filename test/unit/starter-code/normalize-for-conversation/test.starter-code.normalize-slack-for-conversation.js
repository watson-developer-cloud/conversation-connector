/**
 * Copyright IBM Corp. 2017
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Unit Tests for normalizing slack JSON parameters to conversation SDK parameters.
 */

const assert = require('assert');

const envParams = process.env;

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const actionNormSlackForConversation = require('./../../../../starter-code/normalize-for-conversation/normalize-slack-for-conversation.js');

const channel = 'CXXXXXXXXX';
const text = 'Message coming from starter-code/normalize_slack_for_conversation unit test.';

const errorBadSupplier = "Provider not supplied or isn't Slack.";
const errorNoSlackData = 'Slack JSON data is missing.';

describe('Starter Code Normalize-Slack-For-Conversation Unit Tests', () => {
  let textMessageParams;
  let expectedResult;
  let buttonPayload;
  let buttonMessageParams;
  let func;

  const botId = 'bot-id';

  beforeEach(() => {
    textMessageParams = {
      slack: {
        token: 'XXYYZZ',
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXXX',
        event: {
          type: 'message',
          user: 'U2147483697',
          ts: '1355517523.000005',
          channel,
          text
        },
        type: 'event_callback',
        authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
        event_id: 'Ev08MFMKH6',
        event_time: 1234567890
      },
      provider: 'slack',
      context: {},
      bot_id: botId,
      auth: {
        conversation: {
          username: envParams.__TEST_CONVERSATION_USERNAME,
          password: envParams.__TEST_CONVERSATION_PASSWORD,
          workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
        }
      }
    };

    expectedResult = {
      conversation: {
        input: {
          text
        }
      },
      raw_input_data: {
        slack: textMessageParams.slack,
        provider: 'slack',
        bot_id: botId,
        auth: {
          conversation: {
            username: envParams.__TEST_CONVERSATION_USERNAME,
            password: envParams.__TEST_CONVERSATION_PASSWORD,
            workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
          }
        },
        cloudant_context_key: `slack_TXXXXXXXX_${envParams.__TEST_CONVERSATION_WORKSPACE_ID}_U2147483697_CXXXXXXXXX`
      }
    };

    buttonPayload = {
      actions: [
        {
          name: 'shirt_size_small',
          value: text,
          type: 'button'
        }
      ],
      team: {
        id: 'TXXXXXXXX',
        name: 'test_team'
      },
      user: {
        id: 'U2147483697',
        name: 'test_user'
      },
      channel: {
        id: channel,
        name: 'test_channel'
      },
      callback_id: 'test_callback_id',
      token: 'XXYYZZ'
    };

    buttonMessageParams = {
      slack: {
        payload: JSON.stringify(buttonPayload)
      },
      provider: 'slack',
      bot_id: botId,
      auth: {
        conversation: {
          username: envParams.__TEST_CONVERSATION_USERNAME,
          password: envParams.__TEST_CONVERSATION_PASSWORD,
          workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
        }
      },
      context: {}
    };
  });

  it('validate normalizing works for a regular text message', () => {
    func = actionNormSlackForConversation.main;

    return func(textMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for buttons', () => {
    expectedResult.raw_input_data.slack = buttonMessageParams.slack;

    func = actionNormSlackForConversation.main;

    return func(buttonMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for menus', () => {
    const menuPayload = buttonPayload;
    menuPayload.actions = [
      {
        name: 'shirt_size',
        selected_options: [{ value: text }, {}]
      }
    ];
    const menuMessageParams = buttonMessageParams;
    menuMessageParams.slack.payload = JSON.stringify(menuPayload);

    expectedResult.raw_input_data.slack = menuMessageParams.slack;

    func = actionNormSlackForConversation.main;

    return func(menuMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for edited messages', () => {
    textMessageParams.slack.event.message = {
      user: 'U2147483697',
      ts: '1355517523.000005',
      text
    };
    delete textMessageParams.slack.event.user;
    delete textMessageParams.slack.event.ts;
    delete textMessageParams.slack.event.text;

    expectedResult.raw_input_data.slack = textMessageParams.slack;

    func = actionNormSlackForConversation.main;

    return func(textMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when provider missing', () => {
    delete textMessageParams.provider;
    func = actionNormSlackForConversation.validateParameters;
    try {
      func(textMessageParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorBadSupplier);
    }
  });

  it('validate error when slack data missing', () => {
    delete textMessageParams.slack;
    func = actionNormSlackForConversation.validateParameters;
    try {
      func(textMessageParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoSlackData);
    }
  });
});
