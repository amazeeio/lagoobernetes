// @flow

const R = require('ramda');
const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { createDeployTask } = require('@lagoobernetes/commons/src/tasks');

import type { WebhookRequestData, removeData, ChannelWrapper, Project } from '../types';

async function gitlabPullRequestOpened(webhook: WebhookRequestData, project: Project) {

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

    const headRepoId = body.object_attributes.source.git_ssh_url
    const headBranchName = body.object_attributes.source_branch
    const headSha = body.object_attributes.last_commit.id
    const baseRepoId = body.object_attributes.target.git_ssh_url
    const baseBranchName = body.object_attributes.target_branch
    const baseSha = `origin/${body.object_attributes.target_branch}` // gitlab does not send us the target sha, we just use the target_branch

    // Don't trigger deploy if the head and base repos are different
    if (!R.equals(headRepoId, baseRepoId)) {
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
        `*[${project.name}]* PR ${body.number} opened. No deploy task created, reason: Target/Source not same repo`
      )
      return;
    }


    const data: deployData = {
      repoUrl: body.object_attributes.target.web_url,
      repoName: body.object_attributes.target.name,
      pullrequestUrl: body.object_attributes.url,
      pullrequestTitle: body.object_attributes.title,
      pullrequestNumber: body.object_attributes.id,
      projectName: project.name,
      type: 'pullrequest',
      headBranchName: headBranchName,
      headSha: headSha,
      baseBranchName: baseBranchName,
      baseSha: baseSha,
      branchName: `pr-${body.object_attributes.id}`,
    }

    try {
      const taskResult = await createDeployTask(data);
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:opened:handled`, data,
        `*[${project.name}]* PR <${body.object_attributes.url}|#${body.object_attributes.id} (${body.object_attributes.title})> opened in <${body.object_attributes.target.web_url}|${body.object_attributes.target.name}>`
      )
      return;
    } catch (error) {
      switch (error.name) {
        case "ProjectNotFound":
        case "NoActiveSystemsDefined":
        case "UnknownActiveSystem":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
            `*[${project.name}]* PR ${body.object_attributes.id} opened. No deploy task created, reason: ${error}`
          )
          return;

        default:
          // Other messages are real errors and should reschedule the message in RabbitMQ in order to try again
          throw error
      }
    }
}

module.exports = gitlabPullRequestOpened;
