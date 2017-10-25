# Watson Cloud Functions Deploy Directory

This directory contains scripts and actions used to implement the automated Conversation connector deployment. If you want to implement your own deployment process, you can use this code as an example.

If you just want to deploy an instance of the Conversation connector, see the [main README](../README.md).

## Setup

To set up artifacts in this directory, return to the root directory and run `./setup.sh -n`. The `-n` flag will create OpenWhisk actions in this directory into your namespace. Note that these artifacts will be updated in your namespace but without a deployment name, as `-n` will ignore deployment names.

## Architecture

Artifact deployment is split into 4 different endpoints: `check-deploy-exists`, `populate-actions`, `verify-${channel}`, and `${channel}/deploy`.

### check-deploy-exists

This action accepts a Bluemix access token, an OpenWhisk namespace, and a deployment name. It returns whether the deployment already exists in the user's OpenWhisk namespace. The user's OpenWhisk instance is determined by the Bluemix token as well as the OpenWhisk namespace sting provided.

The inputs to this action look like so:

```
{
  state: {
    auth: {
      access_token: 'my_bluemix_access_token',
      refresh_token: 'my_bluemix_refresh_token'
    },
    wsk: {
      namespace: 'myorganization_myspace'
    },
    name: 'my_deployment_name'
  }
}
```

The output is a JSON object containing the status `code` as well as a success or error `message`.

### populate-actions

This action provides to the user all non-channel related artifacts, and uploads them onto the user's Bluemix or OpenWhisk accounts. This will create the following:
   * **Bluemix**: CloudantNoSQLDB (Lite/Free Plan) service instance; within this instance:
      * *contextdb* Context database
      * *authdb* Authentications database; within this database:
         * a single document storing the authentication keys of the current deployment
   * **OpenWhisk action**: ${deployment-name}_starter-code/pre-normalize
   * **OpenWhisk action**: ${deployment-name}_context/load-context
   * **OpenWhisk action**: ${deployment-name}_starter-code/pre-conversation
   * **OpenWhisk action**: ${deployment-name}_conversation/call-conversation
   * **OpenWhisk action**: ${deployment-name}_starter-code/post-conversation
   * **OpenWhisk action**: ${deployment-name}_context/save-context
   * **OpenWhisk action**: ${deployment-name}_starter-code/post-normalize

The `${deployment-name}` is the name of the deployment specified by the input parameters.

The inputs to this action look like so:

```
{
  state: {
    auth: {
      access_token: 'my_bluemix_access_token',
      refresh_token: 'my_bluemix_refresh_token'
    },
    wsk: {
      namespace: 'myorganization_myspace'
    },
    conversation: {
      guid: 'my_conversation_service_guid',
      workspace_id: 'my_conversation_service_workspace_id'
    },
    name: 'my_deployment_name'
  }
}
```

The output is a JSON object containing the status `code` as well as a success or error `message`.

### verify-${channel}

This action provides to the user all channel-specific artifacts, and uploads them onto the user's Bluemix or OpenWhisk accounts. This will create or modify the following:
   * **Bluemix**: inside the previously created CloudantNoSQLDB *authdb* database, the same document will be updatead to include the channel-specific credentials, such as authentication keys or access tokens
   * **OpenWhisk action**: ${deployment-name}_${channel}/deploy
   * **OpenWhisk action**: ${deployment-name}_${channel}/receive
   * **OpenWhisk action**: ${deployment-name}_starter-code/normalize-${channel}-for-conversation
   * **OpenWhisk action**: ${deployment-name}_starter-code/normalize-conversation-for-${channel}
   * **OpenWhisk action**: ${deployment-name}_${channel}/post

The `${deployment-name}` is the name of the deployment specified by the input parameters.
The `${channel}` is determined by the exactly version of `verify-${channel}` action invoked.

The inputs to this action look like so:

```
{
  state: {
    auth: {
      access_token: 'my_bluemix_access_token',
      refresh_token: 'my_bluemix_refresh_token'
    },
    wsk: {
      namespace: 'myorganization_myspace'
    },
    conversation: {
      guid: 'my_conversation_service_guid',
      workspace_id: 'my_conversation_service_workspace_id'
    },
    ${channel}: {
      /* all channel's authentication keys go in here */
    }.
    name: 'my_deployment_name'
  }
}
```
The ouputs of this action look like so:

```
{
  code: 200,
  message: 'OK',
  request_url: 'https://some_request_url.com',
  redirect_url: 'https://some_redirect_url.com',
  authorize_url: 'https://some_redirect_url.com'
}
```

The Request URL, or Webhook URL, is used by channel or chat service to send its received messages to. \
The Redirect URL is the URL the chat server redirects to after the user agrees to authenticate during the OAuth process. \
The Authorize URL is the URL the user needs to go to in order to start the OAuth process. If you have a UI with a button that starts the OAuth process, use this URL for your "Authorize ${channel}" button.

### ${channel}/deploy

After your user goes through the OAuth process, the chat service's server will automatically invoke this action. You will automatically receive a status `code` and `message` depicting success or error.
