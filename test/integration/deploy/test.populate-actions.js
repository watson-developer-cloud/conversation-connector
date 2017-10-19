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
  }).retries(4);
});
