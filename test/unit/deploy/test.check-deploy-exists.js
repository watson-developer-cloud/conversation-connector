'use strict';

/**
 * Unit tests for deploy endpoints, checking deploy name exists.
 */

const assert = require('assert');
const nock = require('nock');
const pick = require('object.pick');

const checkDeployExistsAction = require('./../../../deploy/check-deploy-exists.js');

const owHost = 'https://openwhisk.ng.bluemix.net';

const userNamespace = 'sampleorganization_samplespace';
const deployName = 'sample_deployment_name';
const mockError = 'mock-error';
const errorNoNamespaceFound = `Could not find user namespace: ${userNamespace}.`;

describe('Check-Deploy-Exists Unit Tests', () => {
  let params;
  let bxAuthPayload;
  let owMock;

  beforeEach(() => {
    params = {
      state: {
        auth: {
          access_token: 'sample_access_token',
          refresh_token: 'sample_refresh_token'
        },
        wsk: {
          namespace: userNamespace
        },
        name: deployName
      }
    };

    bxAuthPayload = {
      subject: 'mockuser@ibm.com',
      developer_guid: 'DXXXXXXXXX',
      namespaces: [
        {
          name: userNamespace,
          uuid: 'sampleuuid',
          key: 'samplekey'
        }
      ]
    };

    owMock = createOpenwhiskMock();
  });

  it('validate main works', () => {
    return checkDeployExistsAction(params)
      .then(results => {
        assert.deepEqual(results, { code: 200, message: 'OK' });
      })
      .catch(error => {
        assert(false, error);
      });
  });

  it('validate error when not enough input parameters', () => {
    delete params.state.auth;

    return checkDeployExistsAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: "Could not get user's Bluemix credentials."
        });
      });
  });

  it('validate error when openwhisk host throws object error', () => {
    nock.cleanAll();

    owMock.post('/bluemix/v2/authenticate').replyWithError(mockError);

    return checkDeployExistsAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: mockError });
      });
  });

  it('validate error when openwhisk host throws response error', () => {
    nock.cleanAll();

    owMock
      .post('/bluemix/v2/authenticate')
      .reply(400, { error: { error: mockError } });

    return checkDeployExistsAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(pick(error, ['code', 'message']), {
          code: 400,
          message: mockError
        });
      });
  });

  it('validate error when openwhisk host does not find the correct namespace', () => {
    bxAuthPayload.namespaces[0].name = 'bad_namespace';

    nock.cleanAll();

    owMock.post('/bluemix/v2/authenticate').reply(200, bxAuthPayload);

    return checkDeployExistsAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, { code: 400, message: errorNoNamespaceFound });
      });
  });

  it('validate error when ow deployment exists', () => {
    nock.cleanAll();

    owMock
      .post('/bluemix/v2/authenticate')
      .reply(200, bxAuthPayload)
      .get(uri => {
        return uri.indexOf(`/api/v1/namespaces/${userNamespace}/actions`) === 0;
      })
      .reply(200, { exec: { code: 'sample_code' } });

    return checkDeployExistsAction(params)
      .then(() => {
        assert(false, 'Action succeeded unexpectedly.');
      })
      .catch(error => {
        assert.deepEqual(error, {
          code: 400,
          message: `Deployment "${deployName}" already exists.`
        });
      });
  });

  function createOpenwhiskMock() {
    return (
      nock(owHost)
        // get openwhisk credentials from bx tokens
        .post('/bluemix/v2/authenticate')
        .reply(200, bxAuthPayload)
        // get action from user namespace
        .get(uri => {
          return uri.indexOf(`/api/v1/namespaces/${userNamespace}/actions`) ===
            0;
        })
        .replyWithError(mockError)
    );
  }
});
