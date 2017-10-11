'use strict';

/**
 * Slack channel post action unit tests.
 */

const assert = require('assert');
const nock = require('nock');

const envParams = process.env;

process.env.__OW_ACTION_NAME = `/${envParams.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const slackPost = require('./../../../../channels/slack/post/index.js');

const text = 'Message coming from slack/post unit test.';
const badUri = 'badlink.hi';
const movedUri = 'http://www.ibm.com';

const errorBadUri = `Invalid URI "${badUri}"`;
const errorMovedUri = 'Action returned with status code 301, message: Moved Permanently';
const errorNoChannel = 'Channel not provided.';
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
  });

  it('validate slack/post works as intended', () => {
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    func = slackPost.main;

    return func(options).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
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

    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    func = slackPost.main;

    return func(options).then(
      result => {
        if (!mockCloudantGet.isDone()) {
          nock.cleanAll();
          assert(false, 'Mock Cloudant Get server did not get called.');
        }
        if (!mockOW.isDone()) {
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

  it('validate error when bad uri supplied', () => {
    func = slackPost.postSlack;

    return func(options, badUri).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorBadUri);
      }
    );
  });

  it('validate error when moved uri supplied', () => {
    func = slackPost.postSlack;

    return func(options, movedUri).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorMovedUri);
      }
    );
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
});
