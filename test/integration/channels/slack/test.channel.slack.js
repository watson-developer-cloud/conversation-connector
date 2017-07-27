'use strict';

/**
 *  Slack channel integration tests
 */
const assert = require('assert');
const openwhisk = require('openwhisk');
const openwhiskBindings = require('./../../../resources/openwhisk-bindings.json').openwhisk;
const slackBindings = require('./../../../resources/slack-bindings.json').slack;

const actionSlackPipeline = 'slack/integration-pipeline';

describe('Slack channel integration tests', () => {
  let ow;
  let slackParams = {};
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

    slackParams = {
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
      event_time: 'XXXXXXXXXX'
    };

    return done();
  });

  it('validate slack channel package works', done => {
    ow.actions
      .invoke({
        name: actionSlackPipeline,
        params: slackParams,
        blocking: true,
        result: true
      })
      .then(
        success => {
          try {
            assert.deepEqual(success, expectedPostResults);
            return done();
          } catch (e) {
            return done(e);
          }
        },
        error => {
          return done(error);
        }
      );
  })
    .timeout(4000)
    .retries(4);
});
