'use strict';

const assert = require('assert');

/**
 * Mock action receiving a Slack attachment payload from slack/receive,
 *   and sending an attached response to slack/post.
 *
 * @param  {JSON} params - Slack event subscription
 * @return {JSON}        - Slack POST parameters of text message
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);

    const payload = JSON.parse(params.slack.payload);

    resolve({
      channel: payload.channel.id,
      text: payload.original_message.text,
      attachments: [
        {
          text: 'Message coming from Slack integration test.'
        }
      ]
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
    'No Slack channel provided supplied.'
  );

  // Required: The parameters of the channel provider
  assert(params.slack, 'No Slack data or event parameters provided.');

  // Required: Slack attached message payload
  assert(
    params.slack.payload && JSON.parse(params.slack.payload),
    'No Slack data payload provided.'
  );

  const payload = JSON.parse(params.slack.payload);

  // Required: Slack channel
  assert(payload.channel.id, 'No Slack channel provided.');

  // Required: Slack original message
  assert(payload.original_message, 'No Slack original message provided.');
}

module.exports = main;
