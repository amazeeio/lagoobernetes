// @flow

const R = require('ramda');
const sshpk = require('sshpk');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { getProject, addDeployKeyToProject } = require('@lagoobernetes/commons/src/gitlabApi');
const { addProject, addGroupToProject, sanitizeGroupName } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabProjectCreate(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const project = await getProject(body.project_id);
    const { id, path: projectName, ssh_url_to_repo: gitUrl, namespace } = project;

    // TODO: figure out openshift id
    const openshift = 1;

    // set production environment to default master
    const productionenvironment = "master";

    const meta = {
      data: project,
      project: projectName
    };

    if (namespace.kind != 'group') {
      sendToLagoobernetesLogs(
        'info',
        '',
        uuid,
        `${webhooktype}:${event}:unhandled`,
        meta,
        `Skipping creation of project ${projectName}: not in group namespace`
      );

      return;
    }

    const lagoobernetesProject = await addProject(projectName, gitUrl, openshift, productionenvironment);

    try {
      const privateKey = R.pipe(
        R.path(['addProject', 'privateKey']),
        sshpk.parsePrivateKey,
      )(lagoobernetesProject);
      const publicKey = privateKey.toPublic();

      await addDeployKeyToProject(id, publicKey.toString());
    } catch (err) {
      sendToLagoobernetesLogs(
        'error',
        '',
        uuid,
        `${webhooktype}:${event}:deploy_key`,
        { data: body },
        `Could not add deploy_key to gitlab project ${id}, reason: ${err}`
      );
    }

    // In Gitlab each project has an Owner, which is in this case a Group that already should be created before.
    // We add this owner Group to the Project.
    await addGroupToProject(projectName, sanitizeGroupName(namespace.full_path));

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Created project ${projectName}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not create project, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabProjectCreate;
