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

const SLEEP_TIME = 3000;

const outputText = 'Message coming from Slack integration test.';

describe('Slack channel integration tests', () => {
  const ow = openwhisk();

  let params;
  let expectedResult;
  let expectedPipelineResult;
  let expectedMultiPostResult;
  let attachmentData;
  let attachmentPayload;

  const auth = {
    slack: {
      client_id: envParams.__TEST_SLACK_CLIENT_ID,
      client_secret: envParams.__TEST_SLACK_CLIENT_SECRET,
      verification_token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      bot_users: {
        'bot-id': {
          access_token: envParams.__TEST_SLACK_ACCESS_TOKEN,
          bot_access_token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
        }
      }
    }
  };

  beforeEach(() => {
    params = {
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXX',
      event: {
        type: 'message',
        channel: 'DXXXXXXXX',
        user: 'bot-id',
        text: outputText,
        ts: 'XXXXXXXXX.XXXXXX'
      },
      type: 'event_callback',
      authed_users: ['UXXXXXXX1', 'UXXXXXXX2', 'bot-id'],
      event_id: 'EvXXXXXXXX',
      event_time: 'XXXXXXXXXX'
    };

    expectedResult = {
      provider: 'slack',
      slack: params,
      bot_id: 'bot-id',
      auth
    };

    expectedPipelineResult = {
      postResponses: {
        successfulPosts: [
          {
            successResponse: {
              as_user: 'true',
              channel: 'DXXXXXXXX',
              text: outputText,
              token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
            },
            activationId: ''
          }
        ],
        failedPosts: []
      }
    };

    expectedMultiPostResult = {
      postResponses: {
        successfulPosts: [
          {
            successResponse: {
              channel: 'DXXXXXXXX',
              text: 'Here is your multi-modal response.',
              token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN,
              as_user: 'true'
            },
            activationId: ''
          },
          {
            successResponse: {
              channel: 'DXXXXXXXX',
              attachments: [
                {
                  title: 'Image title',
                  pretext: 'Image description',
                  image_url: 'https://s.w-x.co/240x180_twc_default.png'
                }
              ],
              token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN,
              as_user: 'true'
            },
            activationId: ''
          },
          {
            successResponse: {
              channel: 'DXXXXXXXX',
              attachments: [
                {
                  text: 'Choose your location',
                  callback_id: 'Choose your location',
                  actions: [
                    {
                      name: 'Location 1',
                      type: 'button',
                      text: 'Location 1',
                      value: 'Location 1'
                    },
                    {
                      name: 'Location 2',
                      type: 'button',
                      text: 'Location 2',
                      value: 'Location 2'
                    },
                    {
                      name: 'Location 3',
                      type: 'button',
                      text: 'Location 3',
                      value: 'Location 3'
                    }
                  ]
                }
              ],
              token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN,
              as_user: 'true'
            },
            activationId: ''
          }
        ],
        failedPosts: []
      }
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
        id: 'DXXXXXXXX'
      },
      user: {
        name: 'test_user',
        id: 'UXXXXXXXXXX'
      },
      original_message: {
        text: outputText,
        user: 'bot-id'
      },
      callback_id: 'test_integration_options',
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN
    };
  });

  it('validate slack channel receives and posts text', () => {
    const testPipeline = `${pipelineName}-integration-slack-send-text`;

    return ow.actions
      .invoke({
        name: `${testPipeline}_slack/receive`,
        blocking: true,
        result: true,
        params
      })
      .then(result => {
        // assert slack/receive result is correct
        const filteredResult = result;
        delete filteredResult.auth._id;
        delete filteredResult.auth._rev;
        delete filteredResult.auth._revs_info;
        assert.deepEqual(filteredResult, expectedResult);

        // assert pipeline result is correct
        return ow.activations
          .list()
          .then(activations => {
            for (let i = 0; i < activations.length; i += 1) {
              if (activations[i].name === testPipeline) {
                return activations[i].activationId;
              }
            }
            throw new Error('No activations found.');
          })
          .then(activationId => {
            return ow.activations.get({ name: activationId });
          })
          .then(res => {
            const response = res.response.result;
            if (response.error) {
              throw new Error(response.error);
            }
            return response;
          })
          .then(res => {
            // Update the expectedPipelineResult's activationId, since this is dynamically generated we can't predict it
            expectedPipelineResult.postResponses.successfulPosts[
              0
            ].activationId = res.postResponses.successfulPosts[0].activationId;
            assert.deepEqual(res, expectedPipelineResult);
          })
          .catch(error => {
            assert(false, error);
          });
      })
      .catch(error => {
        assert(false, error);
      });
  }).retries(10);

  it('validate slack receives text and posts an attached message', () => {
    const testPipeline = `${pipelineName}-integration-slack-send-attached-message`;

    expectedPipelineResult.postResponses.successfulPosts[
      0
    ].successResponse.attachments = attachmentData;

    return ow.actions
      .invoke({
        name: `${testPipeline}_slack/receive`,
        blocking: true,
        result: true,
        params
      })
      .then(result => {
        // assert slack/receive result is correct
        const filteredResult = result;
        delete filteredResult.auth._id;
        delete filteredResult.auth._rev;
        delete filteredResult.auth._revs_info;
        assert.deepEqual(result, expectedResult);

        // assert pipeline result is correct
        return ow.activations
          .list()
          .then(activations => {
            for (let i = 0; i < activations.length; i += 1) {
              if (activations[i].name === testPipeline) {
                return activations[i].activationId;
              }
            }
            throw new Error('No activations found.');
          })
          .then(activationId => {
            return ow.activations.get({ name: activationId });
          })
          .then(res => {
            const response = res.response.result;
            if (response.error) {
              throw new Error(response.error);
            }
            return response;
          })
          .then(res => {
            // Update the expectedPipelineResult's activationId, since this is dynamically generated we can't predict it
            expectedPipelineResult.postResponses.successfulPosts[
              0
            ].activationId = res.postResponses.successfulPosts[0].activationId;
            assert.deepEqual(res, expectedPipelineResult);
          })
          .catch(error => {
            assert(false, error);
          });
      })
      .catch(error => {
        assert(false, error);
      });
  }).retries(10);

  it('validate slack receives an attached message and posts an update', () => {
    const testPipeline = `${pipelineName}-integration-slack-send-attached-response`;

    params = {
      payload: JSON.stringify(attachmentPayload)
    };

    expectedResult = attachmentPayload.original_message;
    expectedPipelineResult.postResponses.successfulPosts[
      0
    ].successResponse.attachments = [
      { text: 'Message coming from Slack integration test.' }
    ];

    return ow.actions
      .invoke({
        name: `${testPipeline}_slack/receive`,
        blocking: true,
        result: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, expectedResult);

        return ow.activations
          .list()
          .then(activations => {
            for (let i = 0; i < activations.length; i += 1) {
              if (activations[i].name === testPipeline) {
                return activations[i].activationId;
              }
            }
            throw new Error('No activations found.');
          })
          .then(activationId => {
            return ow.activations.get({ name: activationId });
          })
          .then(res => {
            const response = res.response.result;
            if (response.error) {
              throw new Error(JSON.stringify(response.error));
            }
            return response;
          })
          .then(res => {
            // Update the expectedPipelineResult's activationId, since this is dynamically generated we can't predict it
            expectedPipelineResult.postResponses.successfulPosts[
              0
            ].activationId = res.postResponses.successfulPosts[0].activationId;
            assert.deepEqual(res, expectedPipelineResult);
          })
          .catch(error => {
            assert(false, error);
          });
      })
      .catch(error => {
        assert(false, error);
      });
  }).retries(10);

  it('validate slack channel package works for multipost messages', done => {
    const testPipeline = `${pipelineName}-integration-slack-send-attached-multipost`;

    const requestMultipost = 'Show me a multimedia response';

    params = {
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXX',
      event: {
        type: 'message',
        channel: 'DXXXXXXXX',
        user: 'bot-id',
        text: requestMultipost,
        ts: 'XXXXXXXXX.XXXXXX'
      },
      type: 'event_callback',
      authed_users: ['UXXXXXXX1', 'UXXXXXXX2', 'bot-id'],
      event_id: 'EvXXXXXXXX',
      event_time: 'XXXXXXXXXX'
    };

    expectedResult.slack = params;

    return ow.actions
      .invoke({
        name: `${testPipeline}_slack/receive`,
        blocking: true,
        result: true,
        params
      })
      .then(result => {
        // assert slack/receive result is correct
        const filteredResult = result;
        delete filteredResult.auth._id;
        delete filteredResult.auth._rev;
        delete filteredResult.auth._revs_info;
        assert.deepEqual(filteredResult, expectedResult);

        return sleep(SLEEP_TIME);
      })
      .then(() => {
        return ow.activations
          .list()
          .then(activations => {
            for (let i = 0; i < activations.length; i += 1) {
              if (activations[i].name === testPipeline) {
                return activations[i].activationId;
              }
            }
            throw new Error('No activations found.');
          })
          .then(activationId => {
            return ow.activations.get({ name: activationId });
          })
          .then(res => {
            const response = res.response.result;
            if (response.error) {
              throw new Error(JSON.stringify(response.error));
            }
            return response;
          })
          .then(res => {
            // Update the expectedMultiPostResult's activationId, since this is dynamically generated we can't predict it
            for (
              let i = 0;
              i < expectedMultiPostResult.postResponses.successfulPosts.length;
              i += 1
            ) {
              expectedMultiPostResult.postResponses.successfulPosts[
                i
              ].activationId = res.postResponses.successfulPosts[
                i
              ].activationId;
            }
            assert.deepEqual(res, expectedMultiPostResult);
          })
          .catch(error => {
            assert(false, error);
          });
      })
      .catch(error => {
        assert(false, error);
      });
  })
    .timeout(30000)
    .retries(10);

  /**
     * Sleep for a specified amount of milliseconds.
     *
     * @param  {integer} ms - number of milliseconds
     * @return {Promise}    - Promise resolve
     */
  function sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
});
