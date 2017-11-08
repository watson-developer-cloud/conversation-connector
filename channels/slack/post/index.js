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
const request = require('request');

const mustUrlEncodeUrls = [
  'https://slack.com/api/chat.postMessage',
  'https://slack.com/api/chat.update',
  'https://slack.com/api/chat.postEphemeral'
];
const slackResponseHookUrl = 'hooks.slack.com';

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
    const postUrl = params.url || 'https://slack.com/api/chat.postMessage';

    const auth = params.raw_input_data.auth;

    const postParams = extractSlackParameters(useAuth(params, auth));

    return postSlack(postParams, postUrl).then(resolve).catch(reject);
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
        form: modifyPostParams(slackParams, postUrl)
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
function modifyPostParams(params, postUrl) {
  let slackParams = Object.assign({}, params);
  if (slackParams.attachments && mustUrlEncodeUrls.indexOf(postUrl) >= 0) {
    slackParams.attachments = JSON.stringify(slackParams.attachments);
  } else if (postUrl.indexOf(slackResponseHookUrl) >= 0) {
    // if the post URL is a hook URL provided by Slack, then this is an interactive message update,
    //  and the parameters need to be stringified before being sent
    slackParams = JSON.stringify(slackParams);
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
  const noIncludeKeys = ['raw_input_data', 'raw_output_data', 'url'];
  const slackParams = {};

  Object.keys(params).forEach(key => {
    if (noIncludeKeys.indexOf(key) < 0) {
      slackParams[key] = params[key];
    }
  });
  slackParams.as_user = slackParams.as_user || 'true';
  return slackParams;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Slack channel
  assert(params.channel, 'Channel not provided.');

  // Required: Message to send
  assert(params.text, 'Message text not provided.');

  // Required: Bot ID
  assert(
    params.raw_input_data && params.raw_input_data.bot_id,
    'Bot ID not provided.'
  );

  // Required: auth
  assert(
    params.raw_input_data && params.raw_input_data.auth,
    'No raw_input_data.auth found.'
  );
}

/**
 *  Uses the loaded auth info to attach bot_access_token
 *  to the payload before posting the response to Slack.
 *
 *  @params - {JSON} Slack params to be updated with the auth token
 *  @auth - {JSON} loaded auth data
 *
 *  @return updated Slack params containing the token required for posting
 */
function useAuth(params, auth) {
  const returnParams = params;

  const botId = params.raw_input_data.bot_id;
  assert(botId, 'No bot user found in parameters.');
  const botAccessToken = auth &&
    auth.slack &&
    auth.slack.bot_users &&
    auth.slack.bot_users[botId] &&
    auth.slack.bot_users[botId].bot_access_token;
  assert(botAccessToken, 'bot_access_token absent in auth.');

  returnParams.token = botAccessToken;
  return returnParams;
}

module.exports = {
  main,
  name: 'slack/post',
  validateParameters,
  postSlack,
  modifyPostParams
};
