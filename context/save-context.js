const assert = require('assert');
const Cloudant = require('cloudant');
const omit = require('object.omit');

/**
 *  This action is used to save the most recent Conversation context to the Cloudant context db.
 *  @params Parameters passed by normalize-for-channel:
 *    {
 *      "cloudant_url": "XXXXX", //context package binding used for hitting Cloudant
        "dbname": "XXXXX", //context package binding specifies the context db name
        "raw_output_data": {
          "conversation": { //Conversation response forwarded over from normalize-for-slack.
            "entities": [],
            "context": {
              "conversation_id": "123abc",
              "system": {
                "branch_exited_reason": "completed",
                "dialog_request_counter": 1,
                "branch_exited": true,
                "dialog_turn_counter": 1,
                "dialog_stack": [
                  {
                    "dialog_node": "root"
                  }
                ],
                "_node_output_map": {
                  "Anything else": [
                    0
                  ]
                }
              }
            },
            "intents": [],
            "output": {
              "text": [
                "Ok. Turning on the lights."
              ],
              "nodes_visited": [
                "turn_on"
              ],
              "log_messages": []
            },
            "input": {
              "text": "Turn on the lights"
            }
          }
        }
        "raw_input_data": {
          "provider": "slack", //slack/facebook depending on the source
          "slack": {
            "bot_access_token": "xoxb-197154261526-xxxxxxxxx",
            "access_token": "xoxp-186464790945-187081019828-196275302867-9dxxxxxxxxxxxx",
            "team_id": "T5GDNP8TT",
            "event": {
              "channel": "D5RNZFSU9",
              "ts": "1497301239.449298",
              "text": "Turn on the lights",
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
 *  @return request payload with Cloudant-specific fields and context package bindings removed.
 */
function main(params) {
  return new Promise((resolve, reject) => {
    validateParams(params);

    let returnParams = params;
    const cloudantUrl = params.cloudant_url;
    const cloudantKey = params.raw_input_data.cloudant_key;
    const contextDb = params.dbname;

    const cloudant = getCloudantObj(cloudantUrl);
    const db = cloudant.use(contextDb);
    setContext(
      db,
      cloudantKey,
      params.raw_output_data.conversation.context
    )
      .then(() => {
        // must not flow further in the pipeline
        returnParams = omit(returnParams, ['cloudant_url', 'dbname']);
        validateResponseParams(returnParams);
        resolve(returnParams);
      })
      .catch(reject);
  });
}

/**
 * Saves the Conversation context in the Cloudant context db
 * @param Cloudant db object, Cloudant key, doc to save(this is the Convo context)
 * @return doc saved(Convo context)
 */
function setContext(db, key, doc) {
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
          // Either a real error or first time we are writing Context
          if (err.statusCode === 404) {
            // missing doc when it's a new user. Simply move on to saving the context.
            insertContextInDb(db, nkey, doc).then(resolve).catch(e => {
              // This is a real error from Cloudant
              // when inserting a new doc
              reject(e);
            });
          } else {
            reject(err);
          }
        } else {
          // This is a case of a pre-existing Context
          const updatedDoc = doc;
          updatedDoc._rev = body._rev;
          insertContextInDb(db, nkey, updatedDoc).then(resolve).catch(e => {
            // This is a real error from Cloudant
            // when overwriting context with the latest one from Convo
            reject(e);
          });
        }
      }
    );
  });
}

/**
 * Inserts context doc in the Cloudant context db
 * @param db object, context key, doc to insert
 * @return doc inserted or, throws an exception from Cloudant
 */
function insertContextInDb(db, key, doc) {
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
 * Replaces special characters in the Cloudant key name to prevent errors during db operations.
 */
function normalize(component) {
  return component.replace('%', '%%').replace('/', '%s'); // Note the ordering
}

/**
 * Verify the required params exist and are in the appropriate format
 * @param params
 */
function validateParams(params) {
  // Required: cloudant_url
  assert(
    params.cloudant_url,
    'Cloudant db url absent or not bound to the package.'
  );

  // Required: dbname
  assert(params.dbname, 'dbname absent or not bound to the package.');

  // Required: raw_input_data
  assert(params.raw_input_data, 'raw_input_data absent in params.');

  // Required: raw_input_data.cloudant_key
  assert(
    params.raw_input_data.cloudant_key,
    'cloudant_key absent in params.raw_input_data.'
  );

  // Required: raw_output_data
  assert(params.raw_output_data, 'raw_output_data absent in params.');

  // Required: raw_output_data.conversation
  assert(
    params.raw_output_data.conversation,
    'conversation object absent in params.raw_output_data.'
  );
}

/**
 *  Validates that we don't return any unwanted fields
 *
 *  @body The returning parameters
 */
function validateResponseParams(returnParams) {
  // cloudant_url must be absent in the response
  assert(!returnParams.cloudant_url, 'cloudant_url present in the response.');

  // dbname must be absent in the response
  assert(!returnParams.dbname, 'dbname present in the response.');
}

module.exports = {
  main,
  setContext,
  getCloudantObj,
  validateResponseParams
};
