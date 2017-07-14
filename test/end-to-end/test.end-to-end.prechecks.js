'use strict';

const assert = require('assert');
const openwhisk = require('openwhisk');

const openwhiskBindings = require('./../resources/openwhisk-bindings.json').openwhisk;
const safeExtractErrorMessage = require('./../resources/helper-methods.js').safeExtractErrorMessage;

describe('End-to-End tests: Conversation & Starter-code prerequisites', () => {
  const ow = openwhisk(openwhiskBindings);

  const requiredActions = [
    'starter-code/pre-conversation',
    'starter-code/post-conversation',
    'conversation/call-conversation',
    'context/load-context',
    'context/save-context'
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
