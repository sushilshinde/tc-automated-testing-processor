/**
 * Tester Service for `Data` type of Marathon Matches
 */

const path = require('path')
const config = require('config')
const logger = require('../common/logger')

const {
  createContainer,
  executeSubmission,
  killContainer,
  getContainerLog
} = require('../common/docker')

let submissionDirectory
let containerId

module.exports.performDataTest = async (
  challengeId,
  submissionId,
  submissionPath,
  testPhase
) => {
  try {
    submissionDirectory = path.resolve(`${submissionPath}/submission`)

    let testCommand = []
    testCommand = (testPhase === 'system') ? eval(process.env.FINAL_TESTER_COMMAND) : eval(process.env.PROVISIONAL_TESTER_COMMAND)
    testCommand = testCommand.split(',')

    // Start container
    containerId = await Promise.race([
      createContainer(
        challengeId,
        submissionId,
        config.DOCKER_IMAGE_NAME,
        submissionDirectory,
        config.DOCKER_MOUNT_PATH,
        testCommand,
        'tester'
      ),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker Container Start')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    // Execute the tester
    await Promise.race([
      executeSubmission(containerId),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker Execution')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    logger.info('DATA part of execution is completed')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    // await getContainerLog(
    //   submissionDirectory,
    //   containerId,
    //   'tester_container.log'
    // )
    await killContainer(containerId)
    logger.info('DATA Testing cycle completed')
  }
}
