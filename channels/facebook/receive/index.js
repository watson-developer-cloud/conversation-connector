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

const crypto = require('crypto');
const openwhisk = require('openwhisk');
const assert = require('assert');
const Cloudant = require('cloudant');
const pick = require('object.pick');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';

/* BACKGROUND:
 * ------------- Assumption --------------------
 *   One workspace -> One App -> One Page/Bot
 * ---------------------------------------------
 *
 * It must be noted that the code assumes that at any point of time, the user can link a
 * single convervation workspace to a single facebook app and a user can subscribe to only
 * one page within the facebook app.
 *
 * Receive action is the WEBHOOK and facebook can essentially make POST and GET requests to it.
 * (i) When facebook tries to verify the webhook (URL verification event), then it makes
 * a GET request to it. Receive action in turn returns [hub.challenge] to facebook
 * (ii) If user sends a message on the messenger, then facebook makes a POST request to the
 * webhook in which case the receive action invokes a Cloud Functions action ( which essentially
 * posts the response from watson conversation bot to facebook messenger).
 *
 * Following diagram explains what we are trying to do in the code:
 *
 * Here's a Cloud Functions sequence (named  "sub_pipeline")  ----
 *   starter-code/normalize-facebook-for-conversation -> context/load-context ->
 *   starter-code/pre-conversation -> conversation/call-conversation ->
 *   starter-code/normalize-conversation-for-facebook -> starter-code/post-conversation ->
 *   context/save-context -> facebook/post
 *
 *                                                            M1
 * facebook/receive  -- PATH 1:    [if entries.length < 1] --------> sub_pipeline
 *                                    |                                       N1
 *                                    |                                      ----> sub_pipeline
 *                                    |                                     | N2
 *                      PATH 2:     [else] ---> facebook/batched-messages - -----> sub_pipeline
 *                                                                          | N3
 *                                                                           ----> sub_pipeline
 *
 * Let's say if entries = [M1], then PATH 1 is taken and if entries = [N1, N2, N3], then
 * PATH 2 is taken.
 * The idea is that if the payload coming from facebook contains more than 1 messages or
 * entries then receive action invokes batched-messages action which in turn invokes the
 * sub_pipeline. However, if there's just one entry then the receive action invokes the
 * sub_pipeline directly.
 */

/**
 * Receives a either a url-verification-type message or a regular page request from Facebook
 *   and returns the appropriate response depending on the type of event that is detected.
 *
 * @param  {JSON} params - Facebook Callback API parameters as outlined by
 *                       https://developers.facebook.com/docs/graph-api/webhooks#callback
 * @return {Promise} - Result of the Facebook callback API
 */

function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (e) {
      reject(e.message);
    }

    return getCloudantCreds()
      .then(cloudantCreds => {
        return loadAuth(cloudantCreds);
      })
      .then(auth => {
        // url verification takes place during facebook's webhook setup phase i.e. facebook makes
        // a GET request to the provided webhook endpoint and expects a challenge value in return.
        // This action simply passes the challenge passed by facebook during verification
        if (isURLVerificationEvent(params, auth)) {
          // Challege value is returned
          return { text: params['hub.challenge'] };

          // When a request is coming from a facebook page, then facebook makes a POST request to
          // the provided webhook endpoint (which is the receive action)
        } else if (isPageObject(params)) {
          // Every time facebook makes a POST request to the webhook endpoint, it sends along
          // x-hub-signature header which basically contains SHA1 key. In order to make sure, that
          // the request is coming from facebook, it is important to calculate the HMAC key using
          // app-secret and the request payload and compare it against the x-hub-signature header.
          try {
            verifyFacebookSignatureHeader(params, auth);
          } catch (e) {
            reject(e.message);
          }
          // Get the appropriate payload for action invocation i.e. depending on whether it's a
          // a batched message or not we construct the appropriate payload
          const [actionParams, actionName] = getPayloadForActionInvocation(
            params,
            auth
          );
          // Invoke appropriate Cloud Functions action
          return invokeAction(actionParams, actionName);
        }
        // Neither page nor verification type request is detected
        return reject({
          status: 400,
          text: 'Neither a page type request nor a verfication type request detected'
        });
      })
      .then(result => {
        resolve(result);
      })
      .catch(e => {
        reject(e);
      });
  });
}

/**
 * Get the appropriate payload for action invocation i.e. depending
 * on whether it's a batched message or not we construct the appropriate payload
 * @param {JSON} params Params coming into this action
 * @return actionParams, actionName
 */
function getPayloadForActionInvocation(params, auth) {
  let actionName;
  let actionParams;
  // Check if it's a batched message
  if (isBatchedMessage(params)) {
    // Set action params and action name for batched messages invocation
    actionParams = params;
    // Attach auth to params
    actionParams.auth = auth;
    actionName = params.batched_messages;
  } else {
    // Set action params and action name for subpipeline invocation
    actionParams = {
      facebook: params.entry[0].messaging[0],
      provider: 'facebook',
      auth
    };

    actionName = params.sub_pipeline;
  }
  // Return action params and action name for the action that is to be invoked
  return [actionParams, actionName];
}

/**
 * Function invokes a Cloud Functions action
 * @param {JSON} actionParams Parameters required to invoke an action
 * @param {JSON} actionName Name of the action
 */
function invokeAction(actionParams, actionName) {
  const ow = openwhisk();
  return new Promise((resolve, reject) => {
    ow.actions
      .invoke({
        name: actionName,
        params: actionParams
      })
      .then(result => {
        // Everytime facebook pings the "receive" endpoint/webhook, it expects a
        // "200" string/text response in return. In Cloud Functions, if we'd want to return
        // a string response, then it's necessary that we add a field "text" and the
        // response "200" as the value. The field "text" tells Cloud Functions that this
        // endpoint must return a "text" response.
        // Response code 200 only tells us that receive was able to execute it's code
        // successfully but it doesn't really tell us if the sub-pipeline or the
        // batched-messages pipeline that are invoked as a part of it returned a successful
        // response or not. Hence, we return the activation id of the appropriate action so
        // that the user can retrieve it's details for debugging purposes.
        resolve({
          text: 200,
          activationId: result.activationId,
          actionName,
          message: `Response code 200 above only tells you that receive action was invoked successfully. However, it does not really say if ${actionName} was invoked successfully. Please use ${result.activationId} to get more details about this invocation.`
        });
      })
      .catch(() => {
        reject({
          text: 400,
          actionName,
          message: `There was an issue invoking ${actionName}. Please make sure this action exists in your namespace`
        });
      });
  });
}

/** Checks if it's a URL verification event
 *
 * @param  {JSON} params - Parameters passed into the action
 * @return {boolean} - true or false
 */
function isURLVerificationEvent(params, auth) {
  if (
    params['hub.mode'] !== 'subscribe' ||
    params['hub.verify_token'] !== auth.facebook.verification_token
  ) {
    return false;
  }
  return true;
}

/** Checks if object is of type page
 *
 * @param  {JSON} params - Parameters passed into the action
 * @return {boolean} - true or false
 */
function isPageObject(params) {
  if (!(params.object === 'page')) {
    return false;
  }
  return true;
}

/**
 * Checks if it's a batched messages i.e. contains more than one
 * message entry
 * @param {*} params
 */
function isBatchedMessage(params) {
  if (params.entry.length > 1 || params.entry[0].messaging.length > 1) {
    return true;
  }
  return false;
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Subpipeline name
  assert(
    params.sub_pipeline,
    "Subpipeline name does not exist. Please make sure your Cloud Functions channel package has the binding 'sub_pipeline'"
  );
  // Required: Batched Message Action name
  assert(
    params.batched_messages,
    "Batched Messages action name does not exist. Please make sure your Cloud Functions channel package has the binding 'batched_messages'"
  );
}

/** Checks if the HMAC key calculated using app secret and request payload is the
 * same as the key present in x-hub-signature header. For more information, refer to
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference#security
 *
 * @param  {JSON} params - Parameters passed into the action
 */
function verifyFacebookSignatureHeader(params, auth) {
  assert(
    params.__ow_headers['x-hub-signature'],
    'x-hub-signature header not found.'
  );
  const xHubSignature = params.__ow_headers['x-hub-signature'];
  const appSecret = auth.facebook.app_secret;

  // Construct the request payload. For more information, refer to
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference#format
  const requestPayload = pick(params, ['object', 'entry']);
  const buffer = new Buffer(escapeSpecialChars(JSON.stringify(requestPayload)));

  // Get the expected hash from the key i.e. if the key is sha1=1234
  // then remove the algorithm (sha1=) to get the hash.
  const expectedHash = xHubSignature.split('=')[1];

  // Compute the hash using the app secret and the request payload
  const calculatedHash = crypto
    .createHmac('sha1', appSecret)
    .update(buffer, 'utf-8')
    .digest('hex');

  assert.equal(
    calculatedHash,
    expectedHash,
    'Verfication of facebook signature header failed. Please make sure you are passing the correct app secret'
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

/**
 *  Escape unicode version of the payload, with lower case hex digits.
 *  Also escapes / to \/, < to \u003c, % to \u0025 and @ to \u0040. For more information, refer to
 *  https://developers.facebook.com/docs/messenger-platform/webhook-reference#security
 *
 *  @payload  {string} The payload to be escaped.
 *
 *  @return - the escaped payload
 *  eg: payload = 'Aäöåc' then,
 *      escaped payload = 'A\u00e4\u00f6\u00e5c'
 */
function escapeSpecialChars(payload) {
  return payload.replace(/[\s\S]/g, escape => {
    // Escapes % @ and other special chars
    if (
      escape.charCodeAt() === 37 ||
      escape.charCodeAt() === 64 ||
      escape.charCodeAt() >= 160
    ) {
      return '\\u' + ('0000' + escape.charCodeAt().toString(16)).slice(-4); // eslint-disable-line prefer-template
    } else if (escape.charCodeAt() === 60) {
      // Oddly Facebook uses upper case for <
      return '\\u003C';
    } else if (escape.charCodeAt() === 47) {
      // Escapes / to \/
      return '\\/';
    }
    return escape;
  });
}

module.exports = {
  main,
  name: 'facebook/receive',
  isURLVerificationEvent,
  verifyFacebookSignatureHeader,
  loadAuth,
  getCloudantCreds,
  checkCloudantCredentials,
  createCloudantObj,
  retrieveDoc,
  escapeSpecialChars
};
