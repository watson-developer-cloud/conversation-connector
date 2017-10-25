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

const assert = require('assert');
const openwhisk = require('openwhisk');

const safeExtractErrorMessage = require('./../utils/helper-methods.js').safeExtractErrorMessage;

const pipelineName = process.env.__TEST_PIPELINE_NAME;

describe('End-to-End tests: Conversation & Starter-code prerequisites', () => {
  const ow = openwhisk();
  const requiredActions = [
    `${pipelineName}_starter-code/pre-conversation`,
    `${pipelineName}_starter-code/post-conversation`,
    `${pipelineName}_conversation/call-conversation`,
    `${pipelineName}_starter-code/pre-normalize`,
    `${pipelineName}_starter-code/post-normalize`,
    `${pipelineName}_context/load-context`,
    `${pipelineName}_context/save-context`
  ];

  requiredActions.forEach(action => {
    it(`${action} is deployed in Cloud Functions namespace`, () => {
      return ow.actions.get({ name: action }).then(
        () => {},
        error => {
          assert(false, `${action}, ${safeExtractErrorMessage(error)}`);
        }
      );
    });
  });
});
