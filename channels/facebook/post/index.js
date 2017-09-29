'use strict';

const assert = require('assert');
const request = require('request');
const Cloudant = require('cloudant');
const omit = require('object.omit');
const openwhisk = require('openwhisk');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';
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

    const facebookParams = extractFacebookParams(params);
    const postUrl = params.url || 'https://graph.facebook.com/v2.6/me/messages';

    getCloudantCreds()
      .then(cloudantCreds => {
        return loadAuth(cloudantCreds);
      })
      .then(auth => {
        assert(
          auth.facebook && auth.facebook.page_access_token,
          'auth.facebook.page_access_token not found.'
        );
        return postFacebook(
          facebookParams,
          postUrl,
          auth.facebook.page_access_token
        );
      })
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
            // With openwhisk if we have to return a string/text, then we'd have to specify
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
}

module.exports = {
  main,
  name: 'facebook/post',
  postFacebook,
  validateParameters,
  loadAuth,
  createCloudantObj,
  getCloudantCreds,
  checkCloudantCredentials,
  retrieveDoc
};
