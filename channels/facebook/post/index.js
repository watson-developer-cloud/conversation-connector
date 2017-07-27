'use strict';

const request = require('request');

/**
 *  Receives a Facebook POST JSON object and sends the object to the Facebook API.
 *
 *  @params - Facebook post parameters as outlined by https://graph.facebook.com/v2.6/me/messages
 *
 *  @return - status of post request sent to Facebook POST API
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const facebookParams = extractFacebookParams(params);
  const postUrl = params.url || 'https://graph.facebook.com/v2.6/me/messages';

  return new Promise((resolve, reject) => {
    request(
      {
        url: postUrl,
        qs: { access_token: facebookParams.access_token },
        method: 'POST',
        json: facebookParams
      },
      (error, response) => {
        if (error) {
          reject(error.message);
        }
        if (response) {
          if (response.statusCode === 200) {
            // Facebook expects a "200" string/text response instead of a JSON.
            // With openwhisk if we have to return a string/text, then we'd have to specify
            // the field "text" and assign it a value that we'd like to return. In this case,
            // the value to be returned is a statusCode.
            resolve({
              text: response.statusCode,
              params: facebookParams,
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
 *  Extracts and converts the input parameters to JSON that Facebook understands.
 *
 *  @params The parameters passed into the action
 *
 *  @return JSON containing all and only the parameter that Facebook /v2.6/me/messages
 *  graph API needs
 */
function extractFacebookParams(params) {
  const facebookParams = params;
  facebookParams.access_token = facebookParams.page_access_token;

  delete facebookParams.verification_token;
  delete facebookParams.page_access_token;
  delete facebookParams.app_secret;

  // TODO Delete these params in starter code???
  delete facebookParams.raw_input_data;
  delete facebookParams.raw_output_data;

  return facebookParams;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParams(params) {
  // Required: Access token of the bot
  if (!params.page_access_token) {
    throw new Error(
      'Page access token not provided. Please make sure you have entered page_access_token correctly'
    );
  }
  // Required: Channel identifier
  if (!params.recipient || !params.recipient.id) {
    throw new Error('Recepient id not provided.');
  }
  // Required: Message to send
  if (!params.message || !params.message.text) {
    throw new Error('Message text not provided.');
  }
}

module.exports = main;
