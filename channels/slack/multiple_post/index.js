/**
 * Copyright IBM Corp. 2018
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

/**
 * Examines the reply from Conversation and posts one or more replies to the channel as needed.
 *
 * @param  {JSON} params - output JSON to be posted back to the channel
 * @return {JSON}        - result of the call(s) to the Post action
 */
function main(params) {
  return new Promise((resolve, reject) => {
    postMultipleMessages(params).then(result => {
      if (result.postResponses.failedPosts.length > 0) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Checks the length of the normalized message array and sends one
 * reply to the channel for each element in the array. If there is no message array,
 * it just posts a single message.
 *
 * @param  {JSON} params - output JSON to be posted back to the channel
 * @return {JSON}        - result of the call(s) to the Post action
 */
function postMultipleMessages(params) {
  // Determine the full path of the channel's postsequence sequence
  const packageName = extractCurrentPackageName(process.env.__OW_ACTION_NAME);
  const deployName = packageName.split('_')[0];
  const sequenceName = `${deployName}_postsequence`;

  // At minimum we will send one message to the channel,
  // but if the message array exists send one message for each element of the array
  const size = Array.isArray(params.message) ? params.message.length : 1;

  const responses = { successfulPosts: [], failedPosts: [] };
  const ow = openwhisk();

  // Post the message(s) and ultimately return JSON
  // with one response for each channel post that occurred.
  return postMessage(sequenceName, params, responses, size, 0, ow).then(() => {
    return { postResponses: responses };
  });
}

/**
 * Recursively calls postMessage until all Conversation messages have been sent to the channel.
 *
 * @param sequenceName name of channel's postsequence sequence
 * @param params the channel specific params to call the channel's api
 * @param responses an array to store the response in case we have to build it over multiple posts
 * @param size the number of messages to send to the channel
 * @param index the array index of the message that needs to be sent
 * @returns {*}
 */
function postMessage(sequenceName, params, responses, size, index, ow) {
  if (index < size) {
    const paramsForInvocation = Object.assign({}, params);
    let sleepDuration = params.message && params.message.time;

    // If we have an array of messages, extract the next element we haven't sent and store
    // it at the root of the JSON
    if (Array.isArray(params.message)) {
      sleepDuration = params.message[index].time;
      Object.assign(paramsForInvocation, params.message[index]);
      delete paramsForInvocation.message;
    }
    // Check if this is a pause response.
    if (
      paramsForInvocation.response_type &&
      paramsForInvocation.response_type === 'pause'
    ) {
      // There's no way to send user-typing indicator in Slack!
      // Just sleep for specified duration and invoke the action
      // with the next set of parameters.
      return sleep(sleepDuration)
        .then(() => {
          return postMessage(
            sequenceName,
            params,
            responses,
            size,
            index + 1,
            ow
          );
        })
        .catch(e => {
          // Capture the response, don't send any further messages
          responses.failedPosts.push(e);
        });
    }
    return invokeAction(sequenceName, paramsForInvocation, ow)
      .then(result => {
        responses.successfulPosts.push(result);
        return postMessage(
          sequenceName,
          params,
          responses,
          size,
          index + 1,
          ow
        );
      })
      .catch(e => {
        // Capture the response, don't send any further messages
        responses.failedPosts.push(e);
      });
  }
  // index=size. We're done. Resolve.
  return new Promise(resolve => {
    resolve(responses);
  });
}

/**
 * Sleep for a supplied amount of milliseconds.
 *
 * @param  {integer} ms - number of milliseconds to sleep
 * @return {Promise}    - Promise resolve
 */
function sleep(ms) {
  return new Promise(resolve => {
    if (ms) {
      setTimeout(resolve, ms);
    } else {
      resolve();
    }
  });
}

/**
 * Uses the openwhisk npm module to invoke the channel's post action.
 * @param actionName
 * @param params
 * @returns {boolean}
 */
function invokeAction(actionName, params, ow) {
  return new Promise((resolve, reject) => {
    // Invoke the post action
    return ow.actions
      .invoke({
        name: actionName,
        blocking: true,
        params
      })
      .then(res => {
        resolve(
          // Build a response for successful invocation
          {
            successResponse: res && res.response && res.response.result,
            activationId: res.activationId
          }
        );
      })
      .catch(e => {
        reject({
          // Build a response for failed invocation
          failureResponse: e
        });
      });
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
  main
};
