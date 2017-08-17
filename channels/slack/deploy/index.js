const assert = require('assert');
const crypto = require('crypto');
const request = require('request');
const openwhisk = require('openwhisk');

/**
 *  This action is used by Slack OAuth.
 *  After the user clicks 'Authorize' in the browser and allows Slack bot privileges,
 *   Slack will begin communicate between its authorization server and this action.
 *
 *  More information is provided here: https://api.slack.com/docs/oauth.
 *
 *  @params Parameters passed by Slack:
 *    {
 *      state: 'xxxx', // HMAC encrypted message to prevent forgery attacks
 *      redirect_uri: 'https://host.net/org_space/slack/deploy', // web endpoint of this action
 *      code: 'yyyy' // temporary auth code to be sent back as-in to the authorization server
 *    }
 *
 *  @return Status of the request to the Slack authorization server,
 *    as well as overall status of the Slack OAuth process
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParameters(params);

    const ow = openwhisk();

    const state = params.state;
    const clientId = params.client_id.substring(1);
    const clientSecret = params.client_secret;

    const hash = createHmacKey(clientId, clientSecret);

    if (hash !== state) {
      reject('Security hash does not match hash from the server.');
    }

    const redirectUri = params.redirect_uri;
    const code = params.code;

    // build url to the authorization server
    const requestUrl = `https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&code=${code}`;

    request(
      {
        url: requestUrl,
        json: true
      },
      (error, response, body) => {
        if (
          response && response.statusCode >= 200 && response.statusCode < 400
        ) {
          try {
            validateResponseBody(body);

            const pkg = {
              parameters: [
                {
                  key: 'access_token',
                  value: body.access_token
                },
                {
                  key: 'bot_access_token',
                  value: body.bot.bot_access_token
                },
                {
                  key: 'bot_user_id',
                  value: body.bot.bot_user_id
                },
                {
                  key: 'client_id',
                  value: params.client_id
                },
                {
                  key: 'client_secret',
                  value: params.client_secret
                },
                {
                  key: 'redirect_uri',
                  value: params.redirect_uri
                },
                {
                  key: 'verification_token',
                  value: params.verification_token
                }
              ]
            };

            ow.packages.update({ packageName: 'slack', package: pkg }).then(
              () => {
                resolve({
                  headers: { 'Content-Type': 'text/html' },
                  body: 'Authorized successfully!'
                });
              },
              err => {
                reject(err);
              }
            );
          } catch (e) {
            reject(e);
          }
        } else {
          reject(response);
        }
      }
    );
  });
}

/**
 *  Create an encrypted HMAC key out of the client ID, client Secret, and the word 'authorize'.
 *
 *  @clientId Client ID of the OpenWhisk user used to create HMAC key
 *  @clientSecret Client secret of the OpenWhisk user used to create HMAC key
 *
 *  @return A promise wrapping the HMAC key
 */
function createHmacKey(clientId, clientSecret) {
  const hmacKey = `${clientId}&${clientSecret}`;
  return crypto.createHmac('sha256', hmacKey).update('authorize').digest('hex');
}

/**
 *  Validates the required parameters sent by the Slack Authentication server.
 *
 *  @body The response body sent by authentication server
 */
function validateResponseBody(body) {
  // Required: Response body
  assert(body, 'No response body found in http request.');

  // Required: Authentication access token
  assert(body.access_token, 'No access token found in http request.');

  // Required: Authentication bot access token
  assert(
    body.bot && body.bot.bot_access_token,
    'No bot credentials found in http request.'
  );

  // Required: Authentication bot user ID
  assert(body.bot && body.bot.bot_user_id, 'No bot ID found in http request.');
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Slack verfication token
  assert(params.verification_token, 'No verification token provided.');

  // Required: HMAC key provided by Slack to be verified
  assert(params.state, 'No verification state provided.');

  // Required: Slack credentials used to build outbound URL to authorization server
  assert(params.client_id, 'Not enough slack credentials provided.');
  assert(params.client_secret, 'Not enough slack credentials provided.');
  assert(params.redirect_uri, 'Not enough slack credentials provided.');
  assert(params.code, 'Not enough slack credentials provided.');
}

module.exports = main;
