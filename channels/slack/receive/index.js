'use strict';

const Cloudant = require('cloudant');
const assert = require('assert');
const openwhisk = require('openwhisk');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';
/**
 * Receives a subscription message from Slack
 *   and returns the appropriate information depending of subscription event received.
 *
 * @param  {JSON} params - Slack Events API parameters as outlined by
 *                       https://api.slack.com/events-api
 * @return {Promise} - Result of the Slack subscription event specified by Slack API
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParameters(params);
    let cloudantCreds;

    if (isBotMessage(params)) {
      reject({ bot_id: isBotMessage(params) });
    }
    if (isUrlVerification(params)) {
      const challenge = params.challenge || '';
      reject({
        code: 200,
        challenge
      });
    }

    getCloudantCreds()
      .then(creds => {
        cloudantCreds = creds;
        return loadAuth(cloudantCreds);
      })
      .then(auth => {
        verifyUserIdentity(params, auth); // Verify the user's identity.

        if (isDuplicateMessage(params)) {
          reject(extractSlackParameters(params));
        } else {
          resolve(extractSlackParameters(params));
        }
      })
      .catch(err => {
        reject({
          code: 401,
          err
        });
      });
  });
}

/**
 * Extracts and converts the input parametrs to only parameters that were passed by Slack.
 *
 * @param  {JSON} params - Parameters passed into the action,
 *                       including Slack parameters and package bindings
 * @return {JSON} - JSON containing all and only Slack parameters
 *                    and indicators that the JSON is coming from Slack channel package
 */
function extractSlackParameters(params) {
  const noIncludeKeys = [
    '__ow_headers',
    '__ow_method',
    '__ow_path',
    '__ow_verb'
  ];

  const slackParams = {};
  Object.keys(params).forEach(key => {
    if (noIncludeKeys.indexOf(key) < 0) {
      slackParams[key] = params[key];
    }
  });

  return {
    slack: slackParams,
    provider: 'slack'
  };
}

/**
 * Returns true if the message received was a duplicate/retry message.
 *
 * @param  {JSON}  params - Parameters passed into the action
 * @return {Boolean}      - true only if a duplicate message was detected
 */
function isDuplicateMessage(params) {
  return params.__ow_headers &&
    params.__ow_headers['x-slack-retry-reason'] &&
    params.__ow_headers['x-slack-retry-num'] &&
    params.__ow_headers['x-slack-retry-reason'] === 'http_timeout' &&
    params.__ow_headers['x-slack-retry-num'] > 0;
}

/**
 * Returns true if the message was a challenge request.
 *
 * @param  {JSON}  params - Parameters passed into the action
 * @return {Boolean}      - true only is the message is a challenge message
 */
function isUrlVerification(params) {
  return params.type && params.type === 'url_verification';
}

/**
 * Returns true if the message was sent from a bot instead of a human.
 *
 * @param  {JSON}  params - Parameters passed into the action
 * @return {Boolean}      - true only if the message was from a bot
 */
function isBotMessage(params) {
  const slackEvent = params.event;
  const botId = (slackEvent && slackEvent.bot_id) ||
    (slackEvent && slackEvent.message && slackEvent.message.bot_id);
  return botId;
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  const token = params.token ||
    (params.payload &&
      JSON.parse(params.payload) &&
      JSON.parse(params.payload).token);
  assert(token, 'Verification token is absent.');
}

/**
 *  Uses the loaded auth info to match known
 *  verification token against the provided verification_token.
 *
 *  @params - {JSON} Slack params to be updated with the auth token
 *  @auth - {JSON} loaded auth data
 *
 *  @return updated Slack params containing the token required for posting
 */
function verifyUserIdentity(params, auth) {
  const verificationTokenProvided = params.token ||
    (params.payload &&
      JSON.parse(params.payload) &&
      JSON.parse(params.payload).token);

  const verificationTokenStored = auth.slack.verification_token;

  assert(verificationTokenStored, 'Verification token not known');
  assert.equal(
    verificationTokenStored,
    verificationTokenProvided,
    'Verification token is incorrect.'
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

module.exports = {
  main,
  name: 'slack/receive',
  validateParameters,
  loadAuth,
  createCloudantObj,
  checkCloudantCredentials,
  getCloudantCreds,
  retrieveDoc
};
