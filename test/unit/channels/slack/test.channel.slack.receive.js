'use strict';

/**
 *  Slack channel receive action unit tests.
 */

const assert = require('assert');
const slackBindings = require('./../../../resources/slack-bindings.json').slack;
const slackReceive = require('./../../../../channels/slack/receive/index.js');

const errorBadVerificationTokens = 'Verification token is incorrect.';

describe('Slack Receive Unit Tests', () => {
  let challengeParams;
  let challengeResult;
  let messageParams;
  let messageResult;
  let payloadParams;
  let payloadResult;
  const incorrectToken = 'incorrect_token';

  beforeEach(() => {
    messageParams = {
      verification_token: slackBindings.verification_token,
      token: slackBindings.verification_token,
      event: {
        text: 'Message coming from slack/receive unit test.',
        type: 'message',
        channel: slackBindings.channel
      },
      type: 'event_callback'
    };

    messageResult = {
      slack: {
        token: slackBindings.verification_token,
        type: 'event_callback',
        event: {
          text: 'Message coming from slack/receive unit test.',
          type: 'message',
          channel: slackBindings.channel
        }
      },
      provider: 'slack'
    };

    challengeParams = {
      verification_token: slackBindings.verification_token,
      token: slackBindings.verification_token,
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
      token: slackBindings.verification_token
    };

    payloadParams = {
      verification_token: slackBindings.verification_token,
      payload: JSON.stringify(payload)
    };

    payloadResult = {
      slack: {
        payload: JSON.stringify(payload)
      },
      provider: 'slack'
    };
  });

  it('validate slack/receive receives slack human message', () => {
    return slackReceive(messageParams).then(
      result => {
        assert.deepEqual(result, messageResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate slack/receive receives human interactive response', () => {
    return slackReceive(payloadParams).then(
      result => {
        assert.deepEqual(result, payloadResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate slack/receive passes on challenge', () => {
    return slackReceive(challengeParams).then(
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

    return slackReceive(messageParams).then(
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

    return slackReceive(messageParams).then(
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

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorBadVerificationTokens);
      }
    );
  });

  it('validate error when no verification token', () => {
    delete messageParams.verification_token;

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorBadVerificationTokens);
      }
    );
  });

  it('validate no challenge okay', () => {
    delete challengeParams.challenge;
    challengeResult.challenge = '';

    return slackReceive(challengeParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      challengeMessage => {
        assert.deepEqual(challengeMessage, challengeResult);
      }
    );
  });

  it('validate error when bad verification token', () => {
    messageParams.token = incorrectToken;

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorBadVerificationTokens);
      }
    );
  });

  it('validate error when subscription event was timed out and resent', () => {
    messageParams.__ow_headers = {
      'x-slack-retry-reason': 'http_timeout',
      'x-slack-retry-num': 1
    };

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.deepEqual(error, messageResult);
      }
    );
  });
});
