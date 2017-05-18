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
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  const apiHost = params.ow_api_host;
  const apiKey = params.ow_api_key;
  const state = params.state;
  const clientSecret = params.client_secret;
  const clientId = params.client_id.substring(1);

  const promisedHash = createHmacKey(clientId, clientSecret);

  return new Promise((resolve, reject) => {
    promisedHash.then(hashJson => {
      const hash = hashJson.hash;
      if (hash !== state) {
        reject('Forgery attack detected.');
      }

      const redirectUri = params.redirect_uri;
      const code = params.code;

      // build url to the authorization server
      const requestUrl = `https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&code=${code}`;

      request(
        {
          url: requestUrl,
          method: 'GET',
          json: true
        },
        (error, response, body) => {
          if (response && response.statusCode === 200) {
            try {
              validateResponseBody(body);

              const ow = openwhisk({ apihost: apiHost, api_key: apiKey });
              const pkg = {
                parameters: [
                  {
                    key: 'ow_api_host',
                    value: apiHost
                  },
                  {
                    key: 'ow_api_key',
                    value: apiKey
                  },
                  {
                    key: 'access_token',
                    value: body.access_token
                  },
                  {
                    key: 'bot_user_id',
                    value: body.bot.bot_user_id
                  },
                  {
                    key: 'bot_access_token',
                    value: body.bot.bot_access_token
                  },
                  {
                    key: 'verification_token',
                    value: params.verification_token
                  },
                  {
                    key: 'client_id',
                    value: params.client_id
                  },
                  {
                    key: 'redirect_uri',
                    value: params.redirect_uri
                  },
                  {
                    key: 'client_secret',
                    value: params.client_secret
                  },
                  {
                    key: 'starter_code_action_name',
                    value: params.starter_code_action_name || ''
                  }
                ]
              };

              ow.packages
                .update({
                  packageName: 'slack',
                  package: pkg
                })
                .then(
                  () => {
                    resolve({ status: 'Slack bot is now authenticated.' });
                  },
                  err => {
                    reject(err.message);
                  }
                );
            } catch (e) {
              reject(e.message);
            }
          } else {
            reject(response);
          }
        }
      );
    });
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
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.setEncoding('hex');
  return new Promise(resolve => {
    hmac.end('authorize', () => {
      resolve({ hash: hmac.read() });
    });
  });
}

/**
 *  Validates the required parameters sent by the Slack Authentication server.
 *
 *  @body The response body sent by authentication server
 */
function validateResponseBody(body) {
  // Required: Response body
  if (!body) {
    throw new Error('No response body found in http request.');
  }
  // Required: Authentication access token
  if (!body.access_token) {
    throw new Error('No access token found in http request.');
  }
  // Required: Authentication bot identifical and access token
  if (!body.bot) {
    throw new Error('No bot credentials found in http request.');
  }
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParams(params) {
  // Required: OpenWhisk API host and key
  const apiHost = params.ow_api_host;
  const apiKey = params.ow_api_key;
  if (!apiHost || !apiKey) {
    throw new Error('No OpenWhisk API Host or Key provided.');
  }
  // Required: Slack verification token
  if (!params.verification_token) {
    throw new Error('No verification token provided.');
  }
  // Required: HMAC key provided by Slack to be verified
  if (!params.state) {
    throw new Error('No verification state provided.');
  }
  // Required: Slack credentials used to build outbound URL to authorization server
  if (
    !params.client_id ||
    !params.client_secret ||
    !params.redirect_uri ||
    !params.code
  ) {
    throw new Error('Not enough slack credentials provided.');
  }
}

module.exports = main;
