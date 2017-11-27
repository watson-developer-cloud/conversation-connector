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
 * Deploy Populate Actions Integration Tests
 */

const assert = require('assert');
const openwhisk = require('openwhisk');

const actionPopulateActions = 'populate-actions';

describe('deploy populate-actions integration tests', () => {
  const ow = openwhisk();

  let params;

  beforeEach(() => {
    params = {
      state: {
        auth: {
          access_token: process.env.__TEST_DEPLOYUSER_ACCESS_TOKEN,
          refresh_token: process.env.__TEST_DEPLOYUSER_REFRESH_TOKEN
        },
        wsk: {
          namespace: process.env.__TEST_DEPLOYUSER_WSK_NAMESPACE
        },
        conversation: {
          guid: process.env.__TEST_DEPLOYUSER_CONVERSATION_GUID,
          workspace_id: process.env.__TEST_DEPLOYUSER_CONVERSATION_WORKSPACEID
        }
      }
    };
  });

  it('validate populate-actions works', () => {
    const deploymentName = 'test-integration-populateactions';
    params.state.name = deploymentName;

    return ow.actions
      .invoke({
        name: actionPopulateActions,
        blocking: true,
        result: true,
        params
      })
      .then(result => {
        assert.deepEqual(result, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });
});
