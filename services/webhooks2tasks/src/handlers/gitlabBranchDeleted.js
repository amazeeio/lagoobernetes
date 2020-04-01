// @flow

const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { createRemoveTask } = require('@lagoobernetes/commons/src/tasks');

import type { WebhookRequestData, removeData, ChannelWrapper, Project  } from '../types';

async function gitlabBranchDeleted(webhook: WebhookRequestData, project: Project) {

    const {
      webhooktype,
      event,
      giturl,
      uuid,
      body,
    } = webhook;

    const meta = {
      branch: body.ref.replace('refs/heads/',''),
      branchName: body.ref.replace('refs/heads/',''),
      projectName: data.projectName,
      repoFullName: body.project.path_with_namespace,
    }

    const data: removeData = {
      projectName: project.name,
      branch: meta.branch,
      branchName: meta.branchName,
      forceDeleteProductionEnvironment: false,
      type: 'branch'
    }

    try {
      const taskResult = await createRemoveTask(data);
      // we are hardcoding the event type here as gitlab only knows them as a `push` with a all-zero sha
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:remove:handled`, meta,
        `*[${project.name}]* \`${meta.branch}\` deleted in <${body.project.http_url}|${body.project.path_with_namespace}>`
      )
      return;
    } catch (error) {
      meta.error = error
      switch (error.name) {
        case "ProjectNotFound":
        case "NoActiveSystemsDefined":
        case "UnknownActiveSystem":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:remove:handledButNoTask`, meta,
            `*[${project.name}]* \`${meta.branch}\` deleted. No remove task created, reason: ${error}`
          )
          return;

        case "CannotDeleteProductionEnvironment":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('warning', project.name, uuid, `${webhooktype}:remove:CannotDeleteProductionEnvironment`, meta,
            `*[${project.name}]* \`${meta.branch}\` not deleted. ${error}`
          )
          return;

        default:
          // Other messages are real errors and should reschedule the message in RabbitMQ in order to try again
          throw error
      }
    }

}

module.exports = gitlabBranchDeleted;
