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
    it(`${action} is deployed in OpenWhisk namespace`, () => {
      return ow.actions.get({ name: action }).then(
        () => {},
        error => {
          assert(false, `${action}, ${safeExtractErrorMessage(error)}`);
        }
      );
    });
  });
});
