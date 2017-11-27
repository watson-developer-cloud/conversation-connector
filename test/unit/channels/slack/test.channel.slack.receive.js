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
 *  Slack channel receive action unit tests.
 */

const assert = require('assert');
const nock = require('nock');

const envParams = process.env;

const slackReceive = require('./../../../../channels/slack/receive/index.js');

const mockError = 'mock-error';
const errorNoVerificationToken = 'Verification token is absent.';
const errorBadVerificationToken = 'Verification token is incorrect.';

describe('Slack Receive Unit Tests', () => {
  let challengeParams;
  let challengeResult;
  let payload;
  let messageParams;
  let messageResult;
  let payloadParams;
  let payloadResult;

  const incorrectToken = 'incorrect_token';

  let func = slackReceive.main;

  const botId = 'UXXXXXXXX';
  const channel = 'DXXXXXXXX';
  const groupChannel = 'GXXXXXXXX';
  const directedMessage = `<@${botId}> Message coming from slack/receive unit test.`;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const namespace = process.env.__OW_NAMESPACE;
  let packageName;

  const owHost = `https://${apiHost}`;
  let cloudantMock;

  const auth = {
    slack: {
      client_id: envParams.__TEST_SLACK_CLIENT_ID,
      client_secret: envParams.__TEST_SLACK_CLIENT_SECRET,
      verification_token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      bot_users: {}
    }
  };
  auth.slack.bot_users[botId] = {
    access_token: 'sample_access_token',
    bot_access_token: 'sample_bot_access_token'
  };

  before(() => {
    process.env.__OW_ACTION_NAME = `/${envParams.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;
    packageName = process.env.__OW_ACTION_NAME.split('/')[2];
  });

  beforeEach(() => {
    messageParams = {
      __ow_verb: 'GET',
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      event: {
        text: 'Message coming from slack/receive unit test.',
        type: 'message',
        channel
      },
      type: 'event_callback',
      authed_users: [botId]
    };

    messageResult = {
      slack: {
        token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
        type: 'event_callback',
        event: {
          text: 'Message coming from slack/receive unit test.',
          type: 'message',
          channel
        },
        authed_users: [botId]
      },
      provider: 'slack',
      bot_id: botId,
      auth
    };

    challengeParams = {
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      type: 'url_verification',
      challenge: 'challenge_token'
    };

    challengeResult = {
      code: 200,
      challenge: 'challenge_token'
    };

    payload = {
      channel: {
        id: channel
      },
      actions: [
        {
          name: 'shirt_size_small',
          value: 'small',
          type: 'button'
        }
      ],
      callback_id: 'test_callback_id',
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      original_message: {
        user: botId
      }
    };

    payloadParams = {
      payload: JSON.stringify(payload)
    };

    payloadResult = {
      slack: {
        payload: JSON.stringify(payload)
      },
      provider: 'slack',
      bot_id: botId,
      auth
    };

    nock.cleanAll();
    createCloudFunctionsMock();
    cloudantMock = createCloudantMock();
  });

  it('validate slack/receive receives slack human message', () => {
    return func(messageParams).then(
      result => {
        if (!cloudantMock.isDone()) {
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        assert.deepEqual(result, messageResult);
      },
      error => {
        assert(false, error.message);
      }
    );
  }).retries(4);

  it('validate slack/receives receives a directed message in group channel', () => {
    messageParams.event.channel = groupChannel;
    messageParams.event.text = directedMessage;
    messageResult.slack.event.channel = groupChannel;
    messageResult.slack.event.text = directedMessage.slice(12);

    return slackReceive
      .main(messageParams)
      .then(result => {
        assert.deepEqual(result, messageResult);
      })
      .catch(error => {
        assert(false, error.message);
      });
  });

  it('validate slack/receive receives human interactive response', () => {
    return func(payloadParams).then(
      result => {
        assert.deepEqual(result, payload.original_message);
      },
      error => {
        assert(false, error.message);
      }
    );
  });

  it('validate slack/receive receives a DM interactive response', () => {
    payload.channel.id = groupChannel;
    payloadParams.payload = JSON.stringify(payload);
    payloadResult.slack.payload = JSON.stringify(payload);

    return func(payloadParams).then(
      result => {
        assert.deepEqual(result, payload.original_message);
      },
      error => {
        assert(false, error.message);
      }
    );
  });

  it('validate slack/receive passes on challenge', () => {
    return func(challengeParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      challengeMessage => {
        assert.deepEqual(challengeMessage, challengeResult);
      }
    );
  });

  it('validate slack/receive receives slack bot message', () => {
    messageParams.event.bot_id = 'bot_id';
    const botResponse = {
      bot_id: 'bot_id'
    };

    return func(messageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      botMessage => {
        assert.deepEqual(botMessage, botResponse);
      }
    );
  });

  it('validate slack/receive receives slack bot message when message changed', () => {
    messageParams.event.message = {};
    messageParams.event.message.bot_id = 'bot_id';

    const botResponse = {
      bot_id: 'bot_id'
    };

    return func(messageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      botMessage => {
        assert.deepEqual(botMessage, botResponse);
      }
    );
  });

  it('validate error when no token', () => {
    delete messageParams.token;
    func = slackReceive.validateParameters;

    try {
      func(messageParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoVerificationToken);
    }
  });

  it('validate no challenge okay', () => {
    delete challengeParams.challenge;
    func = slackReceive.main;

    func(challengeParams)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(err => {
        assert.equal(200, err.code);
        assert.equal('', err.challenge);
      });
  });

  it('validate error when bad verification token', () => {
    messageParams.token = incorrectToken;
    func = slackReceive.main;

    return func(messageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.error.name, 'AssertionError');
        assert.equal(error.error.message, errorBadVerificationToken);
      }
    );
  }).retries(4);

  it('validate error when subscription event was timed out and resent', () => {
    messageParams.__ow_headers = {
      'x-slack-retry-reason': 'http_timeout',
      'x-slack-retry-num': 1
    };
    func = slackReceive.main;
    delete messageResult.auth;

    return func(messageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, messageParams);
      }
    );
  });

  it('validate error when create cloudant object is init on null url', () => {
    return slackReceive
      .createCloudantObj(null)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly');
      })
      .catch(error => {
        assert.equal(error.message, 'invalid url');
      });
  });

  it('validate error when retrieve auth doc failed', () => {
    nock.cleanAll();
    createCloudFunctionsMock();
    nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(true)
      .replyWithError(mockError);

    return slackReceive
      .main(messageParams)
      .then(() => {
        assert(false, 'Aciton succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error.error.description, mockError);
      });
  }).retries(4);

  it('validate error when a message is not directed at bot', () => {
    const wrongBotText = '<@Ubotidtwo> Message coming from slack/receive unit test.';
    messageParams.event.channel = groupChannel;
    messageParams.event.text = wrongBotText;
    messageResult.slack.event.channel = groupChannel;
    messageResult.slack.event.text = wrongBotText;

    return slackReceive
      .main(messageParams)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, messageResult);
      });
  });

  it('validate error when no valid bot id from authed users', () => {
    const result = slackReceive.getBotIdFromAuthedUsers(['bad-bot-id'], auth);
    assert.equal(result, null);
  });

  it('validate error when server did not pass in verification token', () => {
    delete messageParams.token;

    return slackReceive
      .main(messageParams)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error.message, 'Verification token is absent.');
      });
  });

  function createCloudFunctionsMock() {
    const expectedOW = {
      annotations: [
        {
          key: 'cloudant_url',
          value: cloudantUrl
        },
        {
          key: 'cloudant_auth_dbname',
          value: cloudantAuthDbName
        },
        {
          key: 'cloudant_auth_key',
          value: cloudantAuthKey
        }
      ]
    };

    return nock(owHost)
      .get(`/api/v1/namespaces/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW)
      .post(uri => {
        return uri.indexOf(`/api/v1/namespaces/${namespace}/actions`) === 0;
      })
      .query(true)
      .reply(200, {});
  }

  function createCloudantMock() {
    return nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(true)
      .reply(200, auth);
  }
});
