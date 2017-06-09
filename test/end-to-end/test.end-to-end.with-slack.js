'use strict';

const assert = require('assert');
const openwhisk = require('openwhisk');

const openwhiskBindings = require('./../resources/openwhisk-bindings.json').openwhisk;
const safeExtractErrorMessage = require('./../resources/helper-methods.js').safeExtractErrorMessage;
const slackBindings = require('./../resources/slack-bindings.json').slack;

const carDashboardMsg = 'Hi. It looks like a nice drive today. What would you like me to do?  ';

/**
 * Slack prerequisites test suite verifies the Slack package is properly deployed in OpenWhisk
 */
describe('End-to-End tests: Slack prerequisites', () => {
  const ow = openwhisk(openwhiskBindings);

  const requiredActions = [
    'slack/post',
    'slack/receive',
    'slack/deploy',
    'starter-code/normalize-conversation-for-slack',
    'starter-code/normalize-slack-for-conversation'
  ];

  requiredActions.forEach(action => {
    it(`${action} action is deployed in OpenWhisk namespace`, () => {
      return ow.actions.get({ name: action }).then(
        () => {},
        error => {
          assert(
            false,
            `${action}, ${safeExtractErrorMessage(error)} Try running setup scripts again.`
          );
        }
      );
    });
  });
});

describe('End-to-End tests: Slack as channel package', () => {
  const ow = openwhisk(openwhiskBindings);
  const actionSlackPipeline = 'test-pipeline';
  let params = {};

  const expectedResult = {
    status: 'OK',
    params: {
      channel: slackBindings.channel,
      text: carDashboardMsg,
      as_user: 'true',
      token: slackBindings.bot_access_token
    },
    url: 'https://slack.com/api/chat.postMessage'
  };

  beforeEach(() => {
    params = {
      token: slackBindings.verification_token,
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXX',
      event: {
        type: 'message',
        channel: slackBindings.channel,
        user: 'UXXXXXXXXXX',
        text: 'Message coming from end to end test.',
        ts: 'XXXXXXXXX.XXXXXX'
      },
      type: 'event_callback',
      authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
      event_id: 'EvXXXXXXXX',
      event_time: 'XXXXXXXXXX'
    };
  });

  // Under validated circumstances, the channel (mocked parameters here) will send parameters
  // to slack/receive. The architecture will flow the response to slack/post, and slack/post will
  // send its response to this ow.action invocation.
  it('system works under validated circumstances', () => {
    return ow.actions
      .invoke({
        name: actionSlackPipeline,
        result: true,
        blocking: true,
        params
      })
      .then(
        result => {
          return assert.deepEqual(result, expectedResult);
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      );
  }).retries(5);
});
