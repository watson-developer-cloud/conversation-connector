'use strict';

const assert = require('assert');
const openwhisk = require('openwhisk');

const openwhiskBindings = require('./../resources/openwhisk-bindings.json').openwhisk;
const safeExtractErrorMessage = require('./../resources/helper-methods.js').safeExtractErrorMessage;

describe('End-to-End tests: Conversation & Starter-code prerequisites', () => {
  const ow = openwhisk(openwhiskBindings);

  const requiredActions = [
    'starter-code/normalize',
    'conversation/call-conversation'
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
