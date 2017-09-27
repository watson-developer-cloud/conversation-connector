const crypto = require('crypto');
const openwhisk = require('openwhisk');
const assert = require('assert');
const Cloudant = require('cloudant');

const CLOUDANT_URL = 'cloudant_url';
const CLOUDANT_AUTH_DBNAME = 'cloudant_auth_dbname';
const CLOUDANT_AUTH_KEY = 'cloudant_auth_key';

/* BACKGROUND:
 *
 * ------------- Assumption --------------------
 *   One workspace -> One App -> One Page/Bot
 * ---------------------------------------------
 * It must be noted that the code assumes that at any point of time, the user can link a
 * single convervation workspace to a single facebook app and a user can subscribe to only
 * one page within the facebook app.
 *
 *
 * Receive action is the WEBHOOK and facebook can essentially make POST and GET requests to it.
 * (i) When facebook tries to verify the webhook (URL verification event), then it makes
 * a GET request to it. Receive action in turn returns the [hub.challenge] to facebook
 * (ii) If user sends a message on the messenger, then facebook makes a POST request to the
 * webhook in which case the receive action invokes the openwhisk pipeline ( which essentially
 * posts the response from conversation bot to facebook messenger).
 *
 * Here's the openwhisk pipeline (named  "facebook-flexible-pipeline")  ----
 *   normalize-facebook-for-conversation -> load-context -> pre-conversation -> call-conversation ->
 *   normalize-conversation-for-facebook -> post-conversation -> save-context -> post
 *
 *
 *                          (M1)
 *                         ------->facebook-flexible-pipeline
 *                        |
 *                        | (M2)
 * receive [M1, M2, M3] -- ------->facebook-flexible-pipeline
 *                        |
 *                        | (M3)
 *                         ------->facebook-flexible-pipeline
 *
 *
 *  Notice, for a every message in the array, we invoke "facebook-flexible-pipeline" so that
 *  each message type event can be handled individually.
 *
 *
 * IMPLEMENTATION DETAILS:
 *
 * At the time of heavy load, facebook tends to batch multiple incoming requests together
 * Say, a user has a facebook app A, and has linked page P1 to it. Also, users U1 and U2 are
 * chatting with page P1. Then in a worst case scenariao, we can have following type of messages
 * in the batched payload ->
 * (1) Message 1 from U1 to P1 at time T1
 * (2) Message 2 from U1 to P1 at time T2
 * (3) Message 1 from U2 to P1 at time T3
 * (4) Message 2 from U2 to P1 at time T4
 * and so on
 *
 * Implementation wise, we can simply loop over the 4 messages and handle them serially.
 * However, imagine there's a case we have 200000 batched messages then looping over the 200000
 * cases will be inefficient. So, the idea is that we organize these batched requests in a way
 * so that we are able to handle each of the 'n' cases in a most efficient way.
 *
 * From the above use-case, we'd want to construct the following table
 * ----------------------------------------------------------------
 * |   U1 - P1                      |      U2 - P1                 |
 * ----------------------------------------------------------------
 * | Message 1 from U1 at time T1   | Message 1 from U2 at time T3 |
 * ----------------------------------------------------------------
 * | Message 2 from U1 at time T2   | Message 2 from U2 at time T4 |
 * ----------------------------------------------------------------
 *
 * Essentially, here we can execute ->
 * (1) Columns U1-P1 and U2-P1 in parallel
 * (2) Messages 1 and 2 for U1-P1 serially. Notice, the ordering of two messages. They are sorted
 * based on timestamps.
 * (3) Messages 1 and 2 for U2-P1 serially. Notice, the ordering of two messages. They are sorted
 * based on timestamps.
 *
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
    getCloudantCreds()
      .then(cloudantCreds => {
        return loadAuth(cloudantCreds);
      })
      .then(auth => {
        // url verification takes place during facebook's webhook setup phase i.e. facebook makes
        // a GET request to the provided webhook endpoint and expects a challenge value in return.
        // This action simply passes the challenge passed by facebook during verification
        if (isURLVerificationEvent(params, auth)) {
          // Challege value is returned
          resolve({ text: params['hub.challenge'] });

          // When a request is coming from a facebook page, then facebook makes a POST request to
          // the provided webhook endpoint (which is the receive action)
        } else if (isPageObject(params)) {
          // Every time facebook makes a POST request to the webhook endpoint, it sends along
          // x-hub-signature header which basically contains SHA1 key. In order to make sure, that
          // the request is coming from facebook, it is important to calculate the HMAC key using
          // app-secret and the request payload and compare it against the x-hub-signature header.
          verifyFacebookSignatureHeader(params, auth);

          // React to all the events/messages present in the entries array.
          resolve(runBatchedEntriesInParallel(params));
        }
        // Neither page nor verification type request is detected
        reject({
          status: 400,
          text: 'Neither a page type request nor a verfication type request detected'
        });
      });
  });
}

/**
 * Function runs certain batched entries in parallel. Refer to IMPLEMENTATION DETAILS
 * at top of the file for more information
 * @param {*} params - params coming into the recieve action
 * @return {JSON} - returns a "200" to facebook and also, the error messages for those
 * pipelines that weren't invoked successfully. Sample return JSON may look something
 * like this:
 * {
      text: 200,
      failedActionInvocations: [],
      successfulActionInvocations: [
        {
          activationId: "2747c146f7e34f97b6cb1183f53xxxxx",
          successResponse: {
            params: {
              message: {
                text: "Hello! I'm doing good. I'm here to help you. Just say the word."
              },
              page_id: 12345667,
              recipient: {
                id: 1433556667
              },
              workspace_id: "08e17ca1-5b33-487a-83c9-xxxxxxxxxx"
            },
            text: 200,
            url: "https://graph.facebook.com/v2.6/me/messages"
          }
        }
      ]
    }
 */
function runBatchedEntriesInParallel(params) {
  // Organize batched requests so that they are grouped into parallel and serial entries
  // Each parallel entry is an array of serial entries
  const parallelEntries = organizeBatchedEntries(params);

  // Get sub-pipeline name
  const subPipelineName = params.sub_pipeline;

  const promises = [];
  const keys = Object.keys(parallelEntries);
  // For all serial entries within a parallel entry, handle them serially
  for (let i = 0; i < keys.length; i += 1) {
    const responses = [];
    promises.push(
      runBatchedEntriesInSeries(
        parallelEntries[keys[i]],
        responses,
        0,
        subPipelineName
      )
    );
  }

  return Promise.all(promises).then(results => {
    // Everytime facebook pings the "receive" endpoint/webhook, it expects a "200" string/text
    // response in return. In openwhisk, if we'd want to return a string response, then it's
    // necessary that we add a field "text" and the response "200" as the value. The field "text"
    // tells openwhisk that this endpoint must return a "text" response.
    // We also return a field "failedActionInvocations" which essentially returns the errors
    // for the pipelines that throw an error and "successfulActionInvocations" which returns
    // the response from the pipelines that were invoked successfully. These fields are only needed
    // for debugging purposes just in case the user would want to know why the invocation of
    // pipeline failed for certain entries in the batched messages array.
    return {
      text: 200,

      failedActionInvocations: results
        .reduce(
          (k, l) => {
            return k.concat(l);
          },
          []
        )
        .filter(e => {
          return e.failedInvocation;
        })
        .map(f => {
          return f.failedInvocation;
        }),

      successfulActionInvocations: results
        .reduce(
          (k, l) => {
            return k.concat(l);
          },
          []
        )
        .filter(e => {
          return e.successfulInvocation;
        })
        .map(f => {
          return f.successfulInvocation;
        })
    };
  });
}

/**
 * This function essentially invokes the subpipeline serially for all entries
 * @param {JSON} params  - JSON returned from organizeBatchedEntries function
 * @param {JSON} responses - Array of results received from sub-pipeline invocation
 * @param {var} index - The index of the serial entry for which the pipeline is to
 * be invoked
 * @param {var} subPipelineName - Name of the openwhisk pipeline
 * @return {JSON} responses - Array of results received from sub-pipeline invocation
 */
function runBatchedEntriesInSeries(params, responses, index, subPipelineName) {
  if (index < params.length) {
    const payload = params[index];
    return invokePipeline(payload, subPipelineName)
      .then(result => {
        responses.push(result);
        return runBatchedEntriesInSeries(
          params,
          responses,
          index + 1,
          subPipelineName
        );
      })
      .catch(e => {
        responses.push(e);
        return runBatchedEntriesInSeries(
          params,
          responses,
          index + 1,
          subPipelineName
        );
      });
  }
  return responses;
}

/**
 * This function essentially organizes the batched messages and constructs the table illustrated
 * IMPLEMENTATION DETAILS at top of the file.
 * @param  {JSON} params - Parameters passed into this action
 * @return {JSON} parallelEntries - A JSON object consisting of messages array
 * {
  "163792304621xxxx_26844073030xxxx": [
    {
      "sender": { "id": "163792304621xxxx" },
      "recipient": { "id": "26844073030xxxx" },
      "timestamp": 1501786719608,
      "message": {
        "mid": "mid.$cAACu1giyQ85j2rwNfVdqXbEfzghg",
        "seq": 3054,
        "text": "find a gas station"
      }
    },
    {
      "sender": { "id": "163792304621xxxx" },
      "recipient": { "id": "26844073030xxxx" },
      "timestamp": 1501786719609,
      "message": {
        "mid": "mid.$cAACu1giyQ85j2rwNfVdqXbEfzghg",
        "seq": 3054,
        "text": "first"
      }
    }
  ],
  "2234526xxxx_268440730xxxx": [
    {
      "sender": { "id": "2234526xxxx" },
      "recipient": { "id": "26844073030xxxx" },
      "timestamp": 1501786719610,
      "message": {
        "mid": "mid.$cAACu1giyQ85j2rwNfVdqXbEfzghg",
        "seq": 3054,
        "text": "hello, world!"
      }
    }
  ]
 */
function organizeBatchedEntries(params) {
  // Retrieve all entries from the array and flatten it
  const entries = params.entry.reduce(
    (k, l) => {
      return k.concat(l.messaging);
    },
    []
  );
  // Create a dictionary to store parallel entries. Each parallel entry
  // is an array of serial entries.
  const parallelEntries = {};
  // Loop through all the batched entries
  entries.map(entry => {
    // If a parallel entry for a specific sender and recipient id does not exist
    // create an empty array to store all the serial entries for a specific
    // parallel entry
    if (!parallelEntries[`${entry.sender.id}_${entry.recipient.id}`]) {
      parallelEntries[`${entry.sender.id}_${entry.recipient.id}`] = [];
    }
    // Push the serial entry into the parallel entry array
    return parallelEntries[`${entry.sender.id}_${entry.recipient.id}`].push(
      entry
    );
  });

  const keys = Object.keys(parallelEntries);
  // Loop through all the keys inside the parallelEntries dictionary
  keys.map(key => {
    // Sort the serial entries for a specific parallel entry based on
    // timestamp
    return parallelEntries[key].sort((a, b) => {
      return a.timestamp - b.timestamp;
    });
  });
  return parallelEntries;
}

/**
 * Function invokes the pipeline sequence
 *  [
        "starter-code/normalize-facebook-for-conversation",
        "context/load-context",
        "starter-code/pre-conversation",
        "conversation/call-conversation",
        "starter-code/normalize-conversation-for-facebook",
        "starter-code/post-conversation",
        "context/save-context",
        "facebook/post"
      ]
 * @param {JSON} params
 *  {
      "sender": { "id": "1637923046xxxxxx" },
      "recipient": { "id": "268440730xxxxxx" },
      "timestamp": 1501786719609,
      "message": {
        "mid": "mid.$cAACu1giyQ85j2rwNfVdqxxxxxxxx",
        "seq": 3054,
        "text": "find a restaurant"
      }
    }
 * @param {var} subPipelineName - Name of the openwhisk pipeline
 * @return {JSON} Result of openwhisk pipeline/action invocation
 */
function invokePipeline(params, subPipelineName) {
  const ow = openwhisk();
  return new Promise((resolve, reject) => {
    // Add the provider name i.e. facebook to the params
    const payload = {
      facebook: params,
      provider: 'facebook'
    };

    // Invoke the pipeline sequence
    return ow.actions
      .invoke({
        name: subPipelineName,
        params: payload,
        blocking: true
      })
      .then(res => {
        resolve({
          // Build a response for successful invocation
          successfulInvocation: {
            successResponse: res && res.response && res.response.result,
            activationId: res.activationId
          }
        });
      })
      .catch(e => {
        reject({
          // Build a response for failed invocation
          failedInvocation: {
            errorMessage: `Recipient id: ${params.recipient.id} , Sender id: ${params.sender.id} -- ${e.message}`,
            activationId: e.error.activationId
          }
        });
      });
  });
}

/** Checks if it's a URL verification event
 *
 * @param  {JSON} params - Parameters passed into the action
 * @return {boolean} - true or false
 */
function isURLVerificationEvent(params) {
  if (
    params['hub.mode'] !== 'subscribe' ||
    params['hub.verify_token'] !== params.verification_token
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
  const requestPayload = {};
  requestPayload.object = params.object;
  requestPayload.entry = Object.assign([], params.entry);
  const buffer = new Buffer(JSON.stringify(requestPayload));

  // Get the expected hash from the key i.e. if the key is sha1=1234
  // then remove the algorithm (sha1=) to get the hash.
  const expectedHash = xHubSignature.split('=')[1];

  // Compute the hash using the app secret and the request payload
  const calculatedHash = crypto
    .createHmac('sha1', appSecret)
    .update(buffer, 'utf-8')
    .digest('hex');

  assert.equal(calculatedHash, expectedHash, 'Verfication of facebook signature header failed. Please make sure you are passing the correct app secret');
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
  name: 'facebook/receive',
  isURLVerificationEvent,
  verifyFacebookSignatureHeader,
  loadAuth,
  getCloudantCreds,
  checkCloudantCredentials,
  createCloudantObj,
  retrieveDoc
};
