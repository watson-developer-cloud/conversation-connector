'use strict';

/**
 *  Slack channel integration tests
 */
const assert = require('assert');
const openwhisk = require('openwhisk');
const slackBindings = require('./../../../resources/bindings/slack-bindings.json').slack;

const pipelineName = process.env.__TEST_PIPELINE_NAME;

const outputText = 'Message coming from Slack integration test.';

describe('Slack channel integration tests', () => {
  const ow = openwhisk();

  let params;
  let expectedResults;
  let attachmentData;
  let attachmentPayload;

  beforeEach(() => {
    params = {
      token: slackBindings.verification_token,
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXX',
      event: {
        type: 'message',
        channel: slackBindings.channel,
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
      channel: slackBindings.channel,
      text: outputText,
      token: slackBindings.bot_access_token
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
        id: slackBindings.channel
      },
      user: {
        name: 'test_user',
        id: 'UXXXXXXXXXX'
      },
      original_message: {
        text: outputText
      },
      callback_id: 'test_integration_options',
      token: slackBindings.verification_token
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
  })
    .timeout(5000)
    .retries(4);

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
  })
    .timeout(5000)
    .retries(4);

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
  )
    .timeout(5000)
    .retries(4);
});
