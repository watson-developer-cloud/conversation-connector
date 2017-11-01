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

/**
 *  An action representing a "black box" from and to the channel specified.
 *
 *  @params Paramters sent to this action by channel/receive:
 *    {
 *      facebook: {
 *        ...
 *      },
 *      provider: 'facebook'
 *    }
 *
 *  @return Return parameters required by facebook/post
 */
function main(params) {
  try {
    validateParams(params);
  } catch (e) {
    return Promise.reject(e.message);
  }

  return {
    recipient: {
      id: params.facebook.sender.id
    },
    message: params.facebook.message,
    raw_input_data: {
      auth: params.auth
    }
  };
}

/**
 *  Validates the required parameters for running this action.
 *
 *  @params - the parameters passed into the action
 */
function validateParams(params) {
  // Required: The channel provider communicating with this action
  if (!params.provider || params.provider !== 'facebook') {
    throw new Error('No facebook channel provider supplied.');
  }
  // Required: The parameters of the channel provider
  if (!params.facebook) {
    throw new Error('No facebook data or event parameters provided.');
  }

  // Required: Auth
  if (!params.auth) {
    throw new Error('No auth provided.');
  }
}

module.exports = main;
