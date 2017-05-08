'use strict';

/**
 * Slack channel post action unit tests.
 */

const assert = require('assert');
const slackPost = require('./../../../../channels/slack/post/index.js');
const slackBindings = require('./../../../resources/slack-bindings.json').slack;

const text = 'Message coming from slack/post unit test.';
const defaultPostUrl = 'https://slack.com/api/chat.postMessage';
const badUri = 'badlink.hi';
const movedUri = 'http://www.ibm.com';

const errorBadUri = `Invalid URI "${badUri}"`;
const errorMovedPermanently = 'Action returned with status code 301, message: Moved Permanently';
const errorNoBotAccessToken = 'Bot access token not provided. (Run "./setup.sh" again?)';
const errorNoChannel = 'Channel not provided.';
const errorNoText = 'Message text not provided.';

describe('Slack Post Unit Tests', () => {
  let options = {};
  const expectedResult = {
    status: 'OK',
    url: defaultPostUrl,
    params: {
      as_user: 'true',
      text: 'Message coming from slack/post unit test.',
      channel: slackBindings.channel,
      token: slackBindings.bot_access_token
    }
  };

  beforeEach(() => {
    options = {
      channel: slackBindings.channel,
      bot_access_token: slackBindings.bot_access_token,
      text
    };
  });

  it('validate slack/post works as intended', () => {
    return slackPost(options).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, `Invoke action failed: ${error}`);
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
        assert.equal(error, errorBadUri);
      }
    );
  });

  it('vlidate error when not 200 uri supplied', () => {
    options.url = movedUri;

    return slackPost(options).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorMovedPermanently);
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
        assert.equal(error, errorNoBotAccessToken);
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
        assert.equal(error, errorNoChannel);
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
        assert.equal(error, errorNoText);
      }
    );
  });
});
