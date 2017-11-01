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
const omit = require('object.omit');

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

    const auth = params.raw_input_data.auth;

    assert(
      auth.facebook && auth.facebook.page_access_token,
      'auth.facebook.page_access_token not found.'
    );

    const facebookParams = extractFacebookParams(params);
    const postUrl = params.url || 'https://graph.facebook.com/v2.6/me/messages';

    return postFacebook(
      facebookParams,
      postUrl,
      auth.facebook.page_access_token
    )
      .then(resolve)
      .catch(reject);
  });
}

/**
 *  Posts Conversation response to the message sender using the Facebook API https://graph.facebook.com/v2.6/me/messages
 *  as a default. If a different url is specified in params.url then it will post to that instead.
 *
 *  @param  {JSON} Facebook post parameters
 *  @postUrl  {string} Url for posting the response
 *  @accessToken  {string} auth token to send with the post request
 *
 *  @return - status of post request sent to Facebook POST API
 */
function postFacebook(params, postUrl, accessToken) {
  return new Promise((resolve, reject) => {
    request(
      {
        url: postUrl,
        qs: { access_token: accessToken },
        method: 'POST',
        json: params
      },
      (error, response) => {
        if (error) {
          reject(error.message);
        }
        if (response) {
          if (response.statusCode === 200) {
            // Facebook expects a "200" string/text response instead of a JSON.
            // With Cloud Functions if we have to return a string/text, then we'd have to specify
            // the field "text" and assign it a value that we'd like to return. In this case,
            // the value to be returned is a statusCode.
            resolve({
              text: response.statusCode,
              params,
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
    'sub_pipeline',
    'batched_messages'
  ]);

  return facebookParams;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Channel identifier
  assert(params.recipient && params.recipient.id, 'Recepient id not provided.');
  // Required: Message to send
  assert(params.message, 'Message object not provided.');

  // Required: raw_input_data and Facebook Auth
  assert(
    params.raw_input_data &&
      params.raw_input_data.auth &&
      params.raw_input_data.auth.facebook,
    'Facebook auth not provided.'
  );
}

module.exports = {
  main,
  name: 'facebook/post',
  postFacebook,
  validateParameters
};
