// @flow
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { addUserToGroup } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabUserProjectAdd(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;
  const { project_path: projectName, user_id: userId, user_email: userEmail, access_level: role } = body;

  try {
    const meta = {
      data: body,
      userId,
      userEmail,
      projectName,
      role,
    };

    // In Gitlab you can add Users to Projects, in Lagoobernetes this is not directly possible, but instead
    // Lagoobernetes automatically creates a group for each project in this form: `project-$projectname`
    // So if a User is added to a Project in Gitlab, we add the user to this group
    await addUserToGroup(userEmail, `project-${projectName}`, role.toUpperCase());

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Added user ${userEmail} ${userId} to group project-${projectName}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not add user to group project, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabUserProjectAdd;
