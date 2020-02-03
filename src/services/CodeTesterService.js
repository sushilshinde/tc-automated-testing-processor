/**
 * Tester Service for `Code` type of Marathon Matches
 */

const path = require('path')
const config = require('config')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const logger = require('../common/logger')

const {
  buildDockerImage,
  deleteDockerImage,
  createContainer,
  executeSubmission,
  getContainerLog,
  killContainer
} = require('../common/docker')

let submissionDirectory
let solutionContainerId
let testSpecContainerId

module.exports.performCodeTest = async (
  challengeId,
  submissionId,
  submissionPath,
  customRun,
  testPhase,
  gpuFlag
) => {
  try {
    submissionDirectory = path.resolve(`${submissionPath}/submission`)
    let cwdPath = `${submissionDirectory}/code`
    let dockerfilePath = `${submissionDirectory}/SolutionDockerfile.tar.gz`
    let logPath = `${submissionDirectory}/artifacts/public/solution-docker-image-build.log`
    let imageName = `${submissionId}-solution-image`
    let solutionContainerName = `${submissionId}-solution-container`

    // Build image from user solution
    await Promise.race([
      buildDockerImage(
        submissionId,
        cwdPath,
        dockerfilePath,
        imageName,
        logPath
      ),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker solution image build')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    let testCommand = []
    // testCommand = (testPhase === 'system') ? eval(process.env.FINAL_SOLUTION_COMMAND) : eval(process.env.PROVISIONAL_SOLUTION_COMMAND)
    // testCommand = testCommand.split(',')

    // Create container from user solution image
    solutionContainerId = await Promise.race([
      createContainer(
        submissionId,
        imageName,
        submissionDirectory,
        config.DOCKER_SOLUTION_MOUNT_PATH,
        testCommand,
        'solution',
        gpuFlag,
        solutionContainerName
      ),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker solution container creation')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    // Start user solution container
    await Promise.race([
      executeSubmission(solutionContainerId),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker solution container execution')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    cwdPath = `${submissionDirectory}/tests`
    dockerfilePath = `${submissionDirectory}/TestSpecDockerfile.tar.gz`
    logPath = `${submissionDirectory}/artifacts/public/test-spec-docker-image-build.log`
    imageName = `${submissionId}-test-spec-image`

    // Build image from test specification
    await Promise.race([
      buildDockerImage(
        submissionId,
        cwdPath,
        dockerfilePath,
        imageName,
        logPath
      ),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker test specs image build')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    // Create container from test spec image
    testSpecContainerId = await Promise.race([
      createContainer(
        submissionId,
        imageName,
        submissionDirectory,
        null,
        testCommand,
        'solution',
        gpuFlag,
        `${submissionId}-test-spec-container`,
        [`${solutionContainerName}:ro`]
      ),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker test spec container creation')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    // Start test spec container
    await Promise.race([
      executeSubmission(testSpecContainerId),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker test spec container execution')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    logger.info('CODE part of execution is completed')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    await getContainerLog(
      submissionDirectory,
      testSpecContainerId,
      'test-spec-container.log'
    )
    await killContainer(testSpecContainerId)
    // TODO - kill solution container too
    // TODO - an uncomment the line below to remove both images
    // await deleteDockerImage(submissionId)
    logger.info('CODE Testing cycle completed')
  }
}
