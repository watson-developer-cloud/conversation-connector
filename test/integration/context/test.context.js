'use strict';

/**
   * Context Package Integration Tests (load-context and save-context)
   */

const assert = require('assert');
const openwhisk = require('openwhisk');
const cloudantBindings = require('./../../resources/bindings/cloudant-bindings.json');

const jsonParams = require('../../resources/payloads/test.integration.context.json').contextJsons;

const clearContextDb = require('./../../utils/cloudant-utils.js').clearContextDb;

const pipelineName = process.env.__TEST_PIPELINE_NAME;

const actionName = `${pipelineName}_context/integration-pipeline`;

describe('context package integration tests', () => {
  // Setup the ow module for the upcoming calls
  const ow = openwhisk();

  it.skip('validate actions work properly for single turn', () => {
    // Get the json params for the single turn case.
    const params = jsonParams.singleTurn.request;

    // Expected response from the system.
    const expectedResult = jsonParams.singleTurn.response;
    clearContextDb(cloudantBindings.database.context.name, cloudantBindings.url)
      .then(() => {
        return ow.actions.invoke({
          name: actionName,
          blocking: true,
          result: true,
          params
        });
      })
      .then(success => {
        assert.deepEqual(success, expectedResult);
      })
      .catch(err => {
        assert(false, err);
      });
  });

  it.skip('validate actions work properly for multiple turns', () => {
    // Get the json params for the multi turn case.
    let params = jsonParams.multiTurn.requests[0];

    // The expected responses from the system.
    const expAfterTurn1 = jsonParams.multiTurn.responses[0];
    const expAfterTurn2 = jsonParams.multiTurn.responses[1];

    clearContextDb(cloudantBindings.database.context.name, cloudantBindings.url)
      .then(() => {
        return ow.actions.invoke({
          name: actionName,
          blocking: true,
          result: true,
          params
        });
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
        assert.deepEqual(result, expAfterTurn2);
      })
      .catch(err => {
        assert(false, err);
      });
  });
});
