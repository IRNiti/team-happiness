# team-happiness

Slack app connected to hackweekfy22q2.slack.com workspace and intended to be used to match users who join the team-happiness channel to meet for 1-1s. Other functionality includes allowing users to enter their birthdays when joining the birthdays channel and storing it in a csv. Functionality still in progress would be to schedule a job to post a message on someone's birthday to wish them happy birthday.

In order to connect the app to the workspace, replace the following attributes in app.js with values found at https://api.slack.com/apps/A02US5KKPMG/general

- app.token: OAuth & Permissions/OAuth Tokens for Your Workspace/Bot User OAuth Token
- app.signingSecret: Basic Information/App Credentials/Signing Secret
- app.appToken: Basic Information/App-Level Tokens/happines_socket/Token

Install dependencies with npm install and then run the app using node app.js
