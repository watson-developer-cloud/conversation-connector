'use strict';

/**
 * Slack channel post action unit tests.
 */

const assert = require('assert');
const slackPost = require('./../../../../channels/slack/post/index.js');
const slackBindings = require('./../../../resources/slack-bindings.json').slack;

const text = 'Message coming from slack/post unit test.';
const badUri = 'badlink.hi';
const movedUri = 'http://www.ibm.com';

const errorBadUri = `Invalid URI "${badUri}"`;
const errorMovedUri = 'Action returned with status code 301, message: Moved Permanently';
const errorNoBotAccessToken = 'No bot access token provided.';
const errorNoChannel = 'Channel not provided.';
const errorNoText = 'Message text not provided.';

describe('Slack Post Unit Tests', () => {
  let options;
  let expectedResult;

  beforeEach(() => {
    options = {
      channel: slackBindings.channel,
      bot_access_token: slackBindings.bot_access_token,
      text
    };

    expectedResult = {
      as_user: 'true',
      text: 'Message coming from slack/post unit test.',
      channel: slackBindings.channel,
      token: slackBindings.bot_access_token
    };
  });

  it('validate slack/post works as intended', () => {
    return slackPost(options).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, `Invoke action failed: ${error.message}`);
      }
    );
  });

  it('validate slack/post works with attachments', () => {
    const attachments = [{ text: 'Message coming from slack/post unit test.' }];
    options.attachments = attachments;
    expectedResult.attachments = attachments;

    return slackPost(options).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when bad uri supplied', () => {
    options.url = badUri;

    return slackPost(options).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorBadUri);
      }
    );
  });

  it('validate error when moved uri supplied', () => {
    options.url = movedUri;

    return slackPost(options).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorMovedUri);
      }
    );
  });

  it('validate error when no bot access token provided', () => {
    delete options.bot_access_token;

    return slackPost(options).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoBotAccessToken);
      }
    );
  });

  it('validate error when no channel provided', () => {
    delete options.channel;

    return slackPost(options).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoChannel);
      }
    );
  });

  it('validate error when no message text provided', () => {
    delete options.text;

    return slackPost(options).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoText);
      }
    );
  });
});
