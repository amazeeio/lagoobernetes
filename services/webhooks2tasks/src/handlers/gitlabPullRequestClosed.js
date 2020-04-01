// @flow

const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { createRemoveTask } = require('@lagoobernetes/commons/src/tasks');

import type { WebhookRequestData, removeData, ChannelWrapper, Project } from '../types';

async function gitlabPullRequestClosed(webhook: WebhookRequestData, project: Project) {

    const {
      webhooktype,
      event,
      giturl,
      uuid,
      body,
    } = webhook;

    const meta = {
      projectName: project.name,
      pullrequestNumber: body.object_attributes.id,
      pullrequestTitle: body.object_attributes.title,
      pullrequestUrl: body.object_attributes.url,
      repoName: body.object_attributes.target.name,
      repoUrl: body.object_attributes.target.web_url,
    }

    const data: removeData = {
      projectName: project.name,
      pullrequestNumber: body.object_attributes.id,
      pullrequestTitle: body.object_attributes.title,
      type: 'pullrequest'
    }

    try {
      const taskResult = await createRemoveTask(data);
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:closed:handled`, meta,
        `*[${project.name}]* PR <${body.object_attributes.url}|#${body.object_attributes.id} (${body.object_attributes.title})> closed in <${body.object_attributes.target.web_url}|${body.object_attributes.target.name}>`
      )
      return;
    } catch (error) {
      switch (error.name) {
        case "ProjectNotFound":
        case "NoActiveSystemsDefined":
        case "UnknownActiveSystem":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
            `*[${project.name}]* PR ${body.object_attributes.id} closed. No remove task created, reason: ${error}`
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

module.exports = gitlabPullRequestClosed;
