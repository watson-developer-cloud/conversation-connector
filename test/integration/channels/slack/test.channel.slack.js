'use strict';

/**
 *  Slack channel integration tests
 */
const assert = require('assert');
const openwhisk = require('openwhisk');
const openwhiskBindings = require('./../../../resources/openwhisk-bindings.json').openwhisk;
const slackBindings = require('./../../../resources/slack-bindings.json').slack;

const actionSlackMiddle = 'slack/middle';
const actionSlackReceive = 'slack/receive';

describe('Slack channel integration tests', () => {
  let ow;
  let slackReceiveParams = {};
  const expectedPostResults = {
    status: 'OK',
    url: 'https://slack.com/api/chat.postMessage',
    params: {
      as_user: 'true',
      channel: slackBindings.channel,
      text: 'Message coming from Slack integration test.',
      token: slackBindings.bot_access_token
    }
  };

  beforeEach(done => {
    ow = openwhisk(openwhiskBindings);

    slackReceiveParams = {
      token: slackBindings.verification_token,
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXX',
      event: {
        type: 'message',
        channel: slackBindings.channel,
        user: 'UXXXXXXXXXX',
        text: 'Message coming from Slack integration test.',
        ts: 'XXXXXXXXX.XXXXXX'
      },
      type: 'event_callback',
      authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
      event_id: 'EvXXXXXXXX',
      event_time: 'XXXXXXXXXX',
      starter_code_action_name: actionSlackMiddle
    };

    return done();
  });

  it('validate slack channel package works', done => {
    ow.actions
      .invoke({
        name: actionSlackReceive,
        params: slackReceiveParams,
        blocking: true,
        result: true
      })
      .then(
        result => {
          const responseMiddle = result.response.result;
          const responsePost = responseMiddle.response.result;

          try {
            assert.deepEqual(responsePost, expectedPostResults);
            return done();
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      );
  }).timeout(4000);
});
