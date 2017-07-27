'use strict';

/**
   * Context Package Integration Tests (load-context and save-context)
   */

const assert = require('assert');
const openwhisk = require('openwhisk');
const openWhiskAuthObj = require('../../resources/openwhisk-bindings.json').openwhisk;
const cloudantBindings = require('./../../resources/cloudant-bindings.json');

const jsonParams = require('../../resources/test.integration.context.json').contextJsons;

const clearContextDb = require('./../../utils/cloudant-utils.js').clearContextDb;

describe('context package integration tests', () => {
  // Setup the ow module for the upcoming calls
  const options = {
    apihost: openWhiskAuthObj.apihost,
    api_key: openWhiskAuthObj.api_key
  };
  const ow = openwhisk(options);

  beforeEach(() => {
    clearContextDb(
      cloudantBindings.database.dbname,
      cloudantBindings.database.cloudant_url
    );
  });

  it('validate actions work properly for single turn', () => {
    const actionName = 'context/integration-pipeline';
    // Get the json params for the single turn case.
    const params = jsonParams.singleTurn.request;

    // Expected response from the system.
    const expectedResult = jsonParams.singleTurn.response;
    return clearContextDb(
      cloudantBindings.database.dbname,
      cloudantBindings.database.cloudant_url
    ).then(() => {
      return ow.actions
        .invoke({
          name: actionName,
          blocking: true,
          result: true,
          params
        })
        .then(
          success => {
            assert.deepEqual(success, expectedResult);
          },
          error => {
            assert(false, error);
          }
        );
    });
  }).timeout(4000);

  it('validate actions work properly for multiple turns', () => {
    const actionName = 'context/integration-pipeline';

    // Get the json params for the multi turn case.
    let params = jsonParams.multiTurn.requests[0];

    // The expected responses from the system.
    const expAfterTurn1 = jsonParams.multiTurn.responses[0];
    const expAfterTurn2 = jsonParams.multiTurn.responses[1];

    return clearContextDb(
      cloudantBindings.database.dbname,
      cloudantBindings.database.cloudant_url
    ).then(() => {
      ow.actions
        .invoke({
          name: actionName,
          blocking: true,
          result: true,
          params
        })
        .then(result => {
          assert.deepEqual(result, expAfterTurn1);

          // Update params for the second call turn of requests.
          params = jsonParams.multiTurn.requests[1];

          // Invoke the context sequence actions again.
          // The context package should read the updated context from the previous turn.
          return ow.actions.invoke({
            name: actionName,
            result: true,
            blocking: true,
            params
          });
        })
        .then(result => {
          return assert.deepEqual(result, expAfterTurn2);
        })
        .catch(err => {
          return assert(false, err);
        });
    });
  }).timeout(8000);
});
