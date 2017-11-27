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
const Cloudant = require('cloudant');
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
    try {
      validateParameters(params);
    } catch (error) {
      reject(error);
    }

    let cloudantCreds;

    // IGNORE/REJECT THESE OBJECTS OUTRIGHT
    if (isUrlVerification(params)) {
      const challenge = params.challenge || '';
      reject({
        code: 200,
        challenge
      });
    }
    if (isBotMessage(params)) {
      reject({ bot_id: isBotMessage(params) });
    }
    if (isDuplicateMessage(params)) {
      reject(params);
    }

    const ow = openwhisk();
    // the __OW_ACTION_NAME environment vairable is the name of this resource
    //  and is of the format: /org_space/deploymentName_package/action ;
    //  so  split('/') would return ['', 'org_space', 'deploymentName_package', 'action']
    //      split('/')[2].split('_') would return ['deploymentName', 'package']
    //  and split('/')[2].split('_')[0] returns the deploymentName
    const deploymentName = process.env.__OW_ACTION_NAME
      .split('/')[2]
      .split('_')[0];

    getCloudantCreds()
      .then(credentials => {
        cloudantCreds = credentials;
        return loadAuth(cloudantCreds);
      })
      .then(auth => {
        try {
          verifyUserIdentity(params, auth);
        } catch (error) {
          throw error;
        }

        // FILTER BY CHANNEL, GROUP, OR DIRECTED MESSAGE
        if (isDirectMessage(params)) {
          const slackParams = extractSlackParameters(params, auth);

          ow.actions.invoke({
            name: deploymentName,
            blocking: false,
            result: false,
            params: slackParams,
            namespace: process.env.__OW_NAMESPACE
          });

          const originalMessage = params.payload &&
            JSON.parse(params.payload) &&
            JSON.parse(params.payload).original_message;
          if (originalMessage) {
            resolve(originalMessage);
          } else {
            resolve(slackParams);
          }
        } else {
          const modifiedParams = modifyIncomingMessage(params, auth);
          // null modified params means the message wasn't directed to this bot
          if (modifiedParams) {
            const slackParams = extractSlackParameters(modifiedParams, auth);

            ow.actions.invoke({
              name: deploymentName,
              blocking: false,
              result: false,
              params: slackParams,
              namespace: process.env.__OW_NAMESPACE
            });

            const originalMessage = params.payload &&
              JSON.parse(params.payload) &&
              JSON.parse(params.payload).original_message;
            if (originalMessage) {
              resolve(originalMessage);
            } else {
              resolve(slackParams);
            }
          } else {
            reject(extractSlackParameters(params, auth));
          }
        }
      })
      .catch(error => {
        reject({
          code: 400,
          error
        });
      });
  });
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
  const event = params.event;
  const botId = (event && event.bot_id) ||
    (event && event.message && event.message.bot_id);
  return botId;
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
 * Returns true if the message is coming from a direct message channel
 *  and false if the message is coming from a group channel.
 *
 * @param  {JSON}  params - Parameters passed into the action
 * @return {Boolean}      - true if is a direct message
 */
function isDirectMessage(params) {
  const event = params.event;
  const payload = params.payload && JSON.parse(params.payload);
  const channel = (event && event.channel) ||
    (payload && payload.channel && payload.channel.id);

  assert(channel, 'No channel provided by server.');

  return channel.charAt(0) === 'D';
}

/**
 * Returns the bot id of the message or null if not found
 *
 * @param  {string[]} authedUsers - list of authorized bot users
 * @param  {JSON} auth            - auth document
 * @return {string}               - bot id
 */
function getBotIdFromAuthedUsers(authedUsers, auth) {
  if (!authedUsers) {
    return null;
  }

  // NOTE: only the first authorized bot recognized by the auth document is
  //  configured to respond in the deployment pipeline
  for (let i = 0; i < authedUsers.length; i += 1) {
    if (auth.slack.bot_users[authedUsers[i]]) {
      return authedUsers[i];
    }
  }
  return null;
}

function modifyIncomingMessage(params, auth) {
  // payload messages are messages sent by bot
  //  and therefore do not have @tags
  if (params.payload) {
    return params;
  }

  let message = params.event.text;
  const botUser = getBotIdFromAuthedUsers(params.authed_users, auth);

  const searchRegex = `<@${botUser}>`;
  const searchIndex = message.search(searchRegex);

  if (searchIndex >= 0) {
    message = message.substring(0, searchIndex) +
      message.substring(searchIndex + 12);

    const slackParams = params;
    slackParams.event.text = message;

    return slackParams;
  }

  return null;
}

/**
 * Extracts and converts the input parametrs to only parameters that were passed by Slack.
 *
 * @param  {JSON} params - Parameters passed into the action,
 *                       including Slack parameters and package bindings
 * @return {JSON} - JSON containing all and only Slack parameters
 *                    and indicators that the JSON is coming from Slack channel package
 */
function extractSlackParameters(params, auth) {
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

  // add bot user id to root
  const botId = getBotIdFromAuthedUsers(params.authed_users, auth) ||
    (params.payload &&
      JSON.parse(params.payload) &&
      JSON.parse(params.payload).original_message &&
      JSON.parse(params.payload).original_message.user);

  return {
    slack: slackParams,
    provider: 'slack',
    bot_id: botId,
    auth
  };
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
    // Get annotations of the current package
    const packageName = extractCurrentPackageName(process.env.__OW_ACTION_NAME);

    getPackageAnnotations(packageName)
      .then(annotations => {
        // Construct a Cloudant creds json object
        const cloudantCreds = {};
        annotations.forEach(annotation => {
          cloudantCreds[annotation.key] = annotation.value;
        });
        checkCloudantCredentials(cloudantCreds);
        resolve(cloudantCreds);
      })
      .catch(reject);
  });

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
      .then(cloudant => {
        return retrieveDoc(cloudant.use(cloudantAuthDbName), cloudantAuthKey);
      })
      .then(resolve)
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
    } catch (error) {
      reject(error);
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
      // We need to add revision ids to prevent Cloudant update conflicts during writes
      { revs_info: true },
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

  const verificationTokenStored = auth.slack && auth.slack.verification_token;

  assert(verificationTokenStored, 'Verification token not known.');
  assert.equal(
    verificationTokenStored,
    verificationTokenProvided,
    'Verification token is incorrect.'
  );
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

module.exports = {
  name: 'slack/receive',
  main,
  isUrlVerification,
  isBotMessage,
  isDuplicateMessage,
  isDirectMessage,
  getBotIdFromAuthedUsers,
  modifyIncomingMessage,
  extractSlackParameters,
  getCloudantCreds,
  loadAuth,
  createCloudantObj,
  retrieveDoc,
  verifyUserIdentity,
  validateParameters
};
