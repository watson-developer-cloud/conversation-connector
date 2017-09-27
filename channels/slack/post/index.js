'use strict';

const assert = require('assert');
const request = require('request');
const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');

const mustUrlEncodeUrls = [
  'https://slack.com/api/chat.postMessage',
  'https://slack.com/api/chat.update',
  'https://slack.com/api/chat.postEphemeral'
];

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';

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

    const postParams = extractSlackParameters(params);

    getCloudantCreds()
      .then(cloudantCreds => {
        return loadAuth(cloudantCreds);
      })
      .then(auth => {
        return postSlack(useAuth(postParams, auth), postUrl);
      })
      .then(resolve)
      .catch(reject);
  });
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
        annotations.forEach(a => {
          cloudantCreds[a.key] = a.value;
        });
        checkCloudantCredentials(cloudantCreds);
        resolve(cloudantCreds);
      })
      .catch(reject);
  });
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
      .then(auth => {
        resolve(auth);
      })
      .catch(err => {
        reject(err);
      });
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
  assert(auth.slack.bot_access_token, 'bot_access_token absent in auth.');
  returnParams.token = auth.slack.bot_access_token;
  return returnParams;
}

module.exports = {
  main,
  name: 'slack/post',
  validateParameters,
  postSlack,
  loadAuth,
  createCloudantObj,
  getCloudantCreds,
  checkCloudantCredentials,
  retrieveDoc
};
