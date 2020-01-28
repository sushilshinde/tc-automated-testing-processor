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

const { performDataTest } = require('./DataTesterService')
const { performCodeTest } = require('./CodeTesterService')
const ReviewProducerService = require('./ReviewProducerService')
const reviewProducer = new ReviewProducerService(config)

/**
 * Handle Kafka message.
 * @param {Object} message the Kafka message in JSON format
 */
async function handle (message) {
  let reviewObject

  logger.info(`Kafka message: ${JSON.stringify(message, null, 2)}`)

  const avScanReviewTypeId = await helper.getReviewTypeId(config.AV_SCAN_REVIEW_NAME)

  const targetedChallenge = config.CHALLENGE_ID

  const resource = _.get(message, 'payload.resource', '')
  const typeId = _.get(message, 'payload.typeId', '')
  const reviewScore = _.get(message, 'payload.score', '')
  const testPhase = _.get(message, 'payload.testType', 'provisional')

  if (!(resource === 'review' && typeId === avScanReviewTypeId) && !(resource === 'score')) {
    logger.info(
      `Message payload resource or typeId is not of interest, the message is ignored: ${_.get(
        message,
        'payload.resource',
        ''
      )} / ${_.get(message, 'payload.typeId', '')}`
    )
    return
  }

  const submissionId = _.get(message, 'payload.submissionId', '')
  if (!submissionId) {
    throw new Error('No submission id present in event. Cannot proceed.')
  }

  // Check if AV scan successful
  if (resource === 'review' && typeId === avScanReviewTypeId && reviewScore !== 100) {
    throw new Error(
      `AV Scan has not succeeded for submission ${submissionId}, score: ${reviewScore}`
    )
  }

  try {
    // Get the submission by submission id
    logger.info(`Fetch submission using ${submissionId}`)
    const submission = await helper.getSubmission(submissionId)

    // Extract `challengeId from the submission object
    const challengeId = _.get(submission, 'challengeId')
    logger.info(`Fetch challengeId from submission ${challengeId}`)

    // Check for expected challengeId
    if (!challengeId || challengeId !== targetedChallenge) {
      logger.info(`Ignoring message as challengeId - ${challengeId} is not of interest`)
      return
    }

    // Create `review` with `status = queued` for the submission
    if (testPhase !== 'system') {
      reviewObject = await reviewProducer.createReview(submissionId, null, 'queued', { testType: testPhase })
    }

    const testConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/phase-config.json')))

    // Download submission
    const submissionPath = await helper.downloadAndUnzipFile(submissionId)

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

    if (testType === 'code') {
      if (!fs.existsSync(`${submissionPath}/submission/code`)) {
        logger.error(`Wrong folder structure detectd, missing "code" folder for ${submissionId}.`)
        throw new Error(`Wrong folder structure detectd, missing "code" folder for ${submissionId}.`)
      }

      logger.info(`Started executing CODE type of submission for ${submissionId} | ${submissionPath}`)
      await performCodeTest(challengeId, submissionId, submissionPath, customCodeRun, testPhase, gpuFlag)
    }

    if (customCodeRun !== 'true' && !fs.existsSync(`${submissionPath}/submission/solution`)) {
      logger.error(`Wrong folder structure detectd, missing "solution" folder for ${submissionId}.`)
      throw new Error(`Wrong folder structure detectd, missing "solution" folder for ${submissionId}.`)
    }

    logger.info(`Started executing DATA type of submission for ${submissionId} | ${submissionPath}`)
    await performDataTest(challengeId, submissionId, submissionPath, testPhase)

    /**
     * Code block for Non-TCO MMs
     */
    const resultFile = fs.readFileSync(path.join(`${submissionPath}/submission/artifacts/public`, 'result.txt'), 'utf-8')
    const lines = resultFile.trim().split('\n')
    score = lines.slice(-1)[0]

    const metadata = await helper.prepareMetaData(submissionPath, testPhase)
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
