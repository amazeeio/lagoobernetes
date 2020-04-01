// @flow

const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { createRemoveTask } = require('@lagoobernetes/commons/src/tasks');

import type { WebhookRequestData, removeData, ChannelWrapper, Project } from '../types';

async function githubPullRequestClosed(webhook: WebhookRequestData, project: Project) {

    const {
      webhooktype,
      event,
      giturl,
      uuid,
      body,
      user,
      sender,
    } = webhook;

    const meta = {
      projectName: project.name,
      pullrequestTitle: body.pull_request.title,
      pullrequestNumber: body.number,
      pullrequestUrl: body.pull_request.html_url,
      repoName: body.repository.full_name,
      repoUrl: body.repository.html_url,
    }

    const data: removeData = {
      projectName: project.name,
      pullrequestNumber: body.number,
      pullrequestTitle: body.pull_request.title,
      type: 'pullrequest'
    }

    try {
      const taskResult = await createRemoveTask(data);
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:closed:handled`, meta,
        `*[${project.name}]* PR <${body.pull_request.html_url}|#${body.number} (${body.pull_request.title})> by <${body.pull_request.user.html_url}|${body.pull_request.user.login}> changed by <${body.sender.html_url}|${body.sender.login}> closed in <${body.repository.html_url}|${body.repository.full_name}>`
      )
      return;
    } catch (error) {
      meta.error = error
      switch (error.name) {
        case "ProjectNotFound":
        case "NoActiveSystemsDefined":
        case "UnknownActiveSystem":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
            `*[${project.name}]* PR ${body.number} closed. No remove task created, reason: ${error}`
          )
          return;

        case "CannotDeleteProductionEnvironment":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('warning', project.name, uuid, `${webhooktype}:${event}:CannotDeleteProductionEnvironment`, meta,
            `*[${project.name}]* \`${meta.branch}\` not deleted. ${error}`
          )
          return;

        default:
          // Other messages are real errors and should reschedule the message in RabbitMQ in order to try again
          throw error
      }
    }
}

module.exports = githubPullRequestClosed;
