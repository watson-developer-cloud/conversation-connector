const Cloudant = require('cloudant');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';

/**
 * The following are passed as invocation params to this action:
 *
 *  @params - {JSON} -p pipeline $pipeline -p cloudant_url $CLOUDANT_URL
 *   -p cloudant_auth_dbname $CLOUDANT_AUTH_DBNAME -p cloudant_auth_key $CLOUDANT_AUTH_KEY
 *   -p setup_mode $MODE
 *
 * @return auth saved in Cloudant
 */
function main(params) {
  return new Promise((resolve, reject) => {
    saveAuth(params)
      .then(resp => {
        resolve(resp);
      })
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
    } catch (err) {
      reject(err);
    }
  });
}

/**
 *  Saves the initial channel auth and conversation info in
 *  the Cloudant auth db.
 *
 *  @db - {JSON} parameters into the action containing
 *        Cloudant credentials and auth info to store.
 *
 *  @return auth information after storing in Cloudant
 */
function saveAuth(params) {
  return new Promise((resolve, reject) => {
    const pipeline = params.pipeline;
    const cloudantUrl = params[CLOUDANT_URL];
    const cloudantAuthDbName = params[CLOUDANT_AUTH_DBNAME];
    const cloudantAuthKey = params[CLOUDANT_AUTH_KEY];
    let db;

    createCloudantObj(cloudantUrl)
      .then(cloudantObj => {
        db = cloudantObj.use(cloudantAuthDbName);
        return retrieveDoc(db, cloudantAuthKey);
      })
      .then(oldAuth => {
        const newAuth = oldAuth;
        if (Object.keys(oldAuth).length > 0) {
          // If a deployment was previously done for the same key
          // ->not relevant for UUIDs but a sanity check.
          newAuth._rev = oldAuth._rev;
        }

        // Save Conversation info from pipeline object.
        newAuth.conversation = pipeline.conversation;

        if (params.setup_mode === 'test') {
          // Save all channels info from pipeline Object. Needed for test suite.
          Object.keys(pipeline.channel).forEach(key => {
            if (key === 'name') {
              return; // Don't need to save the name in the db.
            }
            newAuth[key] = pipeline.channel[key];
          });
        } else {
          // Save only deployment Channel info(based on name) from pipeline object.
          newAuth[pipeline.channel.name] =
            pipeline.channel[pipeline.channel.name];
        }
        return insertDoc(db, cloudantAuthKey, newAuth);
      })
      .then(resp => {
        resolve(resp);
      })
      .catch(reject);
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
 * Inserts doc in the Cloudant db
 *
 * @param db object, key, doc to insert
 *
 * @return doc inserted or, throws an exception from Cloudant
 */
function insertDoc(db, key, doc) {
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

module.exports = {
  main,
  name: 'init-auth',
  createCloudantObj,
  insertDoc,
  retrieveDoc,
  saveAuth
};
