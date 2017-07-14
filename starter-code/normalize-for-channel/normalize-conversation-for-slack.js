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

  const normalizedJson = {
    channel: params.raw_input_data.slack.event.channel,
    text: params.conversation.output.text.join(' '), // Combine multiple text responses from Conversation(if any)
    // TODO: Decide how to add @mentions
    raw_input_data: params.raw_input_data,
    raw_output_data: {
      conversation: params.conversation
    }
  };

  return Promise.resolve(normalizedJson);
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
  if (!params.conversation.output || !params.conversation.output.text) {
    throw new Error('No conversation output message.');
  }
  // Required: raw input data
  if (!params.raw_input_data) {
    throw new Error('No raw input data found.');
  }
  // Required: Slack input data
  if (!params.raw_input_data.slack) {
    throw new Error('No Slack input data found.');
  }
  // Required: Conversation input data
  if (!params.raw_input_data.conversation) {
    throw new Error('No Conversation input data found.');
  }
  // Required: Slack event and channel
  if (
    !params.raw_input_data.slack.event ||
    !params.raw_input_data.slack.event.channel
  ) {
    throw new Error('No Slack channel found in raw data.');
  }
}

module.exports = main;
