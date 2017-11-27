/**
 * Copyright IBM Corp. 2017
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const assert = require('assert');

const urlChatPost = 'https://slack.com/api/chat.postMessage';
const urlChatUpdate = 'https://slack.com/api/chat.update';

/**
 * Converts Conversation module output JSON data to JSON data of the Slack API input format
 *
 * @param  {JSON} params - JSON data in the sent by Conversation module
 * @return {JSON}        - JSON data in Slack API post.chatMessage format
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);

    const output = {
      channel: getSlackChannel(params),
      url: getSlackPostUrl(params),
      raw_input_data: params.raw_input_data,
      raw_output_data: {
        conversation: params.conversation
      }
    };

    resolve(insertConversationOutput(params, output));
  });
}

/**
 * Get the Slack channel from parameters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - Slack channel ID
 */
function getSlackChannel(params) {
  const slackEvent = params.raw_input_data.slack.event;
  const slackPayload = params.raw_input_data.slack.payload &&
    JSON.parse(params.raw_input_data.slack.payload);

  return slackEvent
    ? slackEvent.channel
    : slackPayload && slackPayload.channel && slackPayload.channel.id;
}

/**
 * Get and determine the Slack post endpoint URL from parameters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - Slack post endpoint URL
 */
function getSlackPostUrl(params) {
  return params.raw_input_data.slack.payload
    ? JSON.parse(params.raw_input_data.slack.payload).response_url ||
        urlChatUpdate
    : urlChatPost;
}

/**
 * Builds on an incomplete Slack output and inserts remaining output messages.
 *   including the text, attachments, and previous message timestamp.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @param  {JSON} output - incomplete Slack output to be build upon
 * @return {JSON}        - complete Slack output to be sent to Slack post endpoint
 */
function insertConversationOutput(params, output) {
  const slackOutput = output;

  // if the dialog-node contained slack-specific data, use that entirely
  if (params.conversation.output.slack) {
    Object.keys(params.conversation.output.slack).forEach(key => {
      slackOutput[key] = params.conversation.output.slack[key];
    });
    return slackOutput;
  }

  const text = getOutputText(params);
  if (text) {
    slackOutput.text = text;
  }

  const attachments = getAttachments(params);
  if (attachments) {
    slackOutput.attachments = attachments;
  }

  const ts = getOriginalMessageTimestamp(params);
  if (ts) {
    slackOutput.ts = ts;
  }

  return slackOutput;
}

/**
 * Gets and determines the final output text from input paramters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - final output text
 */
function getOutputText(params) {
  const slackEvent = params.raw_input_data.slack.event;
  const slackPayload = params.raw_input_data.slack.payload &&
    JSON.parse(params.raw_input_data.slack.payload);

  return slackEvent
    ? params.conversation.output.text.join(' ')
    : slackPayload &&
        slackPayload.original_message &&
        slackPayload.original_message.text;
}

/**
 * Gets and determines the final output attachments from input parameters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {JSON}        - final output attachments
 */
function getAttachments(params) {
  const slackEvent = params.raw_input_data.slack.event;

  return slackEvent
    ? undefined
    : [{ text: params.conversation.output.text.join(' ') }];
}

/**
 * Gets the previous message timestamp (if provided) from input paramters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - final previous message timestamp
 */
function getOriginalMessageTimestamp(params) {
  const slackEvent = params.raw_input_data.slack.event;
  const slackPayload = params.raw_input_data.slack.payload &&
    JSON.parse(params.raw_input_data.slack.payload);

  return slackEvent
    ? (slackEvent.message && slackEvent.message.ts) || slackEvent.ts
    : slackPayload &&
        slackPayload.original_message &&
        slackPayload.original_message.ts;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @param  {JSON} params - The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Conversation JSON data
  assert(params.conversation, 'No conversation output.');

  // Required Conversation output text
  assert(params.conversation.output, 'No conversation output message.');
  assert(params.conversation.output.text, 'No conversation output message.');

  // Required: raw input data
  assert(params.raw_input_data, 'No raw input data found.');

  // Required: Slack input data
  assert(params.raw_input_data.slack, 'No Slack input data found.');

  // Required: Conversation input data
  assert(
    params.raw_input_data.conversation,
    'No Conversation input data found.'
  );

  const slackEvent = params.raw_input_data.slack.event;
  const slackPayload = params.raw_input_data.slack.payload &&
    JSON.parse(params.raw_input_data.slack.payload);

  // Required: Slack channel
  const slackChannel = slackEvent
    ? slackEvent.channel
    : slackPayload && slackPayload.channel && slackPayload.channel.id;
  assert(slackChannel, 'No Slack channel found in raw data.');
}

module.exports = main;
