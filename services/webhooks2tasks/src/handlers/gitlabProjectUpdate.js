// @flow

const R = require('ramda');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { getProject } = require('@lagoobernetes/commons/src/gitlabApi');
const {
  addProject,
  updateProject,
  deleteProject,
  addGroupToProject,
  removeGroupFromProject,
  sanitizeGroupName,
} = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabProjectUpdate(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    var project = await getProject(body.project_id);
    var { id, path: projectName, ssh_url_to_repo: gitUrl, namespace } = project;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not get project info from Gitlab, reason: ${error}`
    );

    return;
  }

  const meta = {
    data: project,
    project: projectName
  };

  // Project was transferred from a group namespace to a non-group namespace
  if (namespace.kind != 'group') {
    try {
      await deleteProject(projectName);

      sendToLagoobernetesLogs(
        'info',
        '',
        uuid,
        `${webhooktype}:${event}:unhandled`,
        meta,
        `Deleted project ${projectName}: not in group namespace anymore`
      );

      return;
    } catch (error) {
      sendToLagoobernetesLogs(
        'error',
        '',
        uuid,
        `${webhooktype}:${event}:unhandled`,
        meta,
        `Could not delete project, reason: ${error}`
      );

      return;
    }
  }

  try {
    const response = await updateProject(id, {
      name: projectName,
      gitUrl,
    });

    if (event === 'project_transfer' && body.path_with_namespace !== body.old_path_with_namespace) {
      const oldGroupName = R.pipe(
        R.split('/'),
        R.init(),
        R.join('/'),
        sanitizeGroupName,
      )(body.old_path_with_namespace);

      try {
        await removeGroupFromProject(projectName, oldGroupName);
      } catch (err) {
        sendToLagoobernetesLogs(
          'error',
          '',
          uuid,
          `${webhooktype}:${event}:unhandled`,
          meta,
          `Could not remove group "${oldGroupName}" from project "${projectName}", reason: ${error}`
        );
      }

      try {
        await addGroupToProject(projectName, sanitizeGroupName(project.namespace.full_path));
      } catch (err) {
        sendToLagoobernetesLogs(
          'error',
          '',
          uuid,
          `${webhooktype}:${event}:unhandled`,
          meta,
          `Could not add group "${sanitizeGroupName(project.namespace.full_path)}" to project "${projectName}", reason: ${error}`
        );
      }
    }

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Updated project ${projectName}`
    );

    return;
  } catch (error) {
    try {
      // TODO: figure out openshift id
      const openshift = 1;

      // set production environment to default master
      const productionenvironment = "master";

      // Project was transferred from a non-group namespace to a group namespace, we add a new project
      await addProject(projectName, gitUrl, openshift, productionenvironment);

      // In Gitlab each project has an Owner, which is in this case a Group that already should be created before.
      // We add this owner Group to the Project.
      await addGroupToProject(projectName, sanitizeGroupName(namespace.full_path));

      sendToLagoobernetesLogs(
        'info',
        '',
        uuid,
        `${webhooktype}:${event}:handled`,
        meta,
        `Added project ${projectName}: transfer to group namespace`
      );

      return;
    } catch (error) {
      sendToLagoobernetesLogs(
        'error',
        '',
        uuid,
        `${webhooktype}:${event}:unhandled`,
        { data: body },
        `Could not update project, reason: ${error}`
      );

      return;
    }
  }
}

module.exports = gitlabProjectUpdate;
