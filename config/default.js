/**
 * The configuration file.
 */
const fs = require('fs')

function fileIfExists (path) {
  return fs.existsSync(path) ? path : null
}

module.exports = {
  DISABLE_LOGGING: process.env.DISABLE_LOGGING ? Boolean(process.env.DISABLE_LOGGING) : false,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,

  // AWS options
  aws: {
    AWS_REGION: process.env.AWS_REGION, // AWS Region to be used by the application
    S3_BUCKET: process.env.S3_BUCKET // S3 Bucket to which test results need to be uploaded
  },

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT || fileIfExists('./kafkadev.cert'),
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY || fileIfExists('./kafkadev.key'),
  GROUP_CONSUMER_NAME: process.env.GROUP_CONSUMER_NAME,

  // Kafka topics to listen to
  KAFKA_AGGREGATE_SUBMISSION_TOPIC: process.env.KAFKA_NEW_SUBMISSION_TOPIC || 'submission.notification.aggregate',
  KAFKA_NEW_SUBMISSION_TOPIC: process.env.KAFKA_NEW_SUBMISSION_TOPIC || 'submission.notification.create',
  KAFKA_UPDATE_SUBMISSION_TOPIC: process.env.KAFKA_UPDATE_SUBMISSION_TOPIC || 'submission.notification.update',
  KAFKA_SUBMISSION_SCORE_TOPIC: process.env.KAFKA_SUBMISSION_SCORE_TOPIC || 'submission.notification.score',

  AV_SCAN_REVIEW_NAME: process.env.AV_SCAN_REVIEW_NAME || 'Virus Scan',

  // OAUTH details
  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  // API endpoints
  SUBMISSION_API_URL: process.env.SUBMISSION_API_URL || 'https://api.topcoder-dev.com/v5',
  CHALLENGE_API_URL: process.env.CHALLENGE_API_URL || 'https://api.topcoder-dev.com/v3',

  // Review options
  REVIEW_TYPE_NAME: process.env.REVIEW_TYPE_NAME || 'MMScorer',
  REVIEW_SCORECARD_ID: process.env.REVIEW_SCORECARD_ID || '30001852',

  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5/bus/events',
  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',

  CHALLENGE_ID: process.env.CHALLENGE_ID ? Number(process.env.CHALLENGE_ID) : 30054682,
  PROVISIONAL_TESTING_TIMEOUT: process.env.PROVISIONAL_TESTING_TIMEOUT ? Number(process.env.PROVISIONAL_TESTING_TIMEOUT) : 2 * 60 * 60 * 1000, // 2 Hours
  FINAL_ESTING_TIMEOUT: process.env.FINAL_ESTING_TIMEOUT ? Number(process.env.FINAL_ESTING_TIMEOUT) : 2 * 60 * 60 * 1000, // 2 Hours

  PROVISIONAL_TESTER_COMMAND: (process.env.TESTER_COMMAND &&
    process.env.TESTER_COMMAND.split(',')) || [
    'java',
    '-jar',
    '/scorer/tester.jar,/workdir/truth/truth-final.txt,/workdir/solution/solution.csv'
  ],

  FINAL_TESTER_COMMAND: (process.env.TESTER_COMMAND &&
    process.env.TESTER_COMMAND.split(',')) || [
    'java',
    '-jar',
    '/scorer/tester.jar,/workdir/truth/truth-final.txt,/workdir/solution/solution.csv'
  ],

  PROVISIONAL_SOLUTION_COMMAND: (process.env.SOLUTION_COMMAND &&
    process.env.SOLUTION_COMMAND.split(',')) || [
    '/bin/sh',
    '-c',
    '/work/test.sh /data /workdir/solution/solution.csv'
  ],

  FINAL_SOLUTION_COMMAND: (process.env.SOLUTION_COMMAND &&
    process.env.SOLUTION_COMMAND.split(',')) || [
    '/bin/sh',
    '-c',
    '/work/test.sh /data /workdir/solution/solution.csv'
  ],

  DOCKER_IMAGE_NAME: process.env.DOCKER_IMAGE_NAME || 'ubuntu:latest',
  DOCKER_MOUNT_PATH:
    process.env.DOCKER_MOUNT_PATH || '`${submissionPath}:/workdir`',
  CUSTOM_RUN_COMMAND: process.env.CUSTOM_RUN_COMMAND
}
