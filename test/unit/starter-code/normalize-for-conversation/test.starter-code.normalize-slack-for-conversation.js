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
const errorNoWorkspaceId = 'workspace_id not present as a package binding.';

describe('Starter Code Normalize-Slack-For-Conversation Unit Tests', () => {
  let textMessageParams;
  let expectedResult;
  let buttonPayload;
  let buttonMessageParams;

  beforeEach(() => {
    textMessageParams = {
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
      provider: 'slack',
      workspace_id: 'abcd-123',
      context: {}
    };

    expectedResult = {
      conversation: {
        input: {
          text
        }
      },
      raw_input_data: {
        slack: textMessageParams.slack,
        provider: 'slack',
        cloudant_key: 'slack_TXXXXXXXX_abcd-123_U2147483697_CXXXXXXXXX'
      }
    };

    buttonPayload = {
      actions: [
        {
          name: 'shirt_size_small',
          value: text,
          type: 'button'
        }
      ],
      team: {
        id: 'TXXXXXXXX',
        name: 'test_team'
      },
      user: {
        id: 'U2147483697',
        name: 'test_user'
      },
      channel: {
        id: channel,
        name: 'test_channel'
      },
      callback_id: 'test_callback_id',
      token: 'XXYYZZ'
    };

    buttonMessageParams = {
      slack: {
        payload: JSON.stringify(buttonPayload)
      },
      provider: 'slack',
      workspace_id: 'abcd-123',
      context: {}
    };
  });

  it('validate normalization works', () => {
    return scNormSlackForConvo(textMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for buttons', () => {
    expectedResult.raw_input_data.slack = buttonMessageParams.slack;

    return scNormSlackForConvo(buttonMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for menus', () => {
    const menuPayload = buttonPayload;
    menuPayload.actions = [
      {
        name: 'shirt_size',
        selected_options: [{ value: text }, {}]
      }
    ];
    const menuMessageParams = buttonMessageParams;
    menuMessageParams.slack.payload = JSON.stringify(menuPayload);

    expectedResult.raw_input_data.slack = menuMessageParams.slack;

    return scNormSlackForConvo(menuMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for edited messages', () => {
    textMessageParams.slack.event.message = {
      user: 'U2147483697',
      ts: '1355517523.000005',
      text
    };
    delete textMessageParams.slack.event.user;
    delete textMessageParams.slack.event.ts;
    delete textMessageParams.slack.event.text;

    expectedResult.raw_input_data.slack = textMessageParams.slack;

    return scNormSlackForConvo(textMessageParams).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when provider missing', () => {
    delete textMessageParams.provider;

    return scNormSlackForConvo(textMessageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorBadSupplier);
      }
    );
  });

  it('validate error when slack data missing', () => {
    delete textMessageParams.slack;

    return scNormSlackForConvo(textMessageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoSlackData);
      }
    );
  });

  it('validate error when workspace_id not bound to package', () => {
    delete textMessageParams.workspace_id;

    return scNormSlackForConvo(textMessageParams).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoWorkspaceId);
      }
    );
  });
});
