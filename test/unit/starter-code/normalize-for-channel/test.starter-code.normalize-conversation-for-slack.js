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
const errorNoRawInputData = 'No raw input data found.';
const errorNoSlackInputData = 'No Slack input data found.';
const errorNoConvInputData = 'No Conversation input data found.';
const errorNoSlackChannel = 'No Slack channel found in raw data.';

describe('Starter-Code Normalize-For-Slack Unit Tests', () => {
  let params;
  const slackParams = {
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
  };

  const expectedResult = {
    raw_input_data: {
      conversation: {
        input: {
          text
        }
      },
      slack: slackParams,
      provider: 'slack'
    },
    raw_output_data: {
      conversation: {
        output: {
          text: [text]
        }
      }
    },
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
      raw_input_data: {
        conversation: {
          input: {
            text
          }
        },
        slack: slackParams,
        provider: 'slack'
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

  it('validate error when no conversation output', () => {
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

  it('validate error when no slack input data', () => {
    delete params.raw_input_data;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoRawInputData);
      }
    );
  });

  it('validate error when no slack input data', () => {
    delete params.raw_input_data.slack;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoSlackInputData);
      }
    );
  });

  it('validate error when no conversation input data', () => {
    delete params.raw_input_data.conversation;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoConvInputData);
      }
    );
  });

  it('validate error when no slack channel', () => {
    delete params.raw_input_data.slack.event;

    return scNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error, errorNoSlackChannel);
      }
    );
  });
});
