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

const openwhisk = require('openwhisk');
const assert = require('assert');

/**
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
 * Receives a batched message request from facebook and handles each of the messages in the request
 * individually
 *
 * @param  {JSON} params - Parameters sent by facebook/receive action i.e. Facebook Callback API
 *                         parameters as outlined by
 *                         https://developers.facebook.com/docs/graph-api/webhooks#callback
 * @return {Promise} - Result of the Facebook callback API
 */
function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (e) {
      reject(e.message);
    }
    // Invoke batched entries in parallel
    resolve(runBatchedEntriesInParallel(params));
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
        subPipelineName,
        params.auth
      )
    );
  }

  return Promise.all(promises).then(results => {
    // Everytime facebook pings the "receive" endpoint/webhook, it expects a "200" string/text
    // response in return. In Cloud Functions, if we'd want to return a string response, then it's
    // necessary that we add a field "text" and the response "200" as the value. The field "text"
    // tells Cloud Functions that this endpoint must return a "text" response.
    // We also return a field "failedActionInvocations" which essentially returns the errors
    // for the pipelines that throw an error and "successfulActionInvocations" which returns
    // the response from the pipelines that were invoked successfully. These fields are only needed
    // for debugging purposes just in case the user would want to know why the invocation of
    // pipeline failed for certain entries in the batched messages array.
    return {
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
   * @param {var} subPipelineName - Name of the Cloud Functions pipeline
   * @return {JSON} responses - Array of results received from sub-pipeline invocation
   */
function runBatchedEntriesInSeries(
  params,
  responses,
  index,
  subPipelineName,
  auth
) {
  if (index < params.length) {
    const payload = params[index];
    return invokePipeline(payload, subPipelineName, auth)
      .then(result => {
        responses.push(result);
        return runBatchedEntriesInSeries(
          params,
          responses,
          index + 1,
          subPipelineName,
          auth
        );
      })
      .catch(e => {
        responses.push(e);
        return runBatchedEntriesInSeries(
          params,
          responses,
          index + 1,
          subPipelineName,
          auth
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
   * @param {var} subPipelineName - Name of the Cloud Functions pipeline
   * @return {JSON} Result of Cloud Functions pipeline/action invocation
   */
function invokePipeline(params, subPipelineName, auth) {
  const ow = openwhisk();
  return new Promise((resolve, reject) => {
    // Add the provider name i.e. facebook to the params and pass auth separately
    const payload = {
      facebook: params,
      provider: 'facebook',
      auth
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

/**
 *  Validates the required parameters for running this action.
 *
 *  @params The parameters passed into the action
 */
function validateParameters(params) {
  // Required: Channel identifier
  assert(
    params.sub_pipeline,
    "Subpipeline name does not exist. Please make sure your Cloud Functions channel package has the binding 'sub_pipeline'"
  );
}

module.exports = {
  main,
  name: 'facebook/batched_messages'
};
