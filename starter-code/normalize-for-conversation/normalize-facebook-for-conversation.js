'use strict';

const assert = require('assert');

const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';

/**
 * Converts facebook channel-formatted JSON data into Conversation SDK formatted JSON input.
 *
 * @param  {JSON} params - Each individual messaging entry/event
 * {
      "sender": { "id": "1637923046xxxxxx" },
      "recipient": { "id": "268440730xxxxxx" },
      "timestamp": 1501786719609,
      "message": {
        "mid": "mid.$cAACu1giyQ85j2rwNfVdqxxxxxxxx",
        "seq": 3054,
        "text": "find a restaurant"
      }
    }
 * @return {JSON} - JSON data formatted as input for Conversation SDK
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParameters(params);
    let authData;

    getCloudantCreds()
      .then(creds => {
        return loadAuth(creds);
      })
      .then(auth => {
        authData = auth;
        return getTextFromPayload(params);
      })
      .then(result => {
        const conversationJson = {
          conversation: {
            input: {
              text: result
            }
          },
          raw_input_data: {
            facebook: params.facebook,
            provider: 'facebook',
            // This cloudant_key lives till context/saveContext so the action can perform
            // operations in the Cloudant db.
            // Other channels must add a similar parameter
            // which uniquely identifies a conversation for a user.
            cloudant_context_key: generateCloudantKey(params, authData)
          }
        };
        resolve(conversationJson);
      })
      .catch(reject);
  });
}

/**
 * Function checks for regular text message or a postback event payload
 * and sends it to watson conversation
 * @param {JSON} params - Params coming into the action
 * @return {JSON} - Text that is to be sent to conversation
 */
function getTextFromPayload(params) {
  return new Promise((resolve, reject) => {
    // 1. Message Type Event
    // Extract text from message event to send it to Conversation
    const messageEventPayload = params.facebook.message &&
      params.facebook.message.text;

    // 2. Postback type event. Usually detected on button clicks
    // Extract text (postback payload) from postback event to send it to Conversation
    const postbackEventPayload = params.facebook.postback &&
      params.facebook.postback.payload;

    /**
     * You can add code to handle other facebook events HERE
     */

    if (messageEventPayload) {
      resolve(messageEventPayload);
    } else if (postbackEventPayload) {
      resolve(postbackEventPayload);
    } else {
      reject(
        'Neither message.text event detected nor postback.payload event detected. Please add appropriate code to handle a different facebook event.'
      );
    }
  });
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: the provider must be known and supplied
  assert(params.provider, "Provider not supplied or isn't Facebook.");
  // Required: JSON data for the channel provider must be supplied
  assert(params.facebook, 'Facebook JSON data is missing.');
}

/**
 * Builds and returns a Cloudant database key from Facebook input parameters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - cloudant database key
 */
function generateCloudantKey(params, auth) {
  const fbSenderId = params.facebook &&
    params.facebook.sender &&
    params.facebook.sender.id;
  const fbWorkspaceId = auth.conversation.workspace_id;
  const fbRecipientId = params.facebook &&
    params.facebook.recipient &&
    params.facebook.recipient.id;

  return `facebook_${fbSenderId}_${fbWorkspaceId}_${fbRecipientId}`;
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

module.exports = {
  main,
  name: 'starter-code/normalize-facebook-for-conversation',
  validateParameters,
  loadAuth,
  createCloudantObj,
  getCloudantCreds,
  checkCloudantCredentials,
  retrieveDoc
};
