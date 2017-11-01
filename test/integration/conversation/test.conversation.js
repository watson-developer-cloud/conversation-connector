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

const envParams = process.env;

const pipelineName = envParams.__TEST_PIPELINE_NAME;

describe('conversation integration tests', () => {
  // Setup the ow module for the upcoming calls
  const ow = openwhisk();

  let params = {};

  beforeEach(() => {
    params = {
      conversation: {
        input: {
          text: 'Turn on lights'
        }
      },
      raw_input_data: {
        slack: {
          event: {
            text: 'Turn on lights'
          }
        },
        provider: 'slack',
        auth: {
          conversation: {
            username: envParams.__TEST_CONVERSATION_USERNAME,
            password: envParams.__TEST_CONVERSATION_PASSWORD,
            workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID
          }
        }
      }
    };

    // merge the two objects, deep copying packageBindings so it doesn't get changed between tests
    // and we only have to read it once
    params = Object.assign(params, {
      username: envParams.__TEST_CONVERSATION_USERNAME,
      password: envParams.__TEST_CONVERSATION_PASSWORD,
      workspace_id: envParams.__TEST_CONVERSATION_WORKSPACE_ID,
      version_date: envParams.__TEST_CONVERSATION_VERSION_DATE,
      version: envParams.__TEST_CONVERSATION_VERSION
    });
  });

  it('call using OpenWhisk module ', () => {
    const name = `${pipelineName}_conversation/call-conversation`;
    const blocking = true;
    const result = true;

    // Call Conversation once to initiate the Conversation. The car-dashboard we are using for tests
    // always responds with a welcome message to the original user query.
    return ow.actions
      .invoke({ name, blocking, result, params })
      .then(response1 => {
        params.conversation.context = response1.context;

        // After getting the context, call Conversation again to get the true response to the user's
        // query (and not just the welcome message)
        return ow.actions.invoke({ name, blocking, result, params });
      })
      .then(response2 => {
        assert.equal(
          response2.conversation.output.text[0],
          'Hi. It looks like a nice drive today. What would you like me to do?  ',
          'response from conversation does not contain expected answer'
        );
      })
      .catch(e => {
        assert(false, e);
      });
  })
    .timeout(20000)
    .retries(4);
});
