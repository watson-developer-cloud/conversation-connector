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

const assert = require('assert');
const openwhisk = require('openwhisk');
const clearContextDb = require('../utils/cloudant-utils.js').clearContextDb;

const safeExtractErrorMessage = require('./../utils/helper-methods.js').safeExtractErrorMessage;

const carDashboardReplyWelcome = 'Hi. It looks like a nice drive today. What would you like me to do?  ';

const buttonMessageInputText = 'Buy me a shirt please.';
const buttonMessageResponse = 'What shirt size would you like?';
const buttonMessageUpdate = 'Sorry, the store is out of medium shirts.';

const envParams = process.env;

const cloudantUrl = process.env.__TEST_CLOUDANT_URL;
const pipelineName = envParams.__TEST_PIPELINE_NAME;

const SLEEP_TIME = 3000;

/**
 * Slack prerequisites test suite verifies the Slack package is properly deployed in Cloud Functions
 */
describe('End-to-End tests: Slack prerequisites', () => {
  const ow = openwhisk();

  const requiredActions = [
    `${pipelineName}_slack/post`,
    `${pipelineName}_slack/receive`,
    `${pipelineName}_slack/deploy`,
    `${pipelineName}_starter-code/normalize-conversation-for-slack`,
    `${pipelineName}_starter-code/normalize-slack-for-conversation`
  ];

  requiredActions.forEach(action => {
    it(`${action} action is deployed in Cloud Functions namespace`, () => {
      return ow.actions.get({ name: action }).then(
        () => {},
        error => {
          assert(
            false,
            `${action}, ${safeExtractErrorMessage(error)} Try running setup scripts again.`
          );
        }
      );
    });
  });
});

describe('End-to-End tests: with Slack package', () => {
  const ow = openwhisk();

  let params;
  let expectedResult;
  let expectedPipelineResult;
  let attachmentData;
  let attachmentPayload;

  const auth = {
    conversation: {
      username: envParams.__TEST_CONVERSATION_USERNAME,
      password: envParams.__TEST_CONVERSATION_PASSWORD,
      workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
    },
    slack: {
      client_id: envParams.__TEST_SLACK_CLIENT_ID,
      client_secret: envParams.__TEST_SLACK_CLIENT_SECRET,
      verification_token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      bot_users: {}
    }
  };
  auth.slack.bot_users[envParams.__TEST_SLACK_BOT_USER_ID] = {
    access_token: envParams.__TEST_SLACK_ACCESS_TOKEN,
    bot_access_token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
  };

  beforeEach(() => {
    params = {
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXX',
      event: {
        type: 'message',
        channel: envParams.__TEST_SLACK_CHANNEL,
        user: 'UXXXXXXXX',
        text: 'Message coming from end to end test.',
        ts: 'XXXXXXXXX.XXXXXX'
      },
      type: 'event_callback',
      authed_users: [
        'UXXXXXXX1',
        'UXXXXXXX2',
        envParams.__TEST_SLACK_BOT_USER_ID
      ],
      event_id: 'EvXXXXXXXX',
      event_time: 'XXXXXXXXXX'
    };

    expectedResult = {
      provider: 'slack',
      slack: {
        token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXX',
        event: {
          type: 'message',
          channel: envParams.__TEST_SLACK_CHANNEL,
          user: 'UXXXXXXXX',
          text: 'Message coming from end to end test.',
          ts: 'XXXXXXXXX.XXXXXX'
        },
        type: 'event_callback',
        authed_users: [
          'UXXXXXXX1',
          'UXXXXXXX2',
          envParams.__TEST_SLACK_BOT_USER_ID
        ],
        event_id: 'EvXXXXXXXX',
        event_time: 'XXXXXXXXXX'
      },
      bot_id: envParams.__TEST_SLACK_BOT_USER_ID,
      auth
    };

    expectedPipelineResult = {
      channel: envParams.__TEST_SLACK_CHANNEL,
      text: carDashboardReplyWelcome,
      as_user: 'true',
      token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN,
      ts: 'XXXXXXXXX.XXXXXX'
    };

    attachmentData = [
      {
        actions: [
          {
            name: 'shirt_size_small',
            text: 'Small',
            type: 'button',
            value: 'small'
          },
          {
            name: 'shirt_size_medium',
            text: 'Medium',
            type: 'button',
            value: 'medium'
          },
          {
            name: 'shirt_size_large',
            text: 'Large',
            type: 'button',
            value: 'large'
          }
        ],
        fallback: 'Sorry! We cannot support buttons at the moment. Please type in: small, medium, or large.',
        callback_id: 'shirt_size'
      }
    ];

    attachmentPayload = {
      actions: [
        {
          name: 'shirt_size_medium',
          value: 'medium',
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
        id: 'UXXXXXXXX'
      },
      original_message: {
        type: 'message',
        text: buttonMessageResponse,
        user: envParams.__TEST_SLACK_BOT_USER_ID,
        bot_id: envParams.__TEST_SLACK_BOT_USER_ID,
        attachments: [
          {
            fallback: 'Sorry! We cannot support buttons at the moment. Please type in: small, medium, or large.',
            callback_id: 'shirt_size',
            id: 1,
            actions: [
              {
                id: 1,
                name: 'shirt_size_small',
                text: 'Small',
                type: 'button',
                value: 'small'
              },
              {
                id: 2,
                name: 'shirt_size_medium',
                text: 'Medium',
                type: 'button',
                value: 'medium'
              },
              {
                id: 3,
                name: 'shirt_size_large',
                text: 'Large',
                type: 'button',
                value: 'large'
              }
            ]
          }
        ]
      },
      callback_id: 'shirt_size',
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      attachment_id: 1,
      is_app_unfurl: false,
      type: 'interactive_message'
    };
  });

  it('validate when conversation is text input to text output', () => {
    const deploymentName = 'testflex-endtoend-slack-nocontext';

    return clearContextDb(cloudantUrl, 'contextdb')
      .then(() => {
        // cloudant clear context calls are synchronous,
        //  so a wait period is added to allow for the context database to be cleared
        return sleep(SLEEP_TIME);
      })
      .then(() => {
        return ow.actions.invoke({
          name: `${deploymentName}_slack/receive`,
          blocking: true,
          result: true,
          params
        });
      })
      .then(result => {
        // assert slack/receive result is correct
        const filteredResult = result;
        delete filteredResult.auth._id;
        delete filteredResult.auth._rev;
        delete filteredResult.auth._revs_info;
        assert.deepEqual(filteredResult, expectedResult);
      })
      .then(() => {
        // assert pipeline result is correct
        return ow.activations.list();
      })
      .then(activations => {
        for (let i = 0; i < activations.length; i += 1) {
          if (activations[i].name === deploymentName) {
            return activations[i].activationId;
          }
        }
        throw new Error('No activations found.');
      })
      .then(activationId => {
        return ow.activations.get(activationId);
      })
      .then(res => {
        const response = res.response.result;
        if (response.error) {
          throw new Error(JSON.stringify(response.error));
        }
        return response;
      })
      .then(res => {
        assert.deepEqual(res, expectedPipelineResult);
      })
      .catch(error => {
        assert(false, error);
      });
  })
    .timeout(30000)
    .retries(10);

  it('validate context pipeline works for a single Conversation turn', () => {
    const deploymentName = 'testflex-endtoend-slack-withcontext';

    return clearContextDb(cloudantUrl, 'contextdb')
      .then(() => {
        // cloudant clear context calls are synchronous,
        //  so a wait period is added to allow for the context database to be cleared
        return sleep(SLEEP_TIME);
      })
      .then(() => {
        return ow.actions.invoke({
          name: `${deploymentName}_slack/receive`,
          blocking: true,
          result: true,
          params
        });
      })
      .then(result => {
        // assert slack/receive result is correct
        const filteredResult = result;
        delete filteredResult.auth._id;
        delete filteredResult.auth._rev;
        delete filteredResult.auth._revs_info;
        assert.deepEqual(filteredResult, expectedResult);
      })
      .then(() => {
        // assert pipeline result is correct
        return ow.activations.list();
      })
      .then(activations => {
        for (let i = 0; i < activations.length; i += 1) {
          if (activations[i].name === deploymentName) {
            return activations[i].activationId;
          }
        }
        throw new Error('No activations found.');
      })
      .then(activationId => {
        return ow.activations.get(activationId);
      })
      .then(res => {
        const response = res.response.result;
        if (response.error) {
          throw new Error(JSON.stringify(response.error));
        }
        return response;
      })
      .then(res => {
        assert.deepEqual(res, expectedPipelineResult);
      })
      .catch(error => {
        assert(false, error);
      });
  })
    .timeout(30000)
    .retries(10);

  it('validate context pipeline works for multiple Conversation turns', () => {
    const deploymentName = 'testflex-endtoend-slack-withcontext';

    return (
      clearContextDb(cloudantUrl, 'contextdb')
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        .then(() => {
          return ow.actions.invoke({
            name: `${deploymentName}_slack/receive`,
            blocking: true,
            result: true,
            params
          });
        })
        // first conversation turn
        .then(result => {
          // assert slack/receive result is correct
          const filteredResult = result;
          delete filteredResult.auth._id;
          delete filteredResult.auth._rev;
          delete filteredResult.auth._revs_info;
          assert.deepEqual(filteredResult, expectedResult);
        })
        .then(() => {
          // assert pipeline result is correct
          return ow.activations.list();
        })
        .then(activations => {
          for (let i = 0; i < activations.length; i += 1) {
            if (activations[i].name === deploymentName) {
              return activations[i].activationId;
            }
          }
          throw new Error('No activations found.');
        })
        .then(activationId => {
          return ow.activations.get(activationId);
        })
        .then(res => {
          const response = res.response.result;
          if (response.error) {
            throw new Error(JSON.stringify(response.error));
          }
          return response;
        })
        .then(res => {
          assert.deepEqual(res, expectedPipelineResult);
        })
        .catch(error => {
          assert(false, error);
        })
        // second conversation turn
        .then(() => {
          params.event.text = 'Turn on the wipers please.';
          return ow.actions.invoke({
            name: `${deploymentName}_slack/receive`,
            blocking: true,
            result: true,
            params
          });
        })
        .then(result => {
          expectedResult.slack.event.text = params.event.text;
          // assert slack/receive result is correct
          const filteredResult = result;
          delete filteredResult.auth._id;
          delete filteredResult.auth._rev;
          delete filteredResult.auth._revs_info;
          assert.deepEqual(filteredResult, expectedResult);
        })
        .then(() => {
          // assert pipeline result is correct
          return ow.activations.list();
        })
        .then(activations => {
          for (let i = 0; i < activations.length; i += 1) {
            if (activations[i].name === deploymentName) {
              return activations[i].activationId;
            }
          }
          throw new Error('No activations found.');
        })
        .then(activationId => {
          return ow.activations.get(activationId);
        })
        .then(res => {
          const response = res.response.result;
          if (response.error) {
            throw new Error(JSON.stringify(response.error));
          }
          return response;
        })
        .then(res => {
          assert.deepEqual(res, expectedPipelineResult);
        })
        .catch(error => {
          assert(false, error);
        })
    );
  })
    .timeout(30000)
    .retries(10);

  it('validate when conversation is text to attached message', () => {
    const deploymentName = 'testflex-endtoend-slack-withcontext';

    return (
      clearContextDb(cloudantUrl, 'contextdb')
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        // first conversation turn
        .then(() => {
          return ow.actions.invoke({
            name: `${deploymentName}_slack/receive`,
            blocking: true,
            result: true,
            params
          });
        })
        .then(result => {
          // assert slack/receive result is correct
          const filteredResult = result;
          delete filteredResult.auth._id;
          delete filteredResult.auth._rev;
          delete filteredResult.auth._revs_info;
          assert.deepEqual(filteredResult, expectedResult);
        })
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        .then(() => {
          // assert pipeline result is correct
          return ow.activations.list();
        })
        .then(activations => {
          for (let i = 0; i < activations.length; i += 1) {
            if (activations[i].name === deploymentName) {
              return activations[i].activationId;
            }
          }
          throw new Error('No activations found.');
        })
        .then(activationId => {
          return ow.activations.get(activationId);
        })
        .then(res => {
          const response = res.response.result;
          if (response.error) {
            throw new Error(JSON.stringify(response.error));
          }
          return response;
        })
        .then(res => {
          assert.deepEqual(res, expectedPipelineResult);
        })
        .catch(error => {
          assert(false, error);
        })
        // second conversation turn
        .then(() => {
          params.event.text = buttonMessageInputText;
          expectedResult.slack.event.text = params.event.text;

          return ow.actions.invoke({
            name: `${deploymentName}_slack/receive`,
            blocking: true,
            result: true,
            params
          });
        })
        .then(result => {
          // assert slack/receive result is correct
          const filteredResult = result;
          delete filteredResult.auth._id;
          delete filteredResult.auth._rev;
          delete filteredResult.auth._revs_info;
          assert.deepEqual(filteredResult, expectedResult);
        })
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        .then(() => {
          // assert pipeline result is correct
          return ow.activations.list();
        })
        .then(activations => {
          for (let i = 0; i < activations.length; i += 1) {
            if (activations[i].name === deploymentName) {
              return activations[i].activationId;
            }
          }
          throw new Error('No activations found.');
        })
        .then(activationId => {
          return ow.activations.get(activationId);
        })
        .then(res => {
          const response = res.response.result;
          if (response.error) {
            throw new Error(JSON.stringify(response.error));
          }
          return response;
        })
        .then(res => {
          expectedPipelineResult.text = buttonMessageResponse;
          expectedPipelineResult.attachments = attachmentData;
          delete expectedPipelineResult.ts;
          assert.deepEqual(res, expectedPipelineResult);
        })
        .catch(error => {
          assert(false, error);
        })
    );
  })
    .timeout(30000)
    .retries(10);

  it('validate when conversation is attached message to message update', () => {
    const deploymentName = 'testflex-endtoend-slack-withcontext';

    return (
      clearContextDb(cloudantUrl, 'contextdb')
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        // first conversation turn
        .then(() => {
          return ow.actions.invoke({
            name: `${deploymentName}_slack/receive`,
            blocking: true,
            result: true,
            params
          });
        })
        .then(result => {
          // assert slack/receive result is correct
          const filteredResult = result;
          delete filteredResult.auth._id;
          delete filteredResult.auth._rev;
          delete filteredResult.auth._revs_info;
          assert.deepEqual(filteredResult, expectedResult);
        })
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        .then(() => {
          // assert pipeline result is correct
          return ow.activations.list();
        })
        .then(activations => {
          for (let i = 0; i < activations.length; i += 1) {
            if (activations[i].name === deploymentName) {
              return activations[i].activationId;
            }
          }
          throw new Error('No activations found.');
        })
        .then(activationId => {
          return ow.activations.get(activationId);
        })
        .then(res => {
          const response = res.response.result;
          if (response.error) {
            throw new Error(JSON.stringify(response.error));
          }
          return response;
        })
        .then(res => {
          assert.deepEqual(res, expectedPipelineResult);
        })
        .catch(error => {
          assert(false, error);
        })
        // second conversation turn
        .then(() => {
          params.event.text = buttonMessageInputText;
          expectedResult.slack.event.text = params.event.text;

          return ow.actions.invoke({
            name: `${deploymentName}_slack/receive`,
            blocking: true,
            result: true,
            params
          });
        })
        .then(result => {
          // assert slack/receive is correct
          const filteredResult = result;
          delete filteredResult.auth._id;
          delete filteredResult.auth._rev;
          delete filteredResult.auth._revs_info;
          assert.deepEqual(filteredResult, expectedResult);
        })
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        .then(() => {
          // assert pipeline result is correct
          return ow.activations.list();
        })
        .then(activations => {
          for (let i = 0; i < activations.length; i += 1) {
            if (activations[i].name === deploymentName) {
              return activations[i].activationId;
            }
          }
          throw new Error('No activations found.');
        })
        .then(activationId => {
          return ow.activations.get(activationId);
        })
        .then(res => {
          const response = res.response.result;
          if (response.error) {
            throw new Error(JSON.stringify(response.error));
          }
          return response;
        })
        .then(res => {
          expectedPipelineResult.text = buttonMessageResponse;
          expectedPipelineResult.attachments = attachmentData;
          delete expectedPipelineResult.ts;
          assert.deepEqual(res, expectedPipelineResult);
        })
        .catch(error => {
          assert(false, error);
        })
        // third conversation turn
        .then(() => {
          params = {};
          params.payload = JSON.stringify(attachmentPayload);

          return ow.actions.invoke({
            name: `${deploymentName}_slack/receive`,
            blocking: true,
            result: true,
            params
          });
        })
        .then(result => {
          // assert slack/receive is correct
          expectedResult = JSON.parse(params.payload).original_message;
          assert.deepEqual(result, expectedResult);
        })
        .then(() => {
          // cloudant clear context calls are synchronous,
          //  so a wait period is added to allow for the context database to be cleared
          return sleep(SLEEP_TIME);
        })
        .then(() => {
          // assert pipeline result is correct
          return ow.activations.list();
        })
        .then(activations => {
          for (let i = 0; i < activations.length; i += 1) {
            if (activations[i].name === deploymentName) {
              return activations[i].activationId;
            }
          }
          return new Error('No activations found.');
        })
        .then(activationId => {
          return ow.activations.get(activationId);
        })
        .then(res => {
          const response = res.response.result;
          if (response.error) {
            throw new Error(JSON.stringify(response.error));
          }
          return response;
        })
        .then(res => {
          expectedPipelineResult = {
            channel: envParams.__TEST_SLACK_CHANNEL,
            text: buttonMessageResponse,
            as_user: 'true',
            token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN,
            attachments: [
              {
                text: buttonMessageUpdate
              }
            ]
          };
          assert.deepEqual(res, expectedPipelineResult);
        })
        .catch(error => {
          assert(false, error);
        })
    );
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
