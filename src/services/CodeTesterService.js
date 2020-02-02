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
    // Build image from user solution
    await Promise.race([
      buildDockerImage(submissionDirectory, submissionId, `${submissionId}-solution-image`),
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
        challengeId,
        submissionId,
        `${submissionId}-solution-image`,
        submissionDirectory,
        config.DOCKER_SOLUTION_MOUNT_PATH,
        testCommand,
        'solution',
        gpuFlag,
        `${submissionId}-solution-container`
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

    // Build image from test specification
    await Promise.race([
      buildDockerImage(submissionDirectory, submissionId, `${submissionId}-test-specs-image`),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker test specs image build')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    logger.info('CODE part of execution is completed')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    // if (customRun === 'false') {
    //   await getContainerLog(
    //     submissionDirectory,
    //     containerId,
    //     'solution_container.log'
    //   )
    //   await killContainer(containerId)
    // }
    // await deleteDockerImage(submissionId)
    logger.info('CODE Testing cycle completed')
  }
}
