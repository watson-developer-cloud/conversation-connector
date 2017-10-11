'use strict';

/**
 * Unit Tests for normalizing slack JSON parameters to conversation SDK parameters.
 */

const assert = require('assert');
const nock = require('nock');

const envParams = process.env;

process.env.__OW_ACTION_NAME = `/${process.env.__OW_NAMESPACE}/pipeline_pkg/action-to-test`;

const scNormSlackForConvo = require('./../../../../starter-code/normalize-for-conversation/normalize-slack-for-conversation.js');

const channel = 'CXXXXXXXXX';
const text = 'Message coming from starter-code/normalize_slack_for_conversation unit test.';

const errorBadSupplier = "Provider not supplied or isn't Slack.";
const errorNoSlackData = 'Slack JSON data is missing.';

describe('Starter Code Normalize-Slack-For-Conversation Unit Tests', () => {
  let textMessageParams;
  let expectedResult;
  let buttonPayload;
  let buttonMessageParams;
  let func;
  let auth;

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
        cloudant_context_key: `slack_TXXXXXXXX_${envParams.__TEST_CONVERSATION_WORKSPACE_ID}_U2147483697_CXXXXXXXXX`
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
      context: {}
    };

    auth = {
      conversation: {
        workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
      }
    };
  });

  it('validate normalizing works for a regular text message', () => {
    func = scNormSlackForConvo.main;
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(textMessageParams).then(
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

  it('validate normalization works for buttons', () => {
    expectedResult.raw_input_data.slack = buttonMessageParams.slack;

    func = scNormSlackForConvo.main;
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(buttonMessageParams).then(
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

    func = scNormSlackForConvo.main;
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(menuMessageParams).then(
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

    func = scNormSlackForConvo.main;
    const mockOW = nock(owUrl)
      .get(`/${namespace}/packages/${packageName}`)
      .reply(200, expectedOW);

    const mockCloudantGet = nock(cloudantUrl)
      .get(`/${cloudantAuthDbName}/${cloudantAuthKey}`)
      .query(() => {
        return true;
      })
      .reply(200, auth);

    return func(textMessageParams).then(
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

  it('validate error when provider missing', () => {
    delete textMessageParams.provider;
    func = scNormSlackForConvo.validateParameters;
    try {
      func(textMessageParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorBadSupplier);
    }
  });

  it('validate error when slack data missing', () => {
    delete textMessageParams.slack;
    func = scNormSlackForConvo.validateParameters;
    try {
      func(textMessageParams);
    } catch (e) {
      assert.equal('AssertionError', e.name);
      assert.equal(e.message, errorNoSlackData);
    }
  });
});
