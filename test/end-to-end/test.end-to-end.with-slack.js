'use strict';

const assert = require('assert');
const openwhisk = require('openwhisk');

const openwhiskBindings = require('./../resources/openwhisk-bindings.json').openwhisk;
const safeExtractErrorMessage = require('./../resources/helper-methods.js').safeExtractErrorMessage;
const clearContextDb = require('./../utils/cloudant-utils.js').clearContextDb;

const slackBindings = require('./../resources/slack-bindings.json').slack;
const cloudantBindings = require('./../resources/cloudant-bindings.json');

const carDashboardReplyWelcome = 'Hi. It looks like a nice drive today. What would you like me to do?  ';
const carDashboardReplyLights = 'I\'ll turn on the lights for you.';

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
      text: carDashboardReplyWelcome,
      as_user: 'true',
      token: slackBindings.bot_access_token,
      workspace_id: 'e808d814-9143-4dce-aec7-68af02e650a8'
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

describe('End-to-End tests: Context package works', () => {
  const ow = openwhisk(openwhiskBindings);
  const contextPipeline = 'test-pipeline-context';
  let params = {};

  const expAfterTurn1 = {
    status: 'OK',
    params: {
      channel: slackBindings.channel,
      text: carDashboardReplyWelcome,
      as_user: 'true',
      token: slackBindings.bot_access_token,
      workspace_id: 'e808d814-9143-4dce-aec7-68af02e650a8'
    },
    url: 'https://slack.com/api/chat.postMessage'
  };

  const expAfterTurn2 = {
    status: 'OK',
    params: {
      channel: slackBindings.channel,
      text: carDashboardReplyLights,
      as_user: 'true',
      token: slackBindings.bot_access_token,
      workspace_id: 'e808d814-9143-4dce-aec7-68af02e650a8'
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
        text: 'Hello',
        ts: 'XXXXXXXXX.XXXXXX'
      },
      type: 'event_callback',
      authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
      event_id: 'EvXXXXXXXX',
      event_time: 'XXXXXXXXXX'
    };
    clearContextDb(
      cloudantBindings.database.dbname,
      cloudantBindings.database.cloudant_url
    );
  });

  // Under validated circumstances, context package should load and save context
  // to complete a single-turn conversation successfully.
  it('context pipeline works for single Conversation turn', () => {
    return ow.actions
      .invoke({
        name: contextPipeline,
        result: true,
        blocking: true,
        params
      })
      .then(
        result => {
          return assert.deepEqual(result, expAfterTurn1);
        },
        error => {
          return assert(false, safeExtractErrorMessage(error));
        }
      );
  }).retries(5);

  // Under validated circumstances, context package should load and save context
  // to complete a multi-turn conversation successfully.
  it('context pipeline works for multiple Conversation turns', () => {
    return ow.actions
      .invoke({
        name: contextPipeline,
        result: true,
        blocking: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, expAfterTurn1);

        // Change the input text for the second turn.
        params.event.text = 'Turn on the lights';

        // Invoke the context pipeline sequence again.
        // The context package should read the updated context from the previous turn.
        return ow.actions.invoke({
          name: contextPipeline,
          result: true,
          blocking: true,
          params
        });
      })
      .then(result => {
        return assert.deepEqual(result, expAfterTurn2);
      })
      .catch(err => {
        return assert(false, safeExtractErrorMessage(err));
      });
  }).retries(5);
});
