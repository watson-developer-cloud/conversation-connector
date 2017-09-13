'use strict';

const request = require('request');
const omit = require('object.omit');
const assert = require('assert');
/**
 *  Receives a Facebook POST JSON object and sends the object to the Facebook API.
 *
 *  @params - Facebook post parameters as outlined by https://graph.facebook.com/v2.6/me/messages
 *
 *  @return - status of post request sent to Facebook POST API
 */
function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (e) {
      reject(e.message);
    }
    const accessToken = params.page_access_token;
    const facebookParams = extractFacebookParams(params);
    const postUrl = params.url || 'https://graph.facebook.com/v2.6/me/messages';
    request(
      {
        url: postUrl,
        qs: { access_token: accessToken },
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
  const facebookParams = omit(params, [
    'page_access_token',
    'app_secret',
    'verification_token',
    'raw_input_data',
    'raw_output_data',
    'sub_pipeline'
  ]);

  return facebookParams;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Access token of the bot
  assert(params.page_access_token, 'Page access token not provided.');
  // Required: Channel identifier
  assert(params.recipient && params.recipient.id, 'Recepient id not provided.');
  // Required: Message to send
  assert(params.message, 'Message object not provided.');
}

module.exports = main;
