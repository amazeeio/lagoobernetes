// @flow

const R = require('ramda');
const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { createDeployTask } = require('@lagoobernetes/commons/src/tasks');

import type { WebhookRequestData, removeData, ChannelWrapper, Project } from '../types';

const isEditAction = R.propEq('action', 'edited');

const onlyBodyChanges = R.pipe(
  R.propOr({}, 'changes'),
  R.keys,
  R.equals(['body']),
);

const skipRedeploy = R.and(isEditAction, onlyBodyChanges);

async function githubPullRequestSynchronize(webhook: WebhookRequestData, project: Project) {

    const {
      webhooktype,
      event,
      giturl,
      uuid,
      body,
    } = webhook;

    const headRepoId = body.pull_request.head.repo.id
    const headBranchName = body.pull_request.head.ref
    const headSha = body.pull_request.head.sha
    const baseRepoId = body.pull_request.base.repo.id
    const baseBranchName = body.pull_request.base.ref
    const baseSha = body.pull_request.base.sha

    const meta = {
      projectName: project.name,
      pullrequestTitle: body.pull_request.title,
      pullrequestNumber: body.number,
      pullrequestUrl: body.pull_request.html_url,
      repoName: body.repository.full_name,
      repoUrl: body.repository.html_url,
    }

    // Don't trigger deploy if only the PR body was edited.
    if (skipRedeploy(body)) {
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
        `*[${project.name}]* PR ${body.number} updated. No deploy task created, reason: Only body changed`
      )
      return;
    }

    // Don't trigger deploy if the head and base repos are different
    if (!R.equals(headRepoId, baseRepoId)) {
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
        `*[${project.name}]* PR ${body.number} updated. No deploy task created, reason: Head/Base not same repo`
      )
      return;
    }

    const data: deployData = {
      repoName: body.repository.full_name,
      repoUrl: body.repository.html_url,
      pullrequestUrl: body.pull_request.html_url,
      pullrequestTitle: body.pull_request.title,
      pullrequestNumber: body.number,
      projectName: project.name,
      type: 'pullrequest',
      headBranchName: headBranchName,
      headSha: headSha,
      baseBranchName: baseBranchName,
      baseSha: baseSha,
      branchName: `pr-${body.number}`,
    }

    try {
      const taskResult = await createDeployTask(data);
      sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:synchronize:handled`, data,
        `*[${project.name}]* PR <${body.pull_request.html_url}|#${body.number} (${body.pull_request.title})> updated in <${body.repository.html_url}|${body.repository.full_name}>`
      )
      return;
    } catch (error) {
      switch (error.name) {
        case "ProjectNotFound":
        case "NoActiveSystemsDefined":
        case "UnknownActiveSystem":
          // These are not real errors and also they will happen many times. We just log them locally but not throw an error
          sendToLagoobernetesLogs('info', project.name, uuid, `${webhooktype}:${event}:handledButNoTask`, meta,
            `*[${project.name}]* PR ${body.number} opened. No deploy task created, reason: ${error}`
          )
          return;

        default:
          // Other messages are real errors and should reschedule the message in RabbitMQ in order to try again
          throw error
      }
    }
}

module.exports = githubPullRequestSynchronize;
