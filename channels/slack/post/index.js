'use strict';

const assert = require('assert');
const request = require('request');

const mustUrlEncodeUrls = [
  'https://slack.com/api/chat.postMessage',
  'https://slack.com/api/chat.update',
  'https://slack.com/api/chat.postEphemeral'
];

/**
 * Receives a Slack POST JSON object and sends the object to the Slack API.
 *
 * @param  {JSON} params - Slack post parameters as outlined by
 *                       https://api.slack.com/methods/chat.postMessage
 * @return {Promise}     - status of post request send to Slack POST API
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParameters(params);

    const slackParams = extractSlackParameters(params);
    const postUrl = params.url || 'https://slack.com/api/chat.postMessage';

    return postSlack(slackParams, postUrl).then(resolve).catch(reject);
  });
}

/**
 * Sends a message to Slack as the bot by sending a POST request to the specified endpoint.
 *
 * @param  {JSON} slackParams - Slack parameters to be sent to the Slack server
 * @param  {string} postUrl   - Slack server endpoint to sent POST to
 * @return {Promise}          - return status of the POST
 */
function postSlack(slackParams, postUrl) {
  return new Promise((resolve, reject) => {
    request(
      {
        url: postUrl,
        method: 'POST',
        form: stringifyUrlAttachments(slackParams, postUrl)
      },
      (error, response) => {
        if (error) {
          reject(error);
        } else if (response && response.statusCode === 200) {
          resolve(slackParams);
        } else {
          reject(
            `Action returned with status code ${response.statusCode}, message: ${response.statusMessage}`
          );
        }
      }
    );
  });
}

/**
 * When POSTing messages using one of the three endpoints listed in mustEncodeUrls,
 *   the attachments must be url-encoded or stringified.
 *   For more information, see https://api.slack.com/interactive-messages, under
 *     "Using chat.postMessage, chat.postEphemeral, chat.update, and chat.unfurl".
 *
 * @param  {JSON} params     - The parameters passed into the action
 * @param  {string} postUrl  - the POST url which determines if the parameters should be encoded
 * @return {JSON}            - result parameters after encoding
 */
function stringifyUrlAttachments(params, postUrl) {
  const slackParams = Object.assign({}, params);
  if (slackParams.attachments && mustUrlEncodeUrls.indexOf(postUrl) >= 0) {
    slackParams.attachments = JSON.stringify(slackParams.attachments);
  }
  return slackParams;
}

/**
 *  Extracts and converts the input parameters to JSON that Slack understands.
 *
 *  @params The parameters passed into the action
 *
 *  @return JSON containing all and only the parameter that Slack chat.postMessage API needs
 */
function extractSlackParameters(params) {
  const noIncludeKeys = [
    'client_id',
    'client_secret',
    'redirect_uri',
    'verification_token',
    'access_token',
    'bot_access_token',
    'bot_user_id',
    'raw_input_data',
    'raw_output_data',
    'url'
  ];
  const slackParams = {};

  Object.keys(params).forEach(key => {
    if (noIncludeKeys.indexOf(key) < 0) {
      slackParams[key] = params[key];
    }
  });
  slackParams.as_user = slackParams.as_user || 'true';
  slackParams.token = params.bot_access_token;

  return slackParams;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Access token of the bot
  assert(params.bot_access_token, 'No bot access token provided.');

  // Required: Slack channel
  assert(params.channel, 'Channel not provided.');

  // Required: Message to send
  assert(params.text, 'Message text not provided.');
}

module.exports = main;
