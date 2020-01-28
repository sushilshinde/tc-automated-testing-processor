# Topcoder Marathon Match processor

Abstract MM Scorer, that can be used for any new MM challenges

## Deployment

The deployment steps that follow describe deployment of this processor locally and manually. To automatically deploy to AWS EC2, refer to the [Gitlab CI / CD Setup](#gitlab-ci-/-cd-setup) section below.

### Clone this repository

Clone this repository and copy the source code to your local sytem

### Update the Dockerfile

For the Marathon Match contest, you will update the Dockerfile as needed. After updating,

1. Build image
   > `docker build -t topcoder/<IMAGE NAME>:<IMAGE_VERSION> -f Dockerfile .`
2. Tag the image as `latest`
   > `docker tag topcoder/<IMAGE NAME>:<IMAGE_VERSION> topcoder/<IMAGE NAME>:latest`
3. Push docker image to `topcoder` dockerhub account
   > `docker push topcoder/<IMAGE NAME>:latest`

### Wire Up Scorer with TC Platform

1. Update following environment variables in `ecosystem.config.js` file as per new challenge:
   - DOCKER_IMAGE_NAME
   - EXECUTION_COMMAND
   - CHALLENGE_ID
   - REVIEW_TYPE_NAME
   - REVIEWER_ID_NAMESPACE

### Start MM Processor

After updating the environment variables, you will start the processor by:

1. Install `pm2` module to keep the processor running, even when you exit the console
   > `sudo npm install pm2 -g`
2. Install node dependencies
   > `npm install`
3. Start processor
   > `pm2 start`

## Gitlab CI / CD Setup

The project also contains the files necessary for auto deployment of the processor to Amazon S3.
Follow the steps mentioned below.

### Prerequisite

- Setup your own gitlab CI runner before you start. [Reference](https://docs.gitlab.com/runner/#install-gitlab-runner). Our deployment uses the runner that you have configured. Note that we are not using shared runners, so the gitlab runner that you set up should have the same registration token as the one that you will be using when deploying the assets (this will come up below)

### Setup

1. Create a Personal Access token on Gitlab. After you login to Gitlab, in the top right, click your profile picture and select `Settings` from the dropdown
2. In the left sidebar, click on Access Tokens
3. Enter a `Name` and select `api` and `write_repository` scopes. Generate the token and make a note of the token
4. Disable shared runners. In the repository that contains the source code for the processor (most likely the repository where you are reading this README), go the Settings -> CI / CD. Expand the `Runners` section and click on Disable shared Runners in the `Shared Runners` section.
5. Make a note of the registration token in the _Set up a specific Runner manually_ section.
6. Ensure that you have a dockerhub account. Create a repository in dockerhub with the name same as the name of the repository in gitlab.
7. Create the AWS Cloudformation stack using SAM. At this step, pause and refer to the `README.md` file in the `aws` folder. Once you are done following the steps in that document, come back and resume.
8. Set up the following variables in your project. In your repository in gitalb, go to Settings -> CI / CD. Expand the Variables section and create the following:

| Type     | Key                    | Value                                                               |
| -------- | ---------------------- | ------------------------------------------------------------------- |
| Variable | DOCKER_HUB_ACCOUNT     | _Your dockerhub account id_                                         |
| Variable | DOCKER_HUB_PASSWORD    | _Your dockerhub account password_                                   |
| Variable | PULL_CODE_API_ENDPOINT | _The API Gateway URL OutputValue you received after SAM deployment_ |
| Variable | ACCESS_TOKEN           | _Your gitlab personal access token_                                 |

### Trigger

1. The pipeline will trigger only on the `develop` branch. You can change this in the `.gitlab-ci.yml` file
2. Now, when a new Marathon Match comes in, all you need to do is to update the Dockerfile with the steps relevant for that contest and commit your changes.
   Push the changes to gitlab (`develop` branch). If configured correctly, you should see the source code copied over to Amazon S3 after some time.
3. Once the source code is uploaded to S3, CodePipeline will start to build and deploy the code to the EC2 instance. You can login to AWS console and check the pipeline. All steps should be successful.
4. Due to some missing component in the source code, the application cannot actually start, so there is no way to verify the application. But you can try to login to the EC2 instance and check through pm2.
5. To login to the EC2 instance, you need to uncomment SecurityGroupIngress section from AppSecurityGroup, and uncomment KeyName from DeploymentInstance and put a valid key pair name. Then you can login to the EC2 instance using the key pair and run `pm2 status`.
