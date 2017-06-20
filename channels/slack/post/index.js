'use strict';

const request = require('request');

/**
 *  Receives a Slack POST JSON object and sends the object to the Slack API.
 *
 *  @params - Slack post parameters as outlined by https://api.slack.com/methods/chat.postMessage
 *
 *  @return - status of post request send to Slack POST API
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const slackParams = extractSlackParams(params);
  const postUrl = params.url || 'https://slack.com/api/chat.postMessage';

  return new Promise((resolve, reject) => {
    request(
      {
        url: postUrl,
        method: 'POST',
        formData: slackParams
      },
      (error, response) => {
        if (error) {
          reject(error.message);
        }
        if (response) {
          if (response.statusCode === 200) {
            resolve({
              status: response.statusMessage,
              params: slackParams,
              url: postUrl
            });
          }
          reject(
            `Action returned with status code ${response.statusCode}, message: ${response.statusMessage}`
          );
        }
        reject(`An unexpected error occurred when sending POST to ${postUrl}.`);
      }
    );
  });
}

/**
 *  Extracts and converts the input parameters to JSON that Slack understands.
 *
 *  @params The parameters passed into the action
 *
 *  @return JSON containing all and only the parameter that Slack chat.postMessage API needs
 */
function extractSlackParams(params) {
  const slackParams = params;

  // as_user = true makes it default to use the default bot name and icon
  slackParams.as_user = slackParams.as_user || 'true';
  slackParams.token = slackParams.bot_access_token;

  delete slackParams.starter_code_action_name;
  delete slackParams.redirect_uri;
  delete slackParams.client_id;
  delete slackParams.client_secret;
  delete slackParams.ow_api_host;
  delete slackParams.ow_api_key;
  delete slackParams.verification_token;
  delete slackParams.access_token;
  delete slackParams.bot_user_id;
  delete slackParams.bot_access_token;

  delete slackParams.raw_input_data;
  delete slackParams.raw_output_data;

  return slackParams;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParams(params) {
  // Required: Access token of the bot
  if (!params.bot_access_token) {
    throw new Error('Bot access token not provided. (Run "./setup.sh" again?)');
  }
  // Required: Channel identifier
  if (!params.channel) {
    throw new Error('Channel not provided.');
  }
  // Required: Message to send
  if (!params.text) {
    throw new Error('Message text not provided.');
  }
}

module.exports = main;
