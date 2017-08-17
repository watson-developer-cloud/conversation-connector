'use strict';

const assert = require('assert');

/**
 * Mock action receiving a Slack event from slack/receive,
 *   and sending a text message to slack/post.
 *
 * @param  {JSON} params - Slack event subscription
 * @return {JSON}        - Slack POST parameters of text message
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);

    resolve({
      channel: params.slack.event.channel,
      text: params.slack.event.text
    });
  });
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: The channel provider communicating with this action
  assert(
    params.provider && params.provider === 'slack',
    'No Slack channel provider provided.'
  );

  // Required: The parameters of the channel provider
  assert(params.slack, 'No Slack data provided.');

  // Required: Slack event data
  assert(params.slack.event, 'No Slack event data provided.');

  // Required: Slack channel
  assert(params.slack.event.channel, 'No Slack channel provided.');

  // Required: Slack input text
  assert(params.slack.event.text, 'No Slack input text provided.');
}

module.exports = main;
