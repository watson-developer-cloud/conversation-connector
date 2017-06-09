'use strict';

/**
 * Unit tests for normalizing conversation SDK output parameters into Slack parameters
 */

const assert = require('assert');
const scNormForSlack = require('./../../../../starter-code/normalize-for-channel/normalize-conversation-for-slack.js');

const channel = 'CXXXXXXXXX';
const text = 'Message coming from starter-code/normalize_for_slack unit test.';

const errorNoConversation = 'No conversation output.';
const errorNoOutputMessage = 'No conversation output message.';
const errorNoRawData = 'No raw Slack data found.';
const errorNoChannel = 'No Slack channel found in raw data.';

describe('Starter-Code Normalize-For-Slack Unit Tests', () => {
  let params;
  const expectedResult = {
    channel,
    text
  };

  beforeEach(() => {
    params = {
      conversation: {
        output: {
          text: [text]
        }
      },
      raw_data: {
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
        }
      }
    };
  });

  it('validate normalization works', () => {
    return scNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no conversation data', () => {
    delete params.conversation;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoConversation);
      }
    );
  });

  it('validate error when no output text', () => {
    delete params.conversation.output;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoOutputMessage);
      }
    );
  });

  it('validate error when no slack raw data', () => {
    delete params.raw_data;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoRawData);
      }
    );
  });

  it('validate error when no channel', () => {
    delete params.raw_data.slack.event.channel;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoChannel);
      }
    );
  });
});
