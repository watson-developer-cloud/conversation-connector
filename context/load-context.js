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
const Cloudant = require('cloudant');
const omit = require('object.omit');
const openwhisk = require('openwhisk');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_CONTEXT_DBNAME = 'cloudant_context_dbname';
const CLOUDANT_CONTEXT_KEY = 'cloudant_context_key';

/**
 *  This action is used to read the most recent Conversation context from the Cloudant context db.
 *  @params Parameters passed by normalize-for-conversation:
 *    {
        "conversation": { //sent by normalize action
          "input": {
            "text": "Turn on lights"
          }
        },
        "raw_input_data": {
          "provider": "slack", //slack/facebook depending on the source
          "slack": {
            "bot_access_token": "xoxb-197154261526-xxxxxxxxx",
            "access_token": "xoxp-186464790945-187081019828-196275302867-9dxxxxxxxxxxxx",
            "team_id": "T5GDNP8TT",
            "event": {
              "channel": "D5RNZFSU9",
              "ts": "1497301239.449298",
              "text": "abcd",
              "event_ts": "1497301239.449298",
              "type": "message",
              "user": "U5H2D0KQC"
            },
            "api_app_id": "A5SCQP3GX",
            "authed_users": [
              "U5T4J7PFG"
            ],
            "bot_user_id": "U5T4J7PFG",
            "event_time": 1497301239,
            "token": "BIgkhBpaTkVc6Oul9lB3PvOJ",
            "type": "event_callback",
            "event_id": "Ev5RT8P21E"
          },
        // specifies the doc key for read/writes to Cloudant context db.
        // the key is generated in the "starter-code/normalize-channel-for-conversation" action
        // using the raw_input_data fields and the conversation workspace_id
          "cloudant_context_key": "slack_T5GDNP8TT_1aff54e47_U5H2D0KQC_D5RNZFSU9"
        }
 *    }
 *
 *  @return request payload with Conversation context added.
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParams(params);
    const returnParams = params;

    getCloudantCreds()
      .then(cloudantCreds => {
        const cloudantUrl = cloudantCreds[CLOUDANT_URL];
        const cloudantContextDbName = cloudantCreds[CLOUDANT_CONTEXT_DBNAME];
        const cloudantContextKey = params.raw_input_data[CLOUDANT_CONTEXT_KEY];

        const db = createCloudantObj(cloudantUrl).use(cloudantContextDbName);
        return getContext(db, cloudantContextKey);
      })
      .then(context => {
        returnParams.conversation.context = context;
        resolve(returnParams);
      })
      .catch(reject);
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
        resolve(cloudantCreds);
      })
      .catch(reject);
  });
}

/**
 * Reads the most recent Conversation context from the Cloudant context db for the user
 * @db - {Object} Cloudant db object
 * @key - {string} Cloudant key(uniquely identifies the conversation)
 *
 * @return context retrieved
 */
function getContext(db, key) {
  const nkey = normalize(key);
  return new Promise((resolve, reject) => {
    db.get(
      nkey,
      {
        // We need to add revision ids to prevent Cloudant update conflicts during writes
        revs_info: true
      },
      (err, body) => {
        if (err) {
          if (err.statusCode === 404) {
            // 404 means there's no doc for this cloudant_key.
            // This happens when a new user starts chatting with the bot.
            // simply return empty context.
            resolve({});
          }
          reject(err);
        } else {
          resolve(deleteCloudantFields(body));
        }
      }
    );
  });
}

/**
 * Replaces special characters in the Cloudant key name to prevent errors during db operations.
 */
function normalize(component) {
  return component.replace('%', '%%').replace('/', '%s'); // Note the ordering
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
  try {
    const cloudant = Cloudant({
      url: cloudantUrl,
      plugin: 'retry',
      retryAttempts: 5,
      retryTimeout: 1000
    });
    return cloudant;
  } catch (err) {
    return Promise.reject(
      `Cloudant object creation failed. Error from Cloudant: ${err}.`
    );
  }
}

/**
 * Verify the required params exist and are in the appropriate format
 * @param params
 */
function validateParams(params) {
  // Required: raw_input_data
  assert(params.raw_input_data, 'params.raw_input_data absent in params.');

  // Required: raw_input_data.cloudant_key
  assert(
    params.raw_input_data[CLOUDANT_CONTEXT_KEY],
    `${CLOUDANT_CONTEXT_KEY} absent in params.raw_input_data.`
  );

  // Required: conversation
  assert(params.conversation, 'conversation object absent in params.');
}

/**
 * Deletes context-related info from response
 * @param response from Cloudant
 * @return cleaned response
 */
function deleteCloudantFields(response) {
  // Delete Cloudant-specific fields which were added to db entries.
  return omit(response, ['_id', '_rev', '_revs_info']);
}

module.exports = {
  main,
  validateParams,
  getContext,
  getCloudantCreds,
  createCloudantObj,
  deleteCloudantFields
};
