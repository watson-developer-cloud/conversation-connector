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
 * Here the user can edit the channel input message before send to Conversation module.
 *
 * @param  {JSON} params - input JSON sent by the channel module
 * @return {JSON}        - modified input JSON to be sent to the conversation module
 */
function main(params) {
  return Promise.resolve(params);
}

module.exports = main;
