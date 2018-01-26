# Deploying with the Conversation connector

The Conversation connector is a set of IBM Cloud Functions components that mediate communication between your Conversation workspace and a Slack or Facebook app, storing session data in a Cloudant database. You can use the connector to quickly deploy your workspace as a chat bot that Slack or Facebook Messenger users can interact with.

For information about how to deploy your workspace using the Conversation connector, see the appropriate README:

- [Deploying a Facebook Messenger app](channels/facebook/README.md)
- [Deploying a Slack app](channels/slack/README.md)

The following sections provide detailed information about the architecture of the Conversation connector.

## Architecture overview

The Conversation connector consists of a set of Node.js functions deployed as Cloud Functions actions. These actions enable users on the channel (Slack or Facebook Messenger) to communicate with a Watson Conversation workspace, and to receive responses. The Conversation connector handles conversion of messages between the Conversation and channel formats, sending messages using REST APIs, and managing conversation context. Each action is fully customizable. Collectively, the series of actions through which a message flows is referred to as the _pipeline_.

This diagram illustrates the default configuration of a Conversation connector deployment.

![Default Pipeline Architecture](readme_images/conv-connector-arch-with-multipost.jpg)

The most basic function of the pipeline is to transfer messages from a channel user to the Conversation workspace and then back again. This basic function is implemented by the following core actions:

- **`receive`**: Receives user input from the channel app.
- **`normalize-<channel>-for-conversation`**: Converts the user input to the Conversation service format.
- **`call-conversation`**: Sends the user input to the Conversation service and receives the response.
- **`normalize-conversation-for-<channel>`**: Converts the response to the channel's native format.
- **`<channel>/post`**: Sends the response to the channel app, which displays the response to the user.

In addition to these core actions, other actions handle support functions, maintain state, and provide extension points for customization, as described below.

### Detailed action descriptions

The Conversation connector functions by exchanging JSON data between Cloud Functions actions. The `receive` action receives the input in the channel's JSON format and passes this JSON data to the next action in the pipeline. Each subsequent action in the pipeline receives JSON data from the previous action, performs its processing (which might include modifying the JSON), and then exits by returning a JSON object. This returned JSON is then passed to the next action in the pipeline, until the user finally receives the response.

The following list provides a detailed description of all of the actions that make up the pipeline. (In the action names, `<channel>` is either `slack` or `facebook`, depending on the type of deployment.)

- **`receive`** is the entry point of a message. This action receives the raw JSON data from the channel, in the channel's native format, and passes it along the pipeline to the next action.
- **`batched_messages`** handles batched Facebook messages. (This action is not included in a Slack deployment.) It sorts incoming messages by user, and then handles each user's messages in parallel. For more information about Facebook's concept of batching messages, see the [Facebook documentation](https://developers.facebook.com/docs/messenger-platform/webhook/).
- **`pre-normalize`** performs any custom preprocessing of the raw message before the normalization step. By default, this action is empty, but you can customize it to modify the input or perform any other actions your bot requires.
- **`normalize-<channel>-for-conversation`** converts the JSON data from the channel's format to the format expected by the Conversation service. This includes exctracting the user utterance text from the channel JSON (`message.text` for Facebook Messenger or `event.text` for Slack), and storing it as `input.text` in the Conversation JSON.
- **`load-context`** loads the most recently stored Conversation context from the Cloudant `contextdb` database. Context is stored separately for each unique user who is interacting with the bot. (In the case of Slack, a single user might have multiple unique conversations with the bot, one through direct messages and one in each channel.) For more information about the Cloudant databases, see [Cloudant databases](#cloudant-databases).
- **`pre-conversation`** performs any custom processing of the Conversation JSON before the input is sent to the Conversation service. By default, this action is empty.
- **`call-conversation`** uses the Conversation Node.js SDK to send the message to the Conversation workspace and receive the Conversation response.
- **`post-conversation`** performs any custom processing of the Conversation response JSON. This is an opportunity to modify the received context before it is saved in the database. By default, this action is empty.
- **`save-context`** saves the Conversation context in the Cloudant `contextdb` database.
- **`normalize-conversation-for-<channel>`** converts the JSON response from the Conversation format to the format expected by the channel. This includes extracting the Conversation response, in text and/or multimedia, and storing it in the appropriate location in the channel JSON. Facebook Messenger and Slack expect different payloads so there's a need to translate the Conversation response to channel-specific format.
- **`multiple_post`** Examines the reply from `normalize-conversation-for-<channel>` and posts one or more replies to the channel as needed.
- **`post-normalization`** performs any final processing of the channel JSON before it is posted to the channel.
- **`post`** posts the output to the channel app.

## Interactive messages

In addition to basic text responses, both Facebook Messenger and Slack support responses that include interactive controls such as buttons and menus. The connector pipeline provides support for channel-specific JSON, which you can use to implement interactive responses. One can add a channel-specific JSON directly inside a dialog node output from within Conversation, or, respond with a channel-agnostic generic response which is normalized to channel-specific format by the `normalize-conversation-for-<channel>` Cloud Function.

*Note: If you are using Slack, make sure you have enabled the interactive message support. For more information, see the Slack deployment [README](channels/slack/README.md#interactive-messages).*

### Via channel-specific JSON

In the Conversation tool, edit the dialog node that you want to return an interactive response. Insert the channel-specific JSON into the `output.<channel>` field.

For example, for Slack, you might use the following JSON to display buttons for selecting a T-shirt size:

```json
{
  "output": {
    "text": {
      "values": [
        "What shirt size would you like?"
      ],
      "selection_policy": "sequential"
    },
    "slack": {
      "text": "What shirt size would you like?",
      "attachments": [
        {
          "actions": [
            {
              "name": "shirt_size_small",
              "text": "Small",
              "type": "button",
              "value": "small"
            },
            {
              "name": "shirt_size_medium",
              "text": "Medium",
              "type": "button",
              "value": "medium"
            },
            {
              "name": "shirt_size_large",
              "text": "Large",
              "type": "button",
              "value": "large"
            }
          ],
          "fallback": "Sorry! We cannot support buttons at the moment. Please type in: small, medium, or large.",
          "callback_id": "shirt_size"
        }
      ]
    }
  }
}
```
The connector will include this data in the `attachment` property of the Slack JSON, and Slack will show the user the buttons they can click on in the client. (For more information, see Slack's [message attachment's documentation](https://api.slack.com/docs/message-attachments).)

For Facebook Messenger, the approach is the same, but the JSON details differ:

```json
  "output": {
    "facebook": {
      "message": {
        "text": "Which size would you like?",
        "quick_replies": [
          {
            "title": "Small",
            "payload": "small",
            "content_type": "text"
          },
          {
            "title": "Medium",
            "payload": "medium",
            "content_type": "text"
          },
          {
            "title": "Large",
            "payload": "large",
            "content_type": "text"
          }
        ]
      }
    }
  }
```

For more information, see [Facebook's message template pages](https://developers.facebook.com/docs/messenger-platform/send-messages/templates).

### Via channel-agnostic generic JSON

There is now in-built support for translating generic multi-modal responses from Conversation to a channel-specific format.
The `normalize-conversation-for-<channel>` action is responsible for the bulk of the translation.
Here's a sample Conversation output JSON containing an array of generic responses in text, image and options:

```json
{
  "output": {
    "generic":[
      {
        "response_type": "text",
        "text": "Here are your nearest stores."
      },
      {
        "response_type": "image",
        "source": "http://...",
        "title": "Image title",
        "description": "Some description for the image"
      },
      {
        "response_type": "option",
        "title": "Click on one of the following",
        "options": [
          {
            "label": "Location 1",
            "value:" "Location 1"
          },
          {
            "label": "Location 2",
            "value:" "Location 2"
          },
          {
            "label": "Location 3",
            "value:" "Location 3"
          }
        ]
      }
    ]
  }
}
```

**Slack**
The generic response array is translated to a *single* message in Slack comprising of text alongwith attachment data. For the above example, the equivalent Slack message after translation is as follows:

```json
{
  "text": "Here are your nearest stores.",
  "attachments": [
    {
      "image_url": "http://...",
      "pretext": "Some description for the image",
      "title": "Image title"
    },
    {
      "actions": [
        {
          "name": "Location 1",
          "text": "Location 1",
          "type": "button",
          "value": "Location 1"
        },
        {
          "name": "Location 2",
          "text": "Location 2",
          "type": "button",
          "value": "Location 2"
        },
        {
          "name": "Location 3",
          "text": "Location 3",
          "type": "button",
          "value": "Location 3"
        }
      ],
      "callback_id": "Click on one of the following",
      "text": "Click on one of the following"
    }
  ],
  "channel": "DXXXXXXXX",
  "ts": "XXXXXXXXXX.XXXXXX"
}
}
```
**Facebook**
The generic response array is translated to a *list of Facebook messages payloads* comprising of text along with attachment data. For the above example, the equivalent message list after translation is as follows:

```json
[
  {
    "text": "Here are your nearest stores."
  },
  {
    "attachment": {
      "type": "image",
      "payload": {
        "url": "http://..."
      }
    }
  },
  {
    "text": "Click on one of the following",
    "quick_replies": [
      {
        "content_type": "text",
        "title": "Location 1",
        "payload": "Location 1"
      },
      {
        "content_type": "text",
        "title": "Location 2",
        "payload": "Location 2"
      },
      {
        "content_type": "text",
        "title": "Location 3",
        "payload": "Location 3"
      }
    ]
  }
]
```
In case Facebook is the channel in question, the output of `normalize-conversation-for-<channel>` is sent to `multiple_post` which splits the array into individual Facebook messages and invokes a `sub-pipeline` comprising of `starter-code/post-normalize` and `facebook/post` functions. Each message is separately passed through this subpipeline. Hence, a multi-modal response from Conversation is broken down into individual messages and POSTed to Facebook messenger.

Additionally, Facebook only allows upto 11 elements in a quick reply array. So, if the options list in the Conversation response has over 11 options, it's translated to the [Facebook generic template](https://developers.facebook.com/docs/messenger-platform/send-messages/template/generic) format with buttons in groups of three.

*Note: Since multiple messages(coming from one Conversation response) will be fired off in quick succession, they may appear out of order if there's some delay in delivery or, Facebook servers are slow.*

## Customizing the pipeline

The entire Conversation connector framework is customizable. The easiest way to add functions to the pipeline is to add your custom code to the stub functions that are provided for this purpose (`pre-normalize`, `pre-conversation`, `post-conversation`, and `post-normalize`). For example,if the Conversation service detects that a user is asking about an account balance (as indicated by a returned intent), you could modify the `post-conversation` action to make a database call to retrieve the balance and then modify the response before it is posted to the channel.

For more extensive customization, you might want to add, remove, or change code in other pipeline actions. For more information about editing Cloud Functions actions, see [the Cloud Functions documentation](https://console.bluemix.net/docs/openwhisk/openwhisk_actions.html#openwhisk_actions).

To browse and edit the deployed actions, use the [Cloud Functions editor](https://console.bluemix.net/openwhisk/manage/actions?env_id=ibm:yp:us-south). The actions are deployed in several Cloud Functions packages, as follows:

- `slack` package (Slack deployments only):
    - `receive`
    - `post`
- `facebook` package (Facebook deployments only):
    - `receive`
    - `batched_messages`
    - `post`
    - `multiple_post`
- `starter-code` package:
    - `pre-normalize`
    - `normalize-slack-for-conversation` (Slack deployments only)
    - `normalize-facebook-for-conversation` (Facebook deployments only)
    - `pre-conversation`
    - `post-conversation`
    - `normalize-conversation-for-slack` (Slack deployments only)
    - `normalize-conversation-for-facebook` (Facebook deployments only)
    - `post-normalization`
- `context` package:
    - `load-context`
    - `save-context`
- `conversation` package:
    - `call-conversation`

The actual names of the deployed actions are as follows:
    `<deployment_name>_<package_name>/<action_name>`
where `<deployment_name>` is the deployment name you specify during deployment. For example, if you have a Slack deployment called `MyDeployment`, you would see the `receive` action listed as `MyDeployment_slack/receive`.

## Cloudant databases

In addition to the Cloud Functions actions, the deployment creates two Cloudant databases that support the connector. These databases are created using the Cloudant service instance created in the specified IBM Cloud organization and space during the deployment process. (If you deploy multiple Conversation connectors for different workspaces or channels, the same Cloudant service instance and databases are used for all of them.)

- **`authdb`**: Used to store authentication information. This database contains a separate authentication document for each deployment, storing the authentication information for a particular Conversation workspace and channel app. This information consists of Conversation service credentials and channel tokens, which the Conversation connector uses when communicating with the Conversation service and with the channel. Each document in the `authdb` database is associated with a particular deployment using a UUID that is generated during the deployment process.

    The appropriate Cloudant URL, database name, and authorization key are stored in an annotation on each Cloud Functions package that needs to access the database. The actions in the package use the information in these annotations to retrieve the correct document from the `authdb` database.

- **`contextdb`**: Used to store the most recent Conversation dialog context returned from the workspace. The `save-context` action stores the context JSON in the database after each Conversation response, and the `load-context` action loads it from the database before the next user message is sent. For more information about what the context can contain, see the [Conversation documentation](https://console.bluemix.net/docs/services/conversation/dialog-build.html#context).

    As with the `authdb` database, Cloud Functions package annotations are used to store the Cloudant url for accessing the database.

For more information about how the Cloud Functions actions interact with Cloudant, see the [Node SDK for Cloudant](https://github.com/cloudant/nodejs-cloudant). For more information about the underlying Cloudant REST APIs, see the [Cloudant documentation](https://docs.cloudant.com/document.html).

## Troubleshooting

If you are having trouble with the deployment process or with a deployed bot, the following information may help you get things running properly.

### Deployment troubleshooting

Errors may occur during the deployment process (either UI-based or manual) for various reasons. The following are some of the most common:

- Unsupported IBM Cloud regions

When deploying the Conversation connector, make sure you do not specify any IBM Cloud region other than US South, as this is currently the only supported region. (If you are deploying for Slack using the Conversation tool, US South is automatically used.) Your Conversation service instance must also be in the US South region.

- Lack of Cloud Functions privileges

In order to successfully deploy all assets, especially the Cloudant database, you must have developer permissions (or higher) for the IBM Cloud Functions space you are deploying to.

- Not enough IBM Cloud service instances available

Deployment requires a Cloudant NoSQL Lite instance named `conversation-connector`. If this service instance does not already exist, and there are not enough free service slots in the user's IBM Cloud account to create it, the deployment fails. If this happens, try a different IBM Cloud account, or remove some unnecessary service instances, so at least one unused slot is available.

- Invalid keys or credentials

During the deployment process, you specify credentials and keys used to access the Conversation workspace and the channel app. If this information is entered incorrectly, unpredictable results can occur both during deploy and at run time. If you are not sure whether the credentials you provided are correct, the best solution is to start over with a new deployment. If you use the same deployment name, the new deployment will overwrite the previous deployment, which might fix the problem.

- Manual deployment errors

If you are running the deployment manually using command-line tools, make sure you have installed the most current versions of the prerequisite software:

- The [Cloud Foundry command-line interface](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)
- The [Node.js runtime](https://nodejs.org/), including the npm package manager
- The IBM Cloud Functions [wsk tool](https://console.ng.bluemix.net/openwhisk/learn/cli) (scroll down to **Looking for the wsk CLI?**)

### Dependency Troubleshooting

The Conversation connector depends on IBM Cloudant as well as IBM Cloud Functions. Although both of these products should function properly using the default settings, you might run into problems if any configuration changes are made.

For information about these products, see the [Cloud Functions documentation](https://console.bluemix.net/docs/openwhisk/index.html#getting-started-with-openwhisk) and the [IBM Cloudant documentation](https://console.bluemix.net/docs/services/Cloudant/cloudant.html#overview).
