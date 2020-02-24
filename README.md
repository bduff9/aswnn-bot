# Official ASWNN Slack Bot

Author: Brian Duffey <Brian.E.Duffey@gmail.com>

## Setting up Slack Bot

1. Set up app by following [Slack's instructions](https://api.slack.com/bot-users)
    1. NOTE: You will not have the App URL until after deploying the app below.
    1. NOTE: Write down the Verification token and the Bot User OAuth Access Token as you will need them to deploy

## Deploying

### First time

1. Add 2 SSM variables
    1. /aswnn-bot/token - Bot's OAuth token
    1. /aswnn-bot/verification_token - App's verification token
1. Get AWS credentials to deploy Serverless with
1. Run `sls deploy` to deploy changes

### CI/CD

TODO: setup Github actions for CI/CD based on old bitbucket-pipelines.yml
