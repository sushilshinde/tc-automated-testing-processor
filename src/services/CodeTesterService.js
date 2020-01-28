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
  killContainer,
  getContainerLog
} = require('../common/docker')

let submissionDirectory
let containerId

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
    // BUILD IMAGE
    await Promise.race([
      buildDockerImage(submissionDirectory, submissionId),
      new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new Error('Timeout :: Docker Container Start')),
          (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
        )
      })
    ])

    if (customRun === 'true') {
      logger.info('Started executing custom runner for the submission')
      const { stdout, stderr } = await exec(eval(config.CUSTOM_RUN_COMMAND), { timeout: (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT })

      if (stderr) {
        logger.error(`error: ${stderr}`)
        throw new Error(stderr)
      }
      logger.info(stdout)
    } else {
      let testCommand = []
      testCommand = (testPhase === 'system') ? eval(process.env.FINAL_SOLUTION_COMMAND) : eval(process.env.PROVISIONAL_SOLUTION_COMMAND)
      testCommand = testCommand.split(',')

      // Start solution container
      containerId = await Promise.race([
        createContainer(
          challengeId,
          submissionId,
          submissionId,
          submissionDirectory,
          config.DOCKER_MOUNT_PATH,
          testCommand,
          'solution',
          gpuFlag
        ),
        new Promise((resolve, reject) => {
          setTimeout(
            () => reject(new Error('Timeout :: Docker Container Start')),
            (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
          )
        })
      ])

      // Execute solution
      await Promise.race([
        executeSubmission(containerId),
        new Promise((resolve, reject) => {
          setTimeout(
            () => reject(new Error('Timeout :: Docker Execution')),
            (testPhase === 'system') ? config.FINAL_TESTING_TIMEOUT : config.PROVISIONAL_TESTING_TIMEOUT
          )
        })
      ])
    }

    logger.info('CODE part of execution is completed')
  } catch (error) {
    logger.logFullError(error)
    throw new Error(error)
  } finally {
    if (customRun === 'false') {
      // await getContainerLog(
      //   submissionDirectory,
      //   containerId,
      //   'solution_container.log'
      // )
      await killContainer(containerId)
    }
    await deleteDockerImage(submissionId)
    logger.info('CODE Testing cycle completed')
  }
}
