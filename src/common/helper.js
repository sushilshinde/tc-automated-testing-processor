/**
 * Contains generic helper methods
 */
const _ = require('lodash')
const archiver = require('archiver')
const fs = require('fs')
const request = require('superagent')
const prefix = require('superagent-prefix')
const unzip = require('unzipper')
const path = require('path')
const config = require('config')
const m2mAuth = require('tc-core-library-js').auth.m2m
const m2m = m2mAuth(
  _.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'AUTH0_PROXY_SERVER_URL'])
)
const logger = require('./logger')
const streamifier = require('streamifier')
const git = require('isomorphic-git')
git.plugins.set('fs', fs)

// Variable to cache reviewTypes from Submission API
const reviewTypes = {}

/**
 * Function to get M2M token
 * @returns {Promise}
 */
async function getM2Mtoken () {
  return m2m.getMachineToken(
    config.AUTH0_CLIENT_ID,
    config.AUTH0_CLIENT_SECRET
  )
}

/**
 * Attempts to download a zip file and unzip it
 * @param {String} submissionId Submission Id
 * @returns {String} the path where the submission was downloaded to
 */
async function downloadAndUnzipFile (submissionId) {
  const subPath = path.join(__dirname, '../../submissions', submissionId)

  logger.info(`Downloading submission ${submissionId}`)
  const url = `${config.SUBMISSION_API_URL}/submissions/${submissionId}/download`
  const zipFile = await reqSubmission(url)

  await streamifier
    .createReadStream(zipFile.body)
    .pipe(
      unzip.Extract({
        path: `${subPath}/submission`
      })
    )
    .promise()

  logger.info(`Zip file extracted to ${subPath}/submission`)
  return subPath
}

/**
 * Helper function returning prepared superagent instance.
 * @param {String} token M2M token value
 * @returns {Object} superagent instance configured with Authorization header and API url prefix
 */
function getApi (token) {
  return request
    .agent()
    .use(prefix(config.SUBMISSION_API_URL))
    .set('Authorization', `Bearer ${token}`)
}

/**
 * Function to get reviewTypeId from name
 * @param {String} reviewTypeName Name of the reviewType
 * @returns {String} reviewTypeId
 */
async function getReviewTypeId (reviewTypeName) {
  if (reviewTypes[reviewTypeName]) {
    return reviewTypes[reviewTypeName]
  } else {
    const token = await getM2Mtoken()
    const response = await getApi(token)
      .get('/reviewTypes')
      .query({
        name: reviewTypeName
      })

    if (response.body.length !== 0) {
      reviewTypes[reviewTypeName] = response.body[0].id
      return reviewTypes[reviewTypeName]
    }

    return null
  }
}

/**
 * Helper function returning prepared superagent instance for using with challenge API.
 * @param {String} token M2M token value
 * @returns {Object} superagent instance configured with Authorization header and API url prefix
 */
function getV4Api (token) {
  return request
    .agent()
    .use(prefix(config.CHALLENGE_API_URL))
    .set('Authorization', `Bearer ${token}`)
}

/**
 * Function to get challenge description by its id
 * @param {String} challengeId challenge id
 * @returns {Object} challenge description
 */
async function getChallenge (challengeId) {
  const token = await getM2Mtoken()
  const response = await getV4Api(token)
    .get('/challenges')
    .query({
      filter: `id=${challengeId}`
    })
  const content = _.get(response.body, 'result.content[0]')
  if (content) {
    return content
  }
  return null
}

/**
 * Function to send GET request to Submission API
 * @param {String} url Complete Submission API URL
 * @returns {Object} Submission information
 */
async function reqSubmission (url) {
  const token = await getM2Mtoken()
  return getApi(token)
    .get(url)
    .maxResponseSize(524288000)
}

/*
 * Post Error to Bus API
 * {Object} error Error object
 */
async function postError (error, submissionDetails = {}) {
  // Request body for Posting error to Bus API
  const errMessage = error.message ? error.message : error
  const reqBody = {
    topic: config.KAFKA_ERROR_TOPIC,
    originator: 'cmap-scorer',
    timestamp: new Date().toISOString(),
    'mime-type': 'application/json',
    payload: {
      error: {
        errorMessage: errMessage,
        submissionDetails
      }
    }
  }
  logger.info(`Post error to Bus API with data: ${JSON.stringify(reqBody)}`)
  const token = await getM2Mtoken()
  return request
    .post(config.BUSAPI_URL)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send(reqBody)
}

/**
 * Takes a submission id and gets the submission object
 * @param {Object} submissionId The id of submission
 */
async function getSubmission (submissionId) {
  const url = `${config.SUBMISSION_API_URL}/submissions/${submissionId}`
  logger.debug(`Getting submission from: ${url}`)

  try {
    const token = await getM2Mtoken()
    const response = await getApi(token).get(url)
    return response.body
  } catch (error) {
    logger.logFullError(error)
    throw error
  }
}

/**
 * Function that will create the zip and upload the artifacts
 * @param {String} filePath
 * @param {String} submissionId
 * @param {String} folderName
 * @param {String} archiveType
 */
async function zipAndUploadArtifact (
  filePath,
  submissionId,
  testPhase
) {
  let archive = archiver.create('zip', {})
  const token = await getM2Mtoken()

  if (fs.existsSync(`${filePath}/submission/artifacts/public`)) {
    const publicArtifact = fs.createWriteStream(
      `${filePath}/${submissionId}-${testPhase}.zip`
    )

    archive.pipe(publicArtifact)

    await archive.file(`${filePath}/submission/artifacts/execution-${submissionId}.log`, { name: `execution-${submissionId}.log` })
    await archive.file(`${filePath}/submission/artifacts/error-${submissionId}.log`, { name: `error-${submissionId}.log` })

    await archive
      .directory(`${filePath}/submission/artifacts/public`, false)
      .finalize()

    const publicArtifactZip = fs.readFileSync(
      `${filePath}/${submissionId}-${testPhase}.zip`
    )

    const publicArtifactPayload = {
      artifact: {
        name: `${submissionId}-${testPhase}`,
        data: publicArtifactZip
      }
    }

    await request
      .post(`${config.SUBMISSION_API_URL}/submissions/${submissionId}/artifacts`)
      .set('Authorization', `Bearer ${token}`)
      .field(_.omit(publicArtifactPayload, 'artifact'))
      .attach(
        'artifact',
        publicArtifactPayload.artifact.data,
        publicArtifactPayload.artifact.name
      )
  }

  // PRIVATE ARTIFACTS
  if (fs.existsSync(`${filePath}/submission/artifacts/private`)) {
    archive = archiver.create('zip', {})
    const privateArtifact = fs.createWriteStream(
      `${filePath}/${submissionId}-${testPhase}-internal.zip`
    )

    archive.pipe(privateArtifact)

    await archive
      .directory(`${filePath}/submission/artifacts/private`, false)
      .finalize()

    const privateArtifactZip = fs.readFileSync(
      `${filePath}/${submissionId}-${testPhase}-internal.zip`
    )

    const privateArtifactPayload = {
      artifact: {
        name: `${submissionId}-${testPhase}-internal`,
        data: privateArtifactZip
      }
    }

    await request
      .post(`${config.SUBMISSION_API_URL}/submissions/${submissionId}/artifacts`)
      .set('Authorization', `Bearer ${token}`)
      .field(_.omit(privateArtifactPayload, 'artifact'))
      .attach(
        'artifact',
        privateArtifactPayload.artifact.data,
        privateArtifactPayload.artifact.name
      )
  }
}

// TODO - Function no longer called. Can be called once again perhaps when we
// TODO - decide about the private metadata
async function prepareMetaData (submissionPath, testPhase) {
  const metadata = {}
  metadata.testType = testPhase

  metadata.public = JSON.parse(fs.readFileSync(path.join(`${submissionPath}/submission/artifacts/public`, 'result.json'), 'utf-8'))

  // TODO - I am guessing the above code already took care of preparing the meta data
  // TODO - but just in case, leaving this here for now if we need to store any other type
  // TODO - of meta data
  // if (fs.existsSync(`${submissionPath}/submission/output/private.csv`)) {
  //   metadata.private = await csv().fromFile(
  //     `${submissionPath}/submission/output/private.csv`
  //   )
  // } else {
  //   metadata.private = 'This is private message'
  // }

  return metadata
}

/**
 * Clones the specification and tests to the folder
 * where the submission will be downloaded
 * @param {String} submissionId The submission id
 * @param {String} codeRepo The code repository to clone. Default to env var GIT_REPOSITORY_URL
 */
async function cloneSpecAndTests (submissionId, codeRepo) {
  if (!codeRepo || codeRepo.length === 0) {
    codeRepo = config.git.GIT_REPOSITORY_URL
  }

  logger.info(`Cloning test repository: ${codeRepo}`)

  const subPath = path.join(__dirname, '../../submissions', submissionId, 'submission', 'tests')
  logger.info(`Cloning test specification to ${subPath}`)
  await git.clone({
    dir: subPath,
    url: codeRepo,
    singleBranch: true,
    username: config.git.GIT_USERNAME,
    password: config.git.GIT_PASSWORD
  })
  logger.info('Cloned successfully')
}

/**
 * Determines which programming language the solution is written in
 * @param {String} solutionPath The path where the solution file exists
 */
function detectSolutionLanguage (solutionPath) {
  let fileName = 'solution'

  if (fs.existsSync(path.join(solutionPath, `${fileName}.js`))) {
    return 'javascript'
  }

  if (fs.existsSync(path.join(solutionPath, `${fileName}.py`))) {
    return 'python'
  }

  if (fs.existsSync(path.join(solutionPath, `${fileName}.go`))) {
    return 'go'
  }

  fileName = 'Solution' // Java filename will be the class name

  if (fs.existsSync(path.join(solutionPath, `${fileName}.java`))) {
    return 'java'
  }
}

/**
 * Returns the score for the given test results
 * @param {Object} result The result json from gauge
 */
function getScore (result) {
  const totalTests = result.passedScenariosCount + result.failedScenariosCount
  const score = (result.passedScenariosCount / totalTests) * 100

  return Number(score.toFixed(2))
}

module.exports = {
  getM2Mtoken,
  downloadAndUnzipFile,
  getApi,
  getReviewTypeId,
  getV4Api,
  getChallenge,
  reqSubmission,
  postError,
  getSubmission,
  zipAndUploadArtifact,
  prepareMetaData,
  cloneSpecAndTests,
  detectSolutionLanguage,
  getScore
}
