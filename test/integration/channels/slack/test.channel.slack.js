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
 *  Slack channel integration tests
 */
const assert = require('assert');
const openwhisk = require('openwhisk');

const envParams = process.env;

const pipelineName = envParams.__TEST_PIPELINE_NAME;

const outputText = 'Message coming from Slack integration test.';

describe('Slack channel integration tests', () => {
  const ow = openwhisk();

  let params;
  let expectedResults;
  let attachmentData;
  let attachmentPayload;

  beforeEach(() => {
    params = {
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXX',
      event: {
        type: 'message',
        channel: envParams.__TEST_SLACK_CHANNEL,
        user: 'UXXXXXXXXXX',
        text: outputText,
        ts: 'XXXXXXXXX.XXXXXX'
      },
      type: 'event_callback',
      authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
      event_id: 'EvXXXXXXXX',
      event_time: 'XXXXXXXXXX'
    };

    expectedResults = {
      as_user: 'true',
      channel: envParams.__TEST_SLACK_CHANNEL,
      text: outputText,
      token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
    };

    attachmentData = [
      {
        actions: [
          {
            name: 'test_option_one',
            text: 'Test Option One',
            type: 'button',
            value: 'test option one'
          },
          {
            name: 'test_option_two',
            text: 'Test Option Two',
            type: 'button',
            value: 'test option two'
          },
          {
            name: 'test_option_three',
            text: 'Test Option Three',
            type: 'button',
            value: 'test option three'
          }
        ],
        fallback: 'Buttons not working...',
        callback_id: 'test_integration_options'
      }
    ];

    attachmentPayload = {
      actions: [
        {
          name: 'test_option_one',
          value: 'test option one',
          type: 'button'
        }
      ],
      team: {
        name: 'test_team',
        id: 'TXXXXXXXX'
      },
      channel: {
        name: 'test_channel',
        id: envParams.__TEST_SLACK_CHANNEL
      },
      user: {
        name: 'test_user',
        id: 'UXXXXXXXXXX'
      },
      original_message: {
        text: outputText
      },
      callback_id: 'test_integration_options',
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN
    };
  });

  it('validate slack channel receives and posts text', () => {
    const sequenceName = `${pipelineName}_slack/integration-pipeline`;

    return ow.actions
      .invoke({
        name: sequenceName,
        blocking: true,
        result: true,
        params
      })
      .then(
        success => {
          assert.deepEqual(success, expectedResults);
        },
        error => {
          assert(false, error);
        }
      );
  }).retries(4);

  it('validate slack receives text and posts an attached message', () => {
    const sequenceName = `${pipelineName}_slack/integration-pipeline-text-to-attached-message`;

    expectedResults.attachments = attachmentData;

    return ow.actions
      .invoke({
        name: sequenceName,
        blocking: true,
        result: true,
        params
      })
      .then(
        result => {
          assert.deepEqual(result, expectedResults);
        },
        error => {
          assert(false, error);
        }
      );
  }).retries(4);

  it(
    'validate slack receives an attached message and posts a message update',
    () => {
      const sequenceName = `${pipelineName}_slack/integration-pipeline-attached-message-to-response`;

      params = {
        payload: JSON.stringify(attachmentPayload)
      };

      expectedResults.attachments = [{ text: outputText }];

      return ow.actions
        .invoke({
          name: sequenceName,
          blocking: true,
          result: true,
          params
        })
        .then(
          result => {
            assert.deepEqual(result, expectedResults);
          },
          error => {
            assert(false, error);
          }
        );
    }
  ).retries(4);
});
