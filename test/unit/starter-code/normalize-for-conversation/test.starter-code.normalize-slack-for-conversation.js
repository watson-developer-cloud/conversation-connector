'use strict';

/**
 * Unit Tests for normalizing slack JSON parameters to conversation SDK parameters.
 */

const assert = require('assert');
const scNormSlackForConvo = require('./../../../../starter-code/normalize-for-conversation/normalize-slack-for-conversation.js');

const channel = 'CXXXXXXXXX';
const text = 'Message coming from starter-code/normalize_slack_for_conversation unit test.';

const errorBadSupplier = "Provider not supplied or isn't Slack.";
const errorNoSlackData = 'Slack JSON data is missing.';

describe('Starter Code Normalize-Slack-For-Conversation Unit Tests', () => {
  let params;
  let expectedResult;

  beforeEach(() => {
    params = {
      slack: {
        token: 'XXYYZZ',
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXXX',
        event: {
          type: 'message',
          user: 'U2147483697',
          ts: '1355517523.000005',
          channel,
          text
        },
        type: 'event_callback',
        authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
        event_id: 'Ev08MFMKH6',
        event_time: 1234567890
      },
      provider: 'slack'
    };

    expectedResult = {
      conversation: {
        input: {
          text
        }
      },
      raw_input_data: {
        slack: params.slack,
        provider: 'slack'
      }
    };
  });

  it('validate normalizing works', () => {
    return scNormSlackForConvo(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when provider missing', () => {
    delete params.provider;

    return scNormSlackForConvo(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorBadSupplier);
      }
    );
  });

  it('validate error when slack data missing', () => {
    delete params.slack;

    return scNormSlackForConvo(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoSlackData);
      }
    );
  });
});
