'use strict';

/**
 *  Slack channel receive action unit tests.
 */

const assert = require('assert');
const openwhiskBindings = require('./../../../resources/openwhisk-bindings.json').openwhisk;
const slackBindings = require('./../../../resources/slack-bindings.json').slack;
const slackReceive = require('./../../../../channels/slack/receive/index.js');

const errorBadVerificationTokens = 'Verification token is incorrect.';
const errorEventNotUnderstood = 'Event type not understood.';
const errorMessageNotUnderstood = 'Message type not understood.';
const errorSubscriptionType = 'No subscription type specified.';
const errorSubWithNoEvent = 'No event type specified in event callback slack subscription.';

describe('Slack Receive Unit Tests', () => {
  let challengeParams = {};
  let challengeResult = {};
  let messageParams = {};
  let messageResult = {};
  const incorrectToken = 'incorrect_token';

  beforeEach(() => {
    messageParams = {
      ow_api_host: openwhiskBindings.apihost,
      ow_api_key: openwhiskBindings.api_key,
      verification_token: slackBindings.verification_token,
      token: slackBindings.verification_token,
      event: {
        text: 'Message coming from slack/receive unit test.',
        type: 'message',
        channel: slackBindings.channel
      },
      type: 'event_callback'
    };

    challengeParams = {
      ow_api_host: openwhiskBindings.apihost,
      ow_api_key: openwhiskBindings.api_key,
      verification_token: slackBindings.verification_token,
      token: slackBindings.verification_token,
      type: 'url_verification',
      challenge: 'challenge_token'
    };

    challengeResult = {
      code: 200,
      challenge: 'challenge_token'
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

  it('validate slack/receive returns to action passed in params', () => {
    messageParams.starter_code_action_name = '/whisk.system/utils/echo';

    return slackReceive(messageParams).then(
      result => {
        assert.deepEqual(result, messageResult);
      },
      error => {
        assert(false, error);
      }
    );
  }).timeout(4000);

  it('validate error when no token', () => {
    delete messageParams.token;

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorBadVerificationTokens);
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
        assert.equal(error, errorBadVerificationTokens);
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
        assert.equal(error, errorBadVerificationTokens);
      }
    );
  });

  it('valdiate error when subscription type not understood', () => {
    messageParams.type = 'bad_event_type';

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorEventNotUnderstood);
      }
    );
  });

  it('validate error when event not specified', () => {
    delete messageParams.type;

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorSubscriptionType);
      }
    );
  });

  it('validate error when event type not a message', () => {
    messageParams.event.type = 'not_message';

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorMessageNotUnderstood);
      }
    );
  });

  it('validate error when subscription event_callback with no event type', () => {
    delete messageParams.event.type;

    return slackReceive(messageParams).then(
      () => {
        assert(false, 'Action suceeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorSubWithNoEvent);
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
