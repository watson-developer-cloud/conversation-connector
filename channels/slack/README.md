# Deploying a Slack app

You can use either of two methods to deploy your workspace to a Slack app:

- Use the [Watson Assistant tool](https://console.bluemix.net/docs/services/conversation/conversation-connector.html#deploying-to-slack-using-the-watson-assistant-tool) if you want to quickly deploy your app with just a few clicks.

- Use [manual deployment](#manual-deployment) if you want to deploy your app by modifying configuration files and running scripts. You might want to use this method if you are customizing the Conversation connector, or if you need to repair or update components of an existing deployment.

**Note:** This process is intended to connect an existing Watson Assistant workspace to a Slack app. If you have not yet built a workspace, you must do so first. For more information, see the [Watson Assistant documentation](https://console.bluemix.net/docs/services/conversation/index.html).

## Manual deployment

**Note:** This process is supported only on Linux/UNIX and macOS systems.

1.  Clone or download this GitHub repository to your local file system.

1.  If you have not done so already, install the following prerequisite software:

    - The [Cloud Foundry command-line interface](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)
    - The [Node.js runtime](https://nodejs.org/), including the npm package manager

1.  Log in using the following command:

    `cf login -a https://api.ng.bluemix.net/`

    Select the IBM Cloud organization and space where you want to deploy.

    **Note:** Currently, only the US South region is supported.

1.  Go to https://console.ng.bluemix.net/openwhisk/learn/cli and then do the following:

    1.  Click the account information in the upper right corner, and confirm that the organization and space shown are correct.

    1.  Scroll down and click on **Looking for the wsk CLI?**?

    1.  If you have not done so already, follow the instructions to install the wsk CLI.

    1.  Copy the command in step 2 ("Target a Region and Namespace"), and run it in your CLI.

1.  Go to [https://slack.com](https://slack.com) and make sure you are signed in to the Slack workspace where you want to deploy your bot.

1.  Go to [https://api.slack.com/apps/](https://api.slack.com/apps/). Sign in with your Slack credentials if necessary.

1.  Click **Create an App**.

1.  Specify an app name, select a development Slack workspace, and then click **Create App**.

    **Note:** If you have already created the app you want to use, select it from the **Your Apps** list.

1.  In the navigation menu, click **Bot Users**.

1.  On the Bot User page, click **Add a Bot User**. Verify the display name and bot username, and then toggle **Always Show My Bot as Online** to **On**. Click **Add Bot User** and then **Save Changes**.

1.  Click **Event Subscriptions**. Toggle the **Enable Events** switch to **On**.

1.  Scroll down to **Subscribe to Bot Events** and click **Add Bot User Event**. You must select at least one event. For most bots, the following events are good choices:

    - `message.im`
    - `message.channels`
    - `message.mpim`
    - `message.groups`

    Click **Save Changes**.

1.  Click **Basic Information** and scroll down to **App Credentials**.

1.  In the root directory of your local copy of the repository, edit the `providers.json` file.

1.  On the Slack page, copy the client ID, client secret, and verification token, and paste them into the corresponding fields in the `slack` object in the `providers.json` file.

1.  In `providers.json`, make sure the channel `name` is set to `slack`.

1.  In `providers.json`, edit the pipeline `name` to specify a name for your deployment. This name will help you find your Cloud Functions assets later. Only alphanumeric characters (A-Z and 0-9) are kept.

1.  In `providers.json`, edit the `conversation` object to specify the username, password, and workspace ID of the workspace you are deploying. Save the changes to the file.

1.  Run `npm install`.

1.  Run `./setup.sh`. This creates the required Cloud Functions packages in your Cloud Functions space.

    **Note:** If you are not already signed in to your Slack workspace, you will be redirected to the sign-in page so you can enter your Slack workspace credentials. If this happens, you must run the `setup.sh` script again after you sign in.

1.  When the script pauses, copy the generated Slack redirect URL from the terminal window (look for a message that begins `Your Slack Redirect URL is:`. Leave the script paused for now.

1.  In the Slack app settings in your browser, click **OAuth & Permissions**.

1.  Under **Redirect URLs**, click **Add a new Redirect URL**, and paste in the redirect URL you copied from the terminal window. Click **Save URLs**.

1.  Go back to the terminal window and copy the request URL (look for a message that begins `Your Request URL is:`). If you need to find the endpoint URL later, follow these steps:

    1.  Go to https://console.ng.bluemix.net/openwhisk/editor.

    1.  Under **My Actions**,  click <pipeline_name>_slack/receive>.

    1.  Click **View Action Details**.

    1.  Confirm that **Enable as Web Action** is selected. Copy the URL from the **Web Action URL**.

1.  In the Slack app settings, click **Event Subscriptions**.

1.  Under **Enable Events**, paste in the request URL you copied from the terminal window. Toggle the switch at the top to **On**. After Slack has verified the URL, click **Save Changes**.

1.  **Optional:** If you want to enable interactive components, click **Interactive Components**, and then click **Enable Interactive Components**. In the **Request URL** field, paste the same request URL you specified in the previous step, and then click **Enable Interactive Components**.

1.  Go back to the terminal window and press Enter to resume the script.

1.  When prompted in your browser, sign in to your Slack workspace and authorize the app.

That's it. You're all set. You can now go to your Slack team and talk to your bot!