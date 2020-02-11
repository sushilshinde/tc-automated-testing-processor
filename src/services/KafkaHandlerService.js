/**
 * Service for Kafka handler.
 */
const _ = require('lodash')
const config = require('config')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const helper = require('../common/helper')
const logger = require('../common/logger')

const { performCodeTest } = require('./CodeTesterService')
const ReviewProducerService = require('./ReviewProducerService')
const reviewProducer = new ReviewProducerService(config)

const testConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/phase-config.json')))
// Only 1 phase for now
const testPhase = 'system'

/**
 * Handle Kafka message.
 * @param {Object} message the Kafka message in JSON format
 */
async function handle (message) {
  let reviewObject
  let result

  logger.info(`Kafka message: ${JSON.stringify(message, null, 2)}`)

  const avScanReviewTypeId = await helper.getReviewTypeId(config.AV_SCAN_REVIEW_NAME)

  const resource = _.get(message, 'payload.resource', '')
  const typeId = _.get(message, 'payload.typeId', '')
  const reviewScore = _.get(message, 'payload.score', '')

  if (!(resource === 'review' && typeId === avScanReviewTypeId)) {
    logger.info(
      `Message is not an anti virus scan review. Message is thus ignored: ${resource} / ${typeId}`
    )
    return
  }

  const submissionId = _.get(message, 'payload.submissionId', '')
  if (!submissionId) {
    throw new Error('No submission id present in event. Cannot proceed.')
  }

  // Check if AV scan successful
  if (reviewScore !== 100) {
    logger.info(
      `Review indicates that submission failed anti virus checks. Message is thus ignored: ${submissionId} / ${reviewScore}`
    )
    return
  }

  // Get the submission by submission id
  logger.info(`Fetch submission using ${submissionId}`)
  const submission = await helper.getSubmission(submissionId)

  // Extract `challengeId from the submission object
  const challengeId = _.get(submission, 'challengeId')

  // Check if the contest associated with the submission is relevant
  const challengeDetails = await helper.getChallenge(challengeId)
  const platforms = challengeDetails.platforms
  const codeRepo = challengeDetails.codeRepo

  if (!platforms.includes(config.CHALLENGE_PLATFORM)) {
    logger.info(`Ignoring message as challenge with id - ${challengeId} is not of platform ${config.CHALLENGE_PLATFORM}`)
    return
  }

  // Clone the test specifications
  await helper.cloneSpecAndTests(submissionId, codeRepo)

  try {
    // Create `review` with `status = queued` for the submission
    reviewObject = await reviewProducer.createReview(submissionId, null, 'queued', { testType: testPhase })

    // Download submission
    const submissionPath = await helper.downloadAndUnzipFile(submissionId)

    // Detect which language the submission is in
    const solutionLanguage = helper.detectSolutionLanguage(`${submissionPath}/submission/code/src`)

    logger.info(`Detected solution language: ${solutionLanguage}`)

    if (!fs.existsSync(`${submissionPath}/submission/artifacts/private`)) {
      logger.info('creating private artifact dir')
      await fs.mkdirSync(`${submissionPath}/submission/artifacts/private`, { recursive: true })
    }

    if (!fs.existsSync(`${submissionPath}/submission/artifacts/public`)) {
      logger.info('creating public artifact dir')
      await fs.mkdirSync(`${submissionPath}/submission/artifacts/public`, { recursive: true })
    }

    // Initiate `execution` and `error` logs
    logger.addFileTransports(path.join(__dirname, '../../submissions/', submissionId, 'submission/artifacts/public'), submissionId)

    const testType = testConfig[testPhase].testType
    logger.info(`Processing the submission ${submissionId} / phase: ${testPhase} / type: ${testType}`)

    let score = 0

    const customCodeRun = testConfig[testPhase].customCodeRun
    const gpuFlag = testConfig[testPhase].gpuFlag

    if (!fs.existsSync(`${submissionPath}/submission/code`)) {
      logger.error(`Wrong folder structure detected, missing "code" folder for ${submissionId}.`)
      throw new Error(`Wrong folder structure detected, missing "code" folder for ${submissionId}.`)
    }

    logger.info(`Started executing CODE type of submission for ${submissionId} | ${submissionPath}`)
    await performCodeTest(challengeId, submissionId, submissionPath, customCodeRun, testPhase, gpuFlag, solutionLanguage)

    const resultFilePath = path.join(`${submissionPath}/submission/artifacts/public/json-report`, 'result.json')

    if (fs.existsSync(resultFilePath)) {
      const resultFile = fs.readFileSync(resultFilePath, 'utf-8')
      result = JSON.parse(resultFile)
      score = result.executionStatus === 'passed' ? 100 : 0
    } else {
      throw new Error('No result file available. Cannot determine score')
    }

    // TODO - Use helper once we decide about the private metadata
    // TODO - for now, we set it directly in the next statement
    // const metadata = await helper.prepareMetaData(submissionPath, testPhase)
    const metadata = {
      testType: testPhase,
      public: JSON.stringify(result),
      private: 'this is a private message'
    }

    logger.info(`Create Review for ${submissionId} with Score = ${score}`)
    await reviewProducer.createReview(submissionId, score, 'completed', metadata, reviewObject)
  } catch (error) {
    logger.logFullError(error)
    logger.info('Create Review with Negative Score')
    await reviewProducer.createReview(submissionId, -1, 'completed', { testType: testPhase }, reviewObject)
  } finally {
    const filePath = path.join(__dirname, '../../submissions', submissionId)

    logger.info(`Uploading artifacts for ${submissionId}`)
    await helper.zipAndUploadArtifact(filePath, submissionId, testPhase)

    rimraf.sync(`${filePath}`)
    logger.info(`Process complete for submission: ${submissionId}`)
    logger.resetTransports()
  }
}

// Exports
module.exports = {
  handle
}

logger.buildService(module.exports)
