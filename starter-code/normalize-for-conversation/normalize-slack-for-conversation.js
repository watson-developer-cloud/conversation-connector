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

/**
 * Converts Slack channel-formatted JSON data into Conversation SDK formatted JSON input.
 *
 * @param  {JSON} params - input parameters in Slack's event subscription format
 * @return {JSON}        - JSON data formatted as input for Conversation SDK
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);
    const auth = params.auth;

    resolve({
      conversation: {
        input: {
          text: getSlackInputMessage(params)
        }
      },
      raw_input_data: {
        slack: params.slack,
        provider: 'slack',
        bot_id: params.bot_id,
        auth,
        cloudant_context_key: generateCloudantKey(params, auth)
      }
    });
  });
}

/**
 * Gets and extracts the Slack input message from either a text or interactive message.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - Slack input message
 */
function getSlackInputMessage(params) {
  const slackEvent = params.slack.event;
  const slackEventMessage = slackEvent && slackEvent.message;

  const textMessage = slackEvent && (slackEvent.text || slackEventMessage.text);
  if (textMessage) {
    return textMessage;
  }

  const payloadAction = params.slack.payload &&
    JSON.parse(params.slack.payload) &&
    JSON.parse(params.slack.payload).actions &&
    JSON.parse(params.slack.payload).actions[0];
  const buttonMessage = payloadAction && payloadAction.value;
  if (buttonMessage) {
    return buttonMessage;
  }

  const menuMessage = payloadAction &&
    payloadAction.selected_options &&
    payloadAction.selected_options
      .reduce(
        (array, x) => {
          if (x.value) {
            return array.concat(x.value);
          }
          return array;
        },
        []
      )
      .join(' ');
  return menuMessage;
}

/**
 * Builds and returns a Cloudant database key from Slack input parameters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - cloudant database key
 */
function generateCloudantKey(params, auth) {
  assert(
    auth.conversation && auth.conversation.workspace_id,
    'auth.conversation.workspace_id absent!'
  );

  const slackEvent = params.slack.event;
  const slackPayload = params.slack.payload && JSON.parse(params.slack.payload);

  const slackTeamId = slackPayload
    ? slackPayload.team && slackPayload.team.id
    : params.slack.team_id;
  const slackUserId = slackPayload
    ? slackPayload.user && slackPayload.user.id
    : slackEvent &&
        (slackEvent.user || (slackEvent.message && slackEvent.message.user));
  const slackChannelId = slackPayload
    ? slackPayload.channel && slackPayload.channel.id
    : slackEvent && slackEvent.channel;
  const conversationWorkspaceId = auth.conversation.workspace_id;

  return `slack_${slackTeamId}_${conversationWorkspaceId}_${slackUserId}_${slackChannelId}`;
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: channel provider must be slack
  assert(params.provider, "Provider not supplied or isn't Slack.");
  assert.equal(
    params.provider,
    'slack',
    "Provider not supplied or isn't Slack."
  );

  // Required: JSON data for the channel provider
  assert(params.slack, 'Slack JSON data is missing.');

  // Required: either the Slack event subscription (text message)
  //  or the callback ID (interactive message)
  const messageType = params.slack.type ||
    (params.slack.payload &&
      JSON.parse(params.slack.payload) &&
      JSON.parse(params.slack.payload).callback_id);
  assert(messageType, 'No Slack message type specified.');

  const slackPayload = params.slack.payload && JSON.parse(params.slack.payload);

  // Required: Slack team ID
  const slackTeamId = params.slack.team_id ||
    (slackPayload.team && slackPayload.team.id);
  assert(slackTeamId, 'Slack team ID not found.');

  const slackEvent = params.slack.event;
  const slackEventMessage = slackEvent && slackEvent.message;

  // Required: Slack user ID
  const slackUserId = slackEvent
    ? slackEvent.user || slackEventMessage.user
    : slackPayload && slackPayload.user && slackPayload.user.id;
  assert(slackUserId, 'Slack user ID not found.');

  // Required: Slack channel
  const slackChannel = slackEvent
    ? slackEvent.channel
    : slackPayload && slackPayload.channel && slackPayload.channel.id;
  assert(slackChannel, 'Slack channel not found.');

  // Required: Slack message
  let slackMessage = slackEvent && (slackEvent.text || slackEventMessage.text);
  if (!slackMessage) {
    const payloadAction = slackPayload &&
      slackPayload.actions &&
      slackPayload.actions[0];

    slackMessage = payloadAction &&
      (payloadAction.value ||
        (payloadAction.selected_options &&
          payloadAction.selected_options[0] &&
          payloadAction.selected_options[0].value));
  }
  assert(slackMessage, 'No Slack message text provided.');

  // Required: auth
  assert(params.auth, 'No auth found.');
}

module.exports = {
  main,
  name: 'starter-code/normalize-slack-for-conversation',
  validateParameters
};
