// @flow

const R = require('ramda');
const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { createDeployTask } = require('@lagoobernetes/commons/src/tasks');

import type { WebhookRequestData, removeData, ChannelWrapper, Project } from '../types';

async function bitbucketPullRequestUpdated(webhook: WebhookRequestData, project: Project) {

    const {
      webhooktype,
      event,
      giturl,
      uuid,
      body,
    } = webhook;

    const meta = {
      projectName: project.name,
      pullrequestTitle: body.pullrequest.title,
      pullrequestNumber: body.pullrequest.id,
      pullrequestUrl: body.pullrequest.destination.repository.links.html.href,
      repoName: body.repository.full_name,
      repoUrl: body.repository.links.html.href,
    }

    const headRepoId = body.pullrequest.source.repository.uuid;
    const headBranchName = body.pullrequest.source.branch.name
    const headSha = body.pullrequest.source.commit.hash
    const baseRepoId = body.pullrequest.destination.repository.uuid;
    const baseBranchName = body.pullrequest.destination.branch.name
    const baseSha = body.pullrequest.destination.commit.hash

    // Don't trigger deploy if the head and base repos are different
    if (!R.equals(headRepoId, baseRepoId)) {
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
        `*[${project.name}]* PR ${body.number}. No deploy task created, reason: Source/Destination not same repo`
      )
      return;
    }

    const data: deployData = {
      repoName: body.repository.full_name,
      repoUrl: body.repository.links.html.href,
      pullrequestUrl: body.pullrequest.links.html.href,
      pullrequestTitle: body.pullrequest.title,
      pullrequestNumber: body.pullrequest.id,
      projectName: project.name,
      type: 'pullrequest',
      headBranchName: headBranchName,
      headSha: headSha,
      baseBranchName: baseBranchName,
      baseSha: baseSha,
      branchName: `pr-${body.pullrequest.id}`,
    }

    try {
      const taskResult = await createDeployTask(data);
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:opened:handled`, data,
        `*[${project.name}]* PR <${body.pullrequest.destination.repository.links.html.href}|#${body.pullrequest.id} (${body.title})> updated in <${body.pullrequest.destination.repository.links.html.href}|${body.pullrequest.destination.branch.name}>`
      )
      return;
    } catch (error) {
      switch (error.name) {
        case "ProjectNotFound":
        case "NoActiveSystemsDefined":
        case "UnknownActiveSystem":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
            `*[${project.name}]* PR ${body.object_attributes.id} updated. No deploy task created, reason: ${error}`
          )
          return;

        default:
          // Other messages are real errors and should reschedule the message in RabbitMQ in order to try again
          throw error
      }
    }
}

module.exports = bitbucketPullRequestUpdated;
