'use strict';

/**
 * Slack channel post action unit tests.
 */

const assert = require('assert');
const nock = require('nock');

const envParams = process.env;

const slackPost = require('./../../../../channels/slack/post/index.js');

const text = 'Message coming from slack/post unit test.';

const mockError = 'mock-error';
const errorNoChannel = 'Channel not provided.';
const errorSlackResponse = 'Action returned with status code 400, message: null';
const errorNoText = 'Message text not provided.';

describe('Slack Post Unit Tests', () => {
  let options;
  let expectedResult;
  let auth;

  let func;

  const cloudantUrl = 'https://some-cloudant-url.com';
  const cloudantAuthDbName = 'abc';
  const cloudantAuthKey = '123';

  const apiHost = process.env.__OW_API_HOST;
  const namespace = process.env.__OW_NAMESPACE;
  let packageName;

  let owMock;
  let cloudantMock;
  const owHost = `https://${apiHost}`;
  const slackHost = 'https://slack.com';

  before(() => {
    process.env.__OW_ACTION_NAME = `/${envParams.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;
    packageName = process.env.__OW_ACTION_NAME.split('/')[2];
  });

  beforeEach(() => {
    options = {
      channel: envParams.__TEST_SLACK_CHANNEL,
      bot_access_token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN,
      text
    };

    expectedResult = {
      as_user: 'true',
      text: 'Message coming from slack/post unit test.',
      channel: envParams.__TEST_SLACK_CHANNEL,
      token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
    };

    auth = {
      slack: {
        client_id: envParams.__TEST_SLACK_CLIENT_ID,
        client_secret: envParams.__TEST_SLACK_CLIENT_SECRET,
        verification_token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
        access_token: envParams.__TEST_SLACK_ACCESS_TOKEN,
        bot_access_token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
      }
    };

    owMock = createOpenwhiskMock();
    cloudantMock = createCloudantMock();
    createSlackMock();
  });

  it('validate slack/post works as intended', () => {
    func = slackPost.main;

    return func(options).then(
      result => {
        if (!cloudantMock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate slack/post works with attachments', () => {
    const attachments = [{ text: 'Message coming from slack/post unit test.' }];
    options.attachments = attachments;
    expectedResult.attachments = attachments;

    func = slackPost.main;

    return func(options).then(
      result => {
        if (!cloudantMock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!owMock.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock OW Get server did not get called.');
        }
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when create cloudant object is init on null url', () => {
    return slackPost
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
    createOpenwhiskMock();
    nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(true)
      .replyWithError(mockError);

    return slackPost
      .main(options)
      .then(() => {
        assert(false, 'Aciton succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error.description, mockError);
      });
  });

  it('validate error when slack server throws error', () => {
    nock.cleanAll();
    createOpenwhiskMock();
    createCloudantMock();
    nock(slackHost).post('/api/chat.postMessage').replyWithError(mockError);

    return slackPost
      .main(options)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error.message, mockError);
      });
  });

  it('validate error when slack server throws response error', () => {
    nock.cleanAll();
    createOpenwhiskMock();
    createCloudantMock();
    nock(slackHost).post('/api/chat.postMessage').reply(400, mockError);

    return slackPost
      .main(options)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.equal(error, errorSlackResponse);
      });
  });

  it('validate error when no channel provided', () => {
    delete options.channel;
    func = slackPost.validateParameters;

    try {
      func(options);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoChannel);
    }
  });

  it('validate error when no message text provided', () => {
    delete options.text;

    func = slackPost.validateParameters;

    try {
      func(options);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoText);
    }
  });

  function createOpenwhiskMock() {
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
      .reply(200, expectedOW);
  }

  function createCloudantMock() {
    return nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(true)
      .reply(200, auth);
  }

  function createSlackMock() {
    return nock(slackHost).post('/api/chat.postMessage').reply(200, {});
  }
});
