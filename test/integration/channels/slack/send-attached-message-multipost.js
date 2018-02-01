/**
     * Copyright IBM Corp. 2018
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

/**
 * Mock action receiving a Slack event from slack/receive,
 *   and sending an attachment to slack/post.
 *
 * @param  {JSON} params - Slack event subscription
 * @return {JSON}        - Slack POST parameters of text message
 */
function main(params) {
  return new Promise(resolve => {
    validateParameters(params);
    const auth = params.auth;

    const message = [
      {
        text: 'Here is your multi-modal response.'
      },
      {
        attachments: [
          {
            title: 'Image title',
            pretext: 'Image description',
            image_url: 'https://s.w-x.co/240x180_twc_default.png'
          }
        ]
      },
      {
        attachments: [
          {
            text: 'Choose your location',
            callback_id: 'Choose your location',
            actions: [
              {
                name: 'Location 1',
                type: 'button',
                text: 'Location 1',
                value: 'Location 1'
              },
              {
                name: 'Location 2',
                type: 'button',
                text: 'Location 2',
                value: 'Location 2'
              },
              {
                name: 'Location 3',
                type: 'button',
                text: 'Location 3',
                value: 'Location 3'
              }
            ]
          }
        ]
      }
    ];

    resolve({
      channel: params.slack.event.channel,
      message,
      raw_input_data: {
        bot_id: params.bot_id,
        provider: 'slack',
        slack: params.slack,
        auth
      }
    });
  });
}

/**
 * Validates the required parameters for running this action.
 *
 * @param  {JSON} params - the parameters passed into the action
 */
function validateParameters(params) {
  // Required: The channel provider communicating with this action
  assert(
    params.provider && params.provider === 'slack',
    'No Slack channel provider provided.'
  );

  // Required: The parameters of the channel provider
  assert(params.slack, 'No Slack data provided.');

  // Required: Slack event data
  assert(params.slack.event, 'No Slack event data provided.');

  // Required: Slack channel
  assert(params.slack.event.channel, 'No Slack channel provided.');

  // Required: Slack input text
  assert(params.slack.event.text, 'No Slack input text provided.');

  // Required: Bot ID
  assert(params.bot_id, 'No bot ID provided.');

  // Required: auth
  assert(params.auth, 'No auth provided.');
}

module.exports = main;
