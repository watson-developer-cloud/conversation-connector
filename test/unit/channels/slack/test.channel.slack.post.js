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

  let func;

  const botId = 'bot-id';

  const slackHost = 'https://slack.com';

  beforeEach(() => {
    options = {
      channel: envParams.__TEST_SLACK_CHANNEL,
      text,
      raw_input_data: {
        bot_id: botId,
        provider: 'slack',
        auth: {
          slack: {
            verification_token: envParams.__TEST_SLACK_VERIFICATION_TOKEN,
            access_token: envParams.__TEST_SLACK_ACCESS_TOKEN,
            bot_access_token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN,
            bot_users: {}
          }
        }
      }
    };
    options.raw_input_data.auth.slack.bot_users[botId] = {
      access_token: envParams.__TEST_SLACK_ACCESS_TOKEN,
      bot_access_token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
    };

    expectedResult = {
      as_user: 'true',
      text: 'Message coming from slack/post unit test.',
      channel: envParams.__TEST_SLACK_CHANNEL,
      token: envParams.__TEST_SLACK_BOT_ACCESS_TOKEN
    };

    createSlackMock();
  });

  it('validate slack/post works as intended', () => {
    func = slackPost.main;

    return func(options).then(
      result => {
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
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate post params modified differently for slack hooks url', () => {
    const postParams = slackPost.modifyPostParams(
      expectedResult,
      'https://hooks.slack.com/sample_page'
    );

    assert.deepEqual(postParams, JSON.stringify(expectedResult));
  });

  it('validate error when slack server throws error', () => {
    nock.cleanAll();
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

  function createSlackMock() {
    return nock(slackHost).post('/api/chat.postMessage').reply(200, {});
  }
});
