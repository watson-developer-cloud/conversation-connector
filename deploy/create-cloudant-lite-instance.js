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
const request = require('request');

const apiUrl = 'https://api.ng.bluemix.net';

const NAME_CLOUDANT_SERVICE = 'cloudantNoSQLDB';
const NAME_CLOUDANT_LITE_PLAN = 'cloudant-lite';
const NAME_CLOUDANT_INSTANCE = 'conversation-connector';
const NAME_CLOUDANT_INSTANCE_KEY = 'conversation-connector-key';

/**
 * Accepts a user's Bluemix tokens and org-space,
 *   and creates a CloudantNoSQLDB lite service instance for the user.
 *
 * @param  {JSON} params    - Parameters passed into the action
 * @return {Promise}        - status code and message depicting success or error
 */
function main(params) {
  return new Promise((resolve, reject) => {
    try {
      validateParameters(params);
    } catch (error) {
      reject({ code: 400, message: error.message });
    }

    const accessToken = params.access_token;
    const org = params.namespace.split('_')[0];
    const space = params.namespace.split('_')[1];

    let spaceId;
    let cloudantLitePlanId;
    let cloudantInstanceId;

    return getOrgId(accessToken, org)
      .then(orgId => {
        return getSpaceId(accessToken, orgId, space);
      })
      .then(guid => {
        spaceId = guid;
        return getCloudantService(accessToken);
      })
      .then(guid => {
        return getCloudantLiteServicePlan(accessToken, guid);
      })
      .catch(error => {
        const errorMessage = error.error ? error.error : error;
        reject({ code: 400, message: errorMessage });
      })
      .then(guid => {
        cloudantLitePlanId = guid;
        return getCloudantInstance(accessToken, cloudantLitePlanId, spaceId);
      })
      .catch(() => {
        return createCloudantInstance(accessToken, cloudantLitePlanId, spaceId);
      })
      .catch(error => {
        const errorMessage = error.error ? error.error : error;
        reject({ code: 400, message: errorMessage });
      })
      .then(guid => {
        cloudantInstanceId = guid;
        return getCloudantInstanceKeyUrl(accessToken, cloudantInstanceId);
      })
      .catch(() => {
        return createCloudantInstanceKeyUrl(accessToken, cloudantInstanceId);
      })
      .then(result => {
        resolve({ code: 200, message: result });
      })
      .catch(error => {
        const errorMessage = error.error ? error.error : error;
        reject({ code: 400, message: errorMessage });
      });
  });
}

/**
 * Get Organization Id
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} orgName     - organization name
 * @return {string}             - organization guid
 */
function getOrgId(accessToken, orgName) {
  const url = `${apiUrl}/v2/organizations`;

  return makeGetRequest(url, accessToken, callback);

  function callback(error, response, body) {
    const orgs = JSON.parse(body).resources;
    for (let i = 0; i < orgs.length; i += 1) {
      const org = orgs[i];
      if (org.entity.name === orgName) {
        return org.metadata.guid;
      }
    }

    throw new Error(`Could not find an organization with name: ${orgName}.`);
  }
}

/**
 * Get Space Id from Organization Id
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} orgId       - organization guid
 * @param  {string} spaceName   - space name
 * @return {string}             - space guid
 */
function getSpaceId(accessToken, orgId, spaceName) {
  const url = `${apiUrl}/v2/organizations/${orgId}/spaces?q=name:${encodeURIComponent(spaceName)}`;

  return makeGetRequest(url, accessToken, callback);

  function callback(error, response, body) {
    const spaces = JSON.parse(body).resources;
    for (let i = 0; i < spaces.length; i += 1) {
      const space = spaces[i];
      if (space.entity.name === spaceName) {
        return space.metadata.guid;
      }
    }
    throw new Error(`Could not find a space with name: ${spaceName}.`);
  }
}

/**
 * Get cloudant service Id
 *
 * @param  {string} accessToken - Bluemix access token
 * @return {string}             - cloudant service guid
 */
function getCloudantService(accessToken) {
  const url = `${apiUrl}/v2/services?q=label:${NAME_CLOUDANT_SERVICE}`;

  return makeGetRequest(url, accessToken, callback);

  function callback(error, response, body) {
    const services = JSON.parse(body).resources;
    for (let i = 0; i < services.length; i += 1) {
      const service = services[i];
      if (service.entity.unique_id === 'cloudant') {
        return service.metadata.guid;
      }
    }
    throw new Error(
      `Could not find a service with name: ${NAME_CLOUDANT_SERVICE}.`
    );
  }
}

/**
 * Get cloudant lite service plan Id
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} serviceId   - cloudant service guid
 * @return {string}             - cloudant lite service plan guid
 */
function getCloudantLiteServicePlan(accessToken, serviceId) {
  const url = `${apiUrl}/v2/services/${serviceId}/service_plans?q=active:true`;

  return makeGetRequest(url, accessToken, callback);

  function callback(error, response, body) {
    const plans = JSON.parse(body).resources;
    for (let i = 0; i < plans.length; i += 1) {
      const plan = plans[i];
      if (plan.entity.unique_id === NAME_CLOUDANT_LITE_PLAN) {
        return plan.metadata.guid;
      }
    }
    throw new Error(
      `Could not find a plan with name: ${NAME_CLOUDANT_LITE_PLAN}.`
    );
  }
}

/**
 * Get cloudant instance Id
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} planId      - cloudant lite service plan guid
 * @param  {string} spaceId     - space guid
 * @return {string}             - cloudant instance guid
 */
function getCloudantInstance(accessToken, planId, spaceId) {
  const url = `${apiUrl}/v2/service_instances?q=name:${NAME_CLOUDANT_INSTANCE}`;

  return makeGetRequest(url, accessToken, callback);

  function callback(error, response, body) {
    const instances = JSON.parse(body).resources;
    for (let i = 0; i < instances.length; i += 1) {
      const instance = instances[i];
      if (
        instance.entity.service_plan_guid === planId &&
        instance.entity.space_guid === spaceId
      ) {
        return instance.metadata.guid;
      }
    }
    throw new Error(
      `Could not find a database instance with name: ${NAME_CLOUDANT_INSTANCE}`
    );
  }
}

/**
 * Get cloudant instance key URL
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} instanceId  - cloudant instance guid
 * @return {string}             - cloudant instance key URL
 */
function getCloudantInstanceKeyUrl(accessToken, instanceId) {
  const url = `${apiUrl}/v2/service_keys?q=service_instance_guid:${instanceId}`;

  return makeGetRequest(url, accessToken, callback);

  function callback(error, response, body) {
    const instanceKeys = JSON.parse(body).resources;
    for (let i = 0; i < instanceKeys.length; i += 1) {
      const instanceKey = instanceKeys[i];
      if (instanceKey.entity.name === NAME_CLOUDANT_INSTANCE_KEY) {
        return instanceKey.entity.credentials;
      }
    }
    throw new Error(
      `No instance keys found for Cloudant instance: ${instanceId}`
    );
  }
}

/**
 * Create cloudant instance and Id
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} planId      - cloudant lite service plan guid
 * @param  {string} spaceId     - space guid
 * @return {string}             - cloudant instance guid
 */
function createCloudantInstance(accessToken, planId, spaceId) {
  const errorServiceInstanceExceeded = 'CF-ServiceInstanceQuotaExceeded';
  const url = `${apiUrl}/v2/service_instances`;

  const postData = {
    name: NAME_CLOUDANT_INSTANCE,
    service_plan_guid: planId,
    space_guid: spaceId
  };

  return makeRequest(url, accessToken, 'POST', postData, callback);

  function callback(error, response, body) {
    let errorCode;

    if (response.statusCode < 200 || response.statusCode >= 400) {
      const responseBody = response.body &&
        JSON.parse(response.body) &&
        JSON.parse(response.body).error_code;
      throw new Error(responseBody);
    }

    const cloudant = JSON.parse(body);

    if (cloudant.error_code) {
      errorCode = cloudant.error_code;
    }

    if (errorCode) {
      if (errorCode === errorServiceInstanceExceeded) {
        throw new Error('Number of Bluemix instances exceeded limit.');
      } else {
        throw new Error(errorCode);
      }
    }

    return cloudant.metadata.guid;
  }
}

/**
 * Create cloudant instance key URL
 *
 * @param  {string} accessToken - Bluemix access token
 * @param  {string} instanceId  - cloudant instance guid
 * @return {string}             - cloudant instance key URL
 */
function createCloudantInstanceKeyUrl(accessToken, instanceId) {
  const url = `${apiUrl}/v2/service_keys`;

  const postData = {
    name: NAME_CLOUDANT_INSTANCE_KEY,
    service_instance_guid: instanceId
  };

  return makeRequest(url, accessToken, 'POST', postData, callback);

  function callback(error, response, body) {
    if (response.statusCode < 200 || response.statusCode >= 400) {
      const responseBody = response.body &&
        JSON.parse(response.body) &&
        JSON.parse(response.body).error_code;
      throw new Error(responseBody);
    }
    const cloudantKey = JSON.parse(body);
    return cloudantKey.entity.credentials;
  }
}

/**
 * Make GET request call, and then invoke callback
 *
 * @param  {string}   url         - request GET URL
 * @param  {string}   accessToken - Bluemix access token
 * @param  {Function} callback    - callback method after GET request called
 * @return {Promise}              - Promise wrapping the result
 */
function makeGetRequest(url, accessToken, callback) {
  return new Promise((resolve, reject) => {
    const headers = { Authorization: `bearer ${accessToken}` };

    request(
      {
        headers,
        url
      },
      (error, response, body) => {
        if (error) {
          reject(error.message);
        } else if (response.statusCode < 200 || response.statusCode >= 400) {
          const responseBody = response.body &&
            JSON.parse(response.body) &&
            JSON.parse(response.body).error_code;
          reject(responseBody);
        } else {
          try {
            resolve(callback(error, response, body));
          } catch (e) {
            reject({ error: e.message });
          }
        }
      }
    );
  });
}

/**
 * Make request call, and then invoke callback
 *
 * @param  {string}   url         - request URL
 * @param  {string}   accessToken - Bluemix access token
 * @param  {string}   method      - request method
 * @param  {JSON}     form        - request form data
 * @param  {Function} callback    - callback method after request called
 * @return {Promise}              - Promise wrapping the result
 */
function makeRequest(url, accessToken, method, form, callback) {
  return new Promise((resolve, reject) => {
    const headers = accessToken
      ? { Authorization: `bearer ${accessToken}` }
      : undefined;

    request(
      {
        form: JSON.stringify(form),
        headers,
        method,
        url
      },
      (error, response, body) => {
        if (error) {
          reject(error.message);
        }

        try {
          resolve(callback(error, response, body));
        } catch (e) {
          reject({ error: e.message });
        }
      }
    );
  });
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  assert(params.access_token, 'No access token provided.');
  assert(params.refresh_token, 'No refresh token provided.');
  assert(params.namespace, 'No namespace provided.');
}

module.exports = main;
