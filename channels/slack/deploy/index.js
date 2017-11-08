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

const assert = require('assert');
const crypto = require('crypto');
const request = require('request-promise');
const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';

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
    const returnUrl = params.state &&
      JSON.parse(decodeURIComponent(params.state)) &&
      JSON.parse(decodeURIComponent(params.state)).success_url;

    try {
      validateParameters(params);
    } catch (error) {
      returnWithCallback(returnUrl, reject, {
        code: 400,
        message: error.message
      });
    }

    const code = params.code;
    const state = params.state && JSON.parse(decodeURIComponent(params.state));

    let cloudantCreds;

    getCloudantCreds()
      .then(credentials => {
        cloudantCreds = credentials;
        return loadAuth(cloudantCreds);
      })
      .then(auth => {
        // obtain all information needed to contruct the OAuth access URL
        //  either from the input parameters or from the auth document
        const authSlackClientId = auth && auth.slack && auth.slack.client_id;
        const authSlackClientSecret = auth &&
          auth.slack &&
          auth.slack.client_secret;
        const authSlackBotUsers = auth && auth.slack && auth.slack.bot_users;
        const signature = state && state.signature;

        // either the auth document already exists (aka this is an existing distributed app),
        //  or no auth document exists and this is a first-time deploy
        if (!state && Object.keys(auth).length === 0) {
          throw new Error('No deployment information found.');
        } else if (!authSlackBotUsers || authSlackBotUsers.length === 0) {
          const hmac = createHmacKey(authSlackClientId, authSlackClientSecret);
          if (hmac !== signature) {
            throw new Error(
              'Security hash does not match hash from the server.'
            );
          }
        }

        const queries = {
          client_id: authSlackClientId,
          client_secret: authSlackClientSecret,
          redirect_uri: state && state.redirect_url,
          code
        };
        const requestUrl = constructOAuthAccessUrl(queries);

        return request({ uri: requestUrl, json: true });
      })
      .then(body => {
        validateResponseBody(body);
        return saveAuth(cloudantCreds, body);
      })
      .then(() => {
        const form = {
          code: 200,
          message: 'Authorized successfully!'
        };
        returnWithCallback(returnUrl, resolve, form);
      })
      .catch(error => {
        const errorString = typeof error === 'string' ? error : error.message;
        const form = {
          code: 400,
          message: errorString
        };
        returnWithCallback(returnUrl, reject, form);
      });
  });
}

/**
 *  Gets the annotations for the package specified.
 *
 *  @packageName  {string} Name of the package whose annotations are needed
 *
 *  @return - package annotations array
 *  eg: [
 *     {
 *       key: 'cloudant_url',
 *       value: 'https://some-cloudant-url'
 *     },
 *     {
 *       key: 'cloudant_auth_dbname',
 *       value: 'authdb'
 *     },
 *     {
 *       key: 'cloudant_auth_key',
 *       value: '123456'
 *     }
 *   ]
 */
function getPackageAnnotations(packageName) {
  return new Promise((resolve, reject) => {
    openwhisk().packages
      .get(packageName)
      .then(pkg => {
        resolve(pkg.annotations);
      })
      .catch(reject);
  });
}

/**
 *  Gets the package name from the action name that lives in it.
 *
 *  @actionName  {string} Full name of the action from which
 *               package name is to be extracted.
 *
 *  @return - package name
 *  eg: full action name = '/org_space/pkg/action' then,
 *      package name = 'pkg'
 */
function extractCurrentPackageName(actionName) {
  return actionName.split('/')[2];
}

/**
 *  Verifies that cloudant creds contain all the keys
 *  necessary for db operations.
 *
 *  @cloudantCreds - {JSON} Cloudant credentials JSON
 *  eg: {
 *       cloudant_url: 'https://some-cloudant-url.com',
 *       cloudant_auth_dbname: 'abc',
 *       cloudant_auth_key: '123'
 *     };
 */
function checkCloudantCredentials(cloudantCreds) {
  // Verify that all required Cloudant credentials are present.
  assert(
    cloudantCreds[CLOUDANT_URL],
    'cloudant_url absent in cloudant credentials.'
  );
  assert(
    cloudantCreds[CLOUDANT_AUTH_DBNAME],
    'cloudant_auth_dbname absent in cloudant credentials.'
  );
  assert(
    cloudantCreds[CLOUDANT_AUTH_KEY],
    'cloudant_auth_key absent in cloudant credentials.'
  );
}

/**
 *  Gets the cloudant credentials (saved as package annotations)
 *  from the current action's full name, derived from
 *  the env var "__OW_ACTION_NAME".
 *
 *  @return - cloudant credentials to use for db read/write operations.
 *  eg: {
 *       cloudant_url: 'https://some-cloudant-url.com',
 *       cloudant_auth_dbname: 'abc',
 *       cloudant_auth_key: '123'
 *     };
 */
function getCloudantCreds() {
  return new Promise((resolve, reject) => {
    // Get annotations of the current package.
    const packageName = extractCurrentPackageName(process.env.__OW_ACTION_NAME);
    getPackageAnnotations(packageName)
      .then(annotations => {
        // Construct a Cloudant creds json obj
        const cloudantCreds = {};
        annotations.forEach(annotation => {
          cloudantCreds[annotation.key] = annotation.value;
        });
        checkCloudantCredentials(cloudantCreds);
        resolve(cloudantCreds);
      })
      .catch(reject);
  });
}

/**
 * Creates the Cloudant object using the Cloudant url specified
 *
 *  @cloudantUrl - {string} Cloudant url linked to the
 *                 user's Cloudant instance.
 *
 * @return Cloudant object or, rejects with the exception from Cloudant
 */
function createCloudantObj(cloudantUrl) {
  return new Promise((resolve, reject) => {
    try {
      const cloudant = Cloudant({
        url: cloudantUrl,
        plugin: 'retry',
        retryAttempts: 5,
        retryTimeout: 1000
      });
      resolve(cloudant);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves the doc from the Cloudant db using the key provided.
 *
 *  @db - {Object} Cloudant db object
 *  @key - {string} key to use for retrieving doc
 *
 *  @return doc or, rejects with an exception from Cloudant
 */
function retrieveDoc(db, key) {
  return new Promise((resolve, reject) => {
    db.get(
      key,
      {
        // We need to add revision ids to prevent Cloudant update conflicts during writes
        revs_info: true
      },
      (error, response) => {
        if (error) {
          if (error.statusCode === 404) {
            // missing doc when it's a first time deployment.
            resolve({});
          }
          reject(error);
        }
        resolve(response);
      }
    );
  });
}

/**
 *  Loads the auth info from the Cloudant auth db
 *  using supplied Cloudant credentials.
 *
 *  @cloudantCreds - {JSON} Cloudant credentials JSON
 *
 *  @return auth information loaded from Cloudant
 *  eg:
 *   {
 *     "conversation": {
 *       "password": "xxxxxx",
 *       "username": "xxxxxx",
 *       "workspace_id": "xxxxxx"
 *     },
 *     "facebook": {
 *       "app_secret": "xxxxxx",
 *       "page_access_token": "xxxxxx",
 *       "verification_token": "xxxxxx"
 *     },
 *     "slack": {
 *       "client_id": "xxxxxx",
 *       "client_secret": "xxxxxx",
 *       "verification_token": "xxxxxx",
 *       "access_token": "xxxxxx",
 *       "bot_access_token": "xxxxxx"
 *     }
 *   }
 */
function loadAuth(cloudantCreds) {
  return new Promise((resolve, reject) => {
    const cloudantUrl = cloudantCreds[CLOUDANT_URL];
    const cloudantAuthDbName = cloudantCreds[CLOUDANT_AUTH_DBNAME];
    const cloudantAuthKey = cloudantCreds[CLOUDANT_AUTH_KEY];

    createCloudantObj(cloudantUrl)
      .then(cloudantObj => {
        return retrieveDoc(
          cloudantObj.use(cloudantAuthDbName),
          cloudantAuthKey
        );
      })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Inserts doc in the Cloudant db
 *
 *  @db - {Object} Cloudant db object
 *  @key - {string} Cloudant key for inserting doc
 *  @doc - {JSON} doc to insert
 *
 *  @return doc inserted or, throws an exception from Cloudant
 */
function insertDoc(db, key, doc) {
  return new Promise((resolve, reject) => {
    db.insert(doc, key, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 *  Saves the auth info in the Cloudant auth db
 *
 *  @params The parameters passed into the action
 *  @slackOAuthResult Resulting response body after Slack Oauth completes
 *
 *  @return auth information after storing in Cloudant
 */
function saveAuth(cloudantCreds, slackOAuth) {
  return new Promise((resolve, reject) => {
    const cloudantUrl = cloudantCreds[CLOUDANT_URL];
    const cloudantAuthDbName = cloudantCreds[CLOUDANT_AUTH_DBNAME];
    const cloudantAuthKey = cloudantCreds[CLOUDANT_AUTH_KEY];
    let db;

    createCloudantObj(cloudantUrl)
      .then(cloudantObj => {
        db = cloudantObj.use(cloudantAuthDbName);
        return retrieveDoc(db, cloudantAuthKey);
      })
      .then(oldAuth => {
        const newAuth = oldAuth;
        if (Object.keys(oldAuth).length === 0) {
          // No entry exists in the db for this key-might have been
          // deleted after loadAuth and before OAuth completed.
          // throw error.
          reject(`No auth db entry for key ${cloudantAuthKey}. Re-run setup.`);
        }
        newAuth._rev = oldAuth._rev;
        // Add the access tokens to Slack auth.
        const botId = slackOAuth.bot.bot_user_id;
        newAuth.slack.bot_users = newAuth.slack.bot_users || {};
        newAuth.slack.bot_users[botId] = {};
        newAuth.slack.bot_users[botId].access_token = slackOAuth.access_token;
        newAuth.slack.bot_users[
          botId
        ].bot_access_token = slackOAuth.bot.bot_access_token;

        return insertDoc(db, cloudantAuthKey, newAuth);
      })
      .then(resp => {
        resolve(resp);
      })
      .catch(reject);
  });
}

/**
 * Construct the OAuth access URL used to obtain the access tokens from the Slack server.
 *
 * @param  {JSON}   body - key values of query parameters needed in the url
 * @return {string}      - oauth access url
 */
function constructOAuthAccessUrl(body) {
  const requestUrl = 'https://slack.com/api/oauth.access';

  let queryString = '';
  const keys = Object.keys(body);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    queryString += `&${key}=${body[key]}`;
  }

  return `${requestUrl}?${queryString.slice(1)}`;
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
 * Convert the form paramters into query parameters, add them into the URL,
 *   and then resolving or reject the URL.
 *
 * @param  {string}   url      - URL to direct to (optional)
 * @param  {Function} callback - Promise resolve or reject
 * @param  {Object}   body     - form parameters to be converted to query parameters
 */
function returnWithCallback(url, callback, body) {
  const form = {
    headers: { 'Content-Type': 'text/html' },
    body: JSON.stringify(body)
  };

  if (url) {
    let formedUrl = url;
    const queryParams = [];
    Object.keys(body).forEach(key => {
      queryParams.push(`${key}=${body[key]}`);
    });
    formedUrl = `${formedUrl}?${queryParams.join('&')}`;
    form.body = `<html><script>window.location.href = "${formedUrl}";</script></html>`;
  }

  callback(form);
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
  // Required: Slack authentication code
  assert(params.code, 'No Slack authentication code provided.');
}

module.exports = {
  main,
  name: 'slack/deploy',
  validateParameters,
  validateResponseBody,
  saveAuth,
  loadAuth,
  createCloudantObj,
  getCloudantCreds,
  checkCloudantCredentials,
  retrieveDoc,
  insertDoc
};
