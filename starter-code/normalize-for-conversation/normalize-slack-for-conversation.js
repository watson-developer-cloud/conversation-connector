'use strict';

const assert = require('assert');
const Cloudant = require('cloudant');
const openwhisk = require('openwhisk');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';
/**
 * Converts Slack channel-formatted JSON data into Conversation SDK formatted JSON input.
 *
 * @param  {JSON} params - input parameters in Slack's event subscription format
 * @return {JSON}        - JSON data formatted as input for Conversation SDK
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);

    getCloudantCreds()
      .then(creds => {
        return loadAuth(creds);
      })
      .then(auth => {
        resolve({
          conversation: {
            input: {
              text: getSlackInputMessage(params)
            }
          },
          raw_input_data: {
            slack: params.slack,
            provider: 'slack',
            cloudant_context_key: generateCloudantKey(
              params,
              auth
            )
          }
        });
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
 * Gets and extracts the Slack input message from either a text or interactive message.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - Slack input message
 */
function getSlackInputMessage(params) {
  const slackEvent = params.slack.event;
  const slackEventMessage = slackEvent && slackEvent.message;

  const textMessage = slackEvent && (slackEvent.text || slackEventMessage.text);
  if (textMessage) {
    return textMessage;
  }

  const payloadAction = params.slack.payload &&
    JSON.parse(params.slack.payload) &&
    JSON.parse(params.slack.payload).actions &&
    JSON.parse(params.slack.payload).actions[0];
  const buttonMessage = payloadAction && payloadAction.value;
  if (buttonMessage) {
    return buttonMessage;
  }

  const menuMessage = payloadAction &&
    payloadAction.selected_options &&
    payloadAction.selected_options
      .reduce(
        (array, x) => {
          if (x.value) {
            return array.concat(x.value);
          }
          return array;
        },
        []
      )
      .join(' ');
  return menuMessage;
}

/**
 * Builds and returns a Cloudant database key from Slack input parameters.
 *
 * @param  {JSON} params - The parameters passed into the action
 * @return {string}      - cloudant database key
 */
function generateCloudantKey(params, auth) {
  assert(auth.conversation && auth.conversation.workspace_id, 'auth.conversation.workspace_id absent!');

  const slackEvent = params.slack.event;
  const slackPayload = params.slack.payload && JSON.parse(params.slack.payload);

  const slackTeamId = slackPayload
    ? slackPayload.team && slackPayload.team.id
    : params.slack.team_id;
  const slackUserId = slackPayload
    ? slackPayload.user && slackPayload.user.id
    : slackEvent &&
        (slackEvent.user || (slackEvent.message && slackEvent.message.user));
  const slackChannelId = slackPayload
    ? slackPayload.channel && slackPayload.channel.id
    : slackEvent && slackEvent.channel;
  const slackWorkspaceId = auth.conversation.workspace_id;

  return `slack_${slackTeamId}_${slackWorkspaceId}_${slackUserId}_${slackChannelId}`;
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: channel provider must be slack
  assert(params.provider, "Provider not supplied or isn't Slack.");
  assert.equal(
    params.provider,
    'slack',
    "Provider not supplied or isn't Slack."
  );

  // Required: JSON data for the channel provider
  assert(params.slack, 'Slack JSON data is missing.');

  // Required: either the Slack event subscription (text message)
  //  or the callback ID (interactive message)
  const messageType = params.slack.type ||
    (params.slack.payload &&
      JSON.parse(params.slack.payload) &&
      JSON.parse(params.slack.payload).callback_id);
  assert(messageType, 'No Slack message type specified.');

  const slackPayload = params.slack.payload && JSON.parse(params.slack.payload);

  // Required: Slack team ID
  const slackTeamId = params.slack.team_id ||
    (slackPayload.team && slackPayload.team.id);
  assert(slackTeamId, 'Slack team ID not found.');

  const slackEvent = params.slack.event;
  const slackEventMessage = slackEvent && slackEvent.message;

  // Required: Slack user ID
  const slackUserId = slackEvent
    ? slackEvent.user || slackEventMessage.user
    : slackPayload && slackPayload.user && slackPayload.user.id;
  assert(slackUserId, 'Slack user ID not found.');

  // Required: Slack channel
  const slackChannel = slackEvent
    ? slackEvent.channel
    : slackPayload && slackPayload.channel && slackPayload.channel.id;
  assert(slackChannel, 'Slack channel not found.');

  // Required: Slack message
  let slackMessage = slackEvent && (slackEvent.text || slackEventMessage.text);
  if (!slackMessage) {
    const payloadAction = slackPayload &&
      slackPayload.actions &&
      slackPayload.actions[0];

    slackMessage = payloadAction &&
      (payloadAction.value ||
        (payloadAction.selected_options &&
          payloadAction.selected_options[0] &&
          payloadAction.selected_options[0].value));
  }
  assert(slackMessage, 'No Slack message text provided.');
}

module.exports = {
  main,
  name: 'starter-code/normalize-slack-for-conversation',
  validateParameters,
  loadAuth,
  createCloudantObj,
  getCloudantCreds,
  checkCloudantCredentials,
  retrieveDoc
};
