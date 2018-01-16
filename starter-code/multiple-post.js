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
  return new Promise(resolve => {
    resolve(postMultipleMessages(params));
  });
}

/**
 * Checks the length of Conversation's message.text array and sends one
 * reply to the channel for each element in the
 * array.
 *
 * @param  {JSON} params - output JSON to be posted back to the channel
 * @return {JSON}        - result of the call(s) to the Post action
 */
function postMultipleMessages(params) {
  // Determine the name of the channel's post action
  const packageName = extractCurrentPackageName(process.env.__OW_ACTION_NAME);
  const deployName = packageName.split('_')[0];
  const actionName = `${deployName}_${params.raw_input_data.provider}/post`;

  // At minimum we will send one message to the channel,
  // but if Conversation contains an array, send more
  let size = 1;

  // TODO perhaps we can have a uniform place to check for this
  if (params.raw_input_data.provider === 'facebook') {
    size = Array.isArray(params.message)? (params.message.length) : (Array.isArray(params.message.text) ? params.message.text.length : 1);
  }

  const responses = [];

  // Post the message(s) and ultimately return JSON
  // with one response for each channel post that occurred.
  return postMessage(actionName, params, responses, size, 0).then(() => {
    return { postResponses: responses };
  });
}

/**
 * Recursively calls postMessage until all Conversation messages have been sent to the channel.
 *
 * @param actionName name of channel's post action
 * @param params the channel specific params to call the channel's api
 * @param responses an array to store the response in case we have to build it over multiple posts
 * @param size the number of messages to send to the channel
 * @param index the array index of the message that needs to be sent
 * @returns {*}
 */
function postMessage(actionName, params, responses, size, index) {
  // TODO need to update to send slightly different params
  // (a parsed message.text) to each invocation
  if (index < size) {
    const paramsForInvocation = Object.assign({}, params);
    paramsForInvocation.message = params.message[index];
    return invokeAction(actionName, paramsForInvocation)
      .then(result => {
        responses.push(result);
        return postMessage(actionName, params, responses, size, index + 1);
      })
      .catch(e => {
        responses.push(e);
        return postMessage(actionName, params, responses, size, index + 1);
      });
  }
  return responses;
}

/**
 * Uses the openwhisk npm module to invoke the channel's post action.
 * @param actionName
 * @param params
 * @returns {boolean}
 */
function invokeAction(actionName, params) {
  const ow = openwhisk();

  return new Promise((resolve, reject) => {
    // Invoke the post action
    console.log(`Invoking ${actionName} with params:${JSON.stringify(params)}`);
    return ow.actions
      .invoke({
        name: actionName,
        blocking: true,
        params
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
          failedInvocation: e
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
