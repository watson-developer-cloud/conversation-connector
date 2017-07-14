const Cloudant = require('cloudant');

/**
 *  This action is used to read the most recent Conversation context from the Cloudant context db.
 *  @params Parameters passed by normalize-for-conversation:
 *    {
 *      "cloudant_url": "XXXXX", //context package binding used for hitting Cloudant
        "dbname": "XXXXX", //context package binding specifies the context db name
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
        //cloudant_key(set by normalize-for-conversation)
        // specifies the doc key for read/writes to Cloudant context db.
          "cloudant_key": "slack_T5GDNP8TT_1aff54e4-caf5-4dff-93ec-502126146c87_U5H2D0KQC_D5RNZFSU9"
        }
 *    }
 *
 *  @return request payload with Convo context added.
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }
  const returnParams = params;
  const cloudantUrl = params.cloudant_url;
  const cloudantKey = params.raw_input_data.cloudant_key;
  const contextDb = params.dbname;
  const cloudant = getCloudantObj(cloudantUrl);

  const db = cloudant.use(contextDb);

  return getContext(db, cloudantKey).then(context => {
    returnParams.conversation.context = context;
    return returnParams;
  });
}

/**
 * Reads the most recent Conversation context from the Cloudant context db for the user
 * @param Cloudant db object, Cloudant key(uniquely identifies the conversation)
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
          const updatedBody = body;
          // Delete Cloudant-specific fields which were added to db entries.
          delete updatedBody.id;
          delete updatedBody.rev;
          delete updatedBody.revs_info;
          resolve(updatedBody);
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
 * @param Cloudant instance url
 * @return Cloudant object or, throws an exception from Cloudant
 */
function getCloudantObj(cloudantUrl) {
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
  if (!params.cloudant_url) {
    throw new Error(
      'Illegal Argument Exception: Cloudant db url absent or not bound to the package.'
    );
  }

  if (!params.dbname) {
    throw new Error(
      'Illegal Argument Exception: dbname absent or not bound to the package.'
    );
  }

  if (!params.raw_input_data || !params.raw_input_data.cloudant_key) {
    throw new Error(
      'Illegal Argument Exception: params.raw_input_data absent in params or cloudant_key absent in params.raw_input_data'
    );
  }

  if (!params.conversation) {
    throw new Error(
      'Illegal Argument Exception: conversation object absent in params.'
    );
  }
}

module.exports = {
  main,
  getContext,
  getCloudantObj
};
