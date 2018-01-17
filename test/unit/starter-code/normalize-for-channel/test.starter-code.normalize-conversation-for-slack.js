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

/**
 * Unit tests for normalizing conversation SDK output parameters into Slack parameters
 */

const assert = require('assert');
const actionNormForSlack = require('./../../../../starter-code/normalize-for-channel/normalize-conversation-for-slack.js');

const channel = 'CXXXXXXXXX';
const text = 'Message coming from starter-code/normalize_for_slack unit test.';

const urlChatPostMessage = 'https://slack.com/api/chat.postMessage';
const urlChatUpdate = 'https://slack.com/api/chat.update';

const errorNoConversation = 'No conversation output.';
const errorNoOutputMessage = 'No facebook/generic/text field in conversation.output.';
const errorNoRawInputData = 'No raw input data found.';
const errorNoSlackInputData = 'No Slack input data found.';
const errorNoConvInputData = 'No Conversation input data found.';
const errorNoSlackChannel = 'No Slack channel found in raw data.';

describe('Starter-Code Normalize-For-Slack Unit Tests', () => {
  let params;
  let expectedResult;

  let textMessageParams;
  let payload;
  let attachmentMessageParams;

  let genericForSlack;
  let genericFromConversation;

  beforeEach(() => {
    textMessageParams = {
      token: 'XXYYZZ',
      team_id: 'TXXXXXXXX',
      api_app_id: 'AXXXXXXXXX',
      event: {
        type: 'message',
        user: 'U2147483697',
        ts: '1355517523.000005',
        channel,
        text
      },
      type: 'event_callback',
      authed_users: ['UXXXXXXX1', 'UXXXXXXX2'],
      event_id: 'Ev08MFMKH6',
      event_time: 1234567890
    };

    payload = {
      channel: {
        id: channel,
        name: 'test_channel'
      },
      actions: [
        {
          name: 'shirt_size_small',
          value: 'small',
          type: 'button'
        }
      ],
      original_message: {
        ts: '1355517523.000005'
      },
      callback_id: 'test_callback_id',
      token: 'XXYYZZ'
    };

    attachmentMessageParams = {
      payload: JSON.stringify(payload)
    };

    params = {
      conversation: {
        output: {
          text: [text]
        }
      },
      raw_input_data: {
        conversation: {
          input: {
            text
          }
        },
        slack: textMessageParams,
        provider: 'slack'
      }
    };

    expectedResult = {
      raw_input_data: {
        conversation: {
          input: {
            text
          }
        },
        slack: textMessageParams,
        provider: 'slack'
      },
      raw_output_data: {
        conversation: {
          output: {
            text: [text]
          }
        }
      },
      ts: '1355517523.000005',
      url: urlChatPostMessage,
      channel,
      text
    };

    genericFromConversation = [
      {
        response_type: 'text',
        text
      },
      {
        response_type: 'image',
        source: 'http://my-website.com/path/to/image.jpg'
      },
      {
        response_type: 'option',
        title: 'Select a location',
        options: [
          {
            label: 'Location 1',
            value: 'Location 1'
          },
          {
            label: 'Location 2',
            value: 'Location 2'
          },
          {
            label: 'Location 3',
            value: 'Location 3'
          }
        ]
      }
    ];

    genericForSlack = [
      {
        text,
        attachments: []
      },
      {
        attachments: [
          {
            image_url: genericFromConversation[1].source,
            pretext: genericFromConversation[1].description,
            title: genericFromConversation[1].title
          }
        ]
      },
      {
        attachments: [
          {
            text: genericFromConversation[2].title,
            actions: genericFromConversation[2].options.map(e => {
              const el = Object.assign({}, e);
              el.name = 'name';
              el.type = 'button';
              return el;
            })
          }
        ]
      },
      {
        text,
        attachments: [
          {
            image_url: genericFromConversation[1].source,
            pretext: genericFromConversation[1].description,
            title: genericFromConversation[1].title
          },
          {
            text: genericFromConversation[2].title,
            actions: genericFromConversation[2].options.map(e => {
              const el = Object.assign({}, e);
              el.name = 'name';
              el.type = 'button';
              return el;
            })
          }
        ]
      }
    ];
  });

  it('validate normalization works for text messages', () => {
    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization worked for edited messages', () => {
    delete params.raw_input_data.slack.event.user;
    delete params.raw_input_data.slack.event.ts;
    delete params.raw_input_data.slack.event.text;
    params.raw_input_data.slack.event.message = {
      type: 'message',
      user: 'U2147483697',
      ts: '1355517523.000005',
      text
    };

    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works with attachment messages', () => {
    params.raw_input_data.slack = attachmentMessageParams;

    expectedResult.raw_input_data.slack = params.raw_input_data.slack;
    expectedResult.url = urlChatUpdate;
    expectedResult.attachments = [{ text }];
    delete expectedResult.text;

    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - text', () => {
    delete params.conversation.output.text;
    delete expectedResult.raw_output_data.conversation.output.text;

    // Add a generic text response from Conversation
    params.conversation.output.generic = genericFromConversation[0];

    expectedResult.raw_output_data.conversation.output.generic = params.conversation.output.generic;
    expectedResult = Object.assign(expectedResult, genericForSlack[0]);

    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - image', () => {
    delete params.conversation.output.text;
    delete expectedResult.raw_output_data.conversation.output.text;
    delete expectedResult.text;

    // Add a generic image response from Conversation
    params.conversation.output.generic = genericFromConversation[1];

    expectedResult.raw_output_data.conversation.output.generic = params.conversation.output.generic;
    expectedResult = Object.assign(expectedResult, genericForSlack[1]);

    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for generic response_type - option', () => {
    delete params.conversation.output.text;
    delete expectedResult.raw_output_data.conversation.output.text;
    delete expectedResult.text;

    // Add a generic option response from Conversation
    params.conversation.output.generic = genericFromConversation[2];

    expectedResult.raw_output_data.conversation.output.generic = params.conversation.output.generic;
    expectedResult = Object.assign(expectedResult, genericForSlack[2]);

    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works for multiple generic response_type list', () => {
    delete params.conversation.output.text;
    delete expectedResult.raw_output_data.conversation.output.text;
    delete expectedResult.text;

    // Add a generic option response from Conversation
    params.conversation.output.generic = genericFromConversation;

    expectedResult.raw_output_data.conversation.output.generic = params.conversation.output.generic;
    genericForSlack.map(e => {
      expectedResult = Object.assign(expectedResult, e);
      return expectedResult;
    });
    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works with slack data in conversation dialog node', () => {
    params.conversation.output.slack = {
      text
    };
    expectedResult.raw_output_data.conversation.output.slack = params.conversation.output.slack;
    delete expectedResult.ts;

    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate normalization works with message without timestamp', () => {
    delete params.raw_input_data.slack.event.ts;
    delete expectedResult.ts;

    return actionNormForSlack(params).then(
      result => {
        assert.deepEqual(result, expectedResult);
      },
      error => {
        assert(false, error);
      }
    );
  });

  it('validate error when no conversation data', () => {
    delete params.conversation;

    return actionNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoConversation);
      }
    );
  });

  it('validate error when no conversation output', () => {
    delete params.conversation.output.text;

    return actionNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoOutputMessage);
      }
    );
  });

  it('validate error when no slack input data', () => {
    delete params.raw_input_data;

    return actionNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoRawInputData);
      }
    );
  });

  it('validate error when no slack input data', () => {
    delete params.raw_input_data.slack;

    return actionNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoSlackInputData);
      }
    );
  });

  it('validate error when no conversation input data', () => {
    delete params.raw_input_data.conversation;

    return actionNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoConvInputData);
      }
    );
  });

  it('validate error when no slack channel', () => {
    delete params.raw_input_data.slack.event;

    return actionNormForSlack(params).then(
      () => {
        assert(false, 'Action succeeded unexpectedly.');
      },
      error => {
        assert.equal(error.message, errorNoSlackChannel);
      }
    );
  });
});
