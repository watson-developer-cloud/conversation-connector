'use strict';

/**
 *  Slack channel receive action unit tests.
 */

const assert = require('assert');
const nock = require('nock');

const envParams = process.env;

process.env.__OW_ACTION_NAME = `/${envParams.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const slackReceive = require('./../../../../channels/slack/receive/index.js');

const errorNoVerificationToken = 'Verification token is absent.';
const errorBadVerificationToken = 'Verification token is incorrect.';

describe('Slack Receive Unit Tests', () => {
  let challengeParams;
  let challengeResult;
  let messageParams;
  let messageResult;
  let payloadParams;
  let payloadResult;
  let auth;
  const incorrectToken = 'incorrect_token';

  let func = slackReceive.main;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const namespace = process.env.__OW_NAMESPACE;
  const packageName = process.env.__OW_ACTION_NAME.split('/')[2];

  const owUrl = `https://${apiHost}/api/v1/namespaces`;
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

  beforeEach(() => {
    messageParams = {
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
      event: {
        text: 'Message coming from slack/receive unit test.',
        type: 'message',
        channel: envParams.__TEST_SLACK_CHANNEL
      },
      type: 'event_callback'
    };

    messageResult = {
      slack: {
        token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
        type: 'event_callback',
        event: {
          text: 'Message coming from slack/receive unit test.',
          type: 'message',
          channel: envParams.__TEST_SLACK_CHANNEL
        }
      },
      provider: 'slack'
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

    const payload = {
      actions: [
        {
          name: 'shirt_size_small',
          value: 'small',
          type: 'button'
        }
      ],
      callback_id: 'test_callback_id',
      token: envParams.__TEST_SLACK_VERIFICATION_TOKEN
    };

    payloadParams = {
      payload: JSON.stringify(payload)
    };

    payloadResult = {
      slack: {
        payload: JSON.stringify(payload)
      },
      provider: 'slack'
    };

    auth = {
      slack: {
        client_id: envParams.__TEST_SLACK_CLIENT_ID,
        client_secret: envParams.__TEST_SLACK_CLIENT_SECRET,
        verification_token: envParams.__TEST_SLACK_VERIFICATION_TOKEN
      }
    };
  });

  it('validate slack/receive receives slack human message', () => {
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(messageParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, messageResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate slack/receive receives human interactive response', () => {
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);
    return func(payloadParams).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, payloadResult);
      },
      error => {
        assert(false, error);
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
      .then(res => {
        assert(false, res);
      })
      .catch(err => {
        assert.equal(200, err.code);
        assert.equal('', err.challenge);
      });
  });

  it('validate error when bad verification token', () => {
    messageParams.token = incorrectToken;
    func = slackReceive.main;

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(messageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.equal(error.err.name, 'AssertionError');
        assert.equal(error.err.message, errorBadVerificationToken);
      }
    );
  });

  it('validate error when subscription event was timed out and resent', () => {
    messageParams.__ow_headers = {
      'x-slack-retry-reason': 'http_timeout',
      'x-slack-retry-num': 1
    };
    func = slackReceive.main;
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(messageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(error, messageResult);
      }
    );
  });
});
