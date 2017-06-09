'use strict';

/**
 * Converts Conversation module output JSON data to JSON data of the Slack API input format
 *
 * @param  {JSON} params - JSON data in the sent by Conversation module
 * @return {JSON}        - JSON data in Slack API post.chatMessage format
 */
function main(params) {
  try {
    validateParameters(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const slackJson = {
    channel: params.raw_data.slack.event.channel,
    text: params.conversation.output.text[0]
  };

  return Promise.resolve(slackJson);
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Conversation JSON data
  if (!params.conversation) {
    throw new Error('No conversation output.');
  }
  // Required: Conversation output text
  if (
    !params.conversation.output ||
    !params.conversation.output.text ||
    !params.conversation.output.text[0]
  ) {
    throw new Error('No conversation output message.');
  }
  // Required: raw data from Slack channel
  if (!params.raw_data || !params.raw_data.slack) {
    throw new Error('No raw Slack data found.');
  }
  // Required: Slack event and channel
  if (!params.raw_data.slack.event || !params.raw_data.slack.event.channel) {
    throw new Error('No Slack channel found in raw data.');
  }
}

module.exports = main;
