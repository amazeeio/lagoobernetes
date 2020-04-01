// @flow
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { removeUserFromGroup } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabUserProjectRemove(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const { project_path: projectName, user_id: userId, user_email: userEmail } = body;

    const meta = {
      data: body,
      projectName,
      userId,
      userEmail
    };

    // In Gitlab you can add/remove Users to Projects, in Lagoobernetes this is not directly possible, but instead
    // Lagoobernetes automatically creates a group for each project in this form: `project-$projectname`
    // So if a User is removed from a Project in Gitlab, we remove the user from this group
    await removeUserFromGroup(userEmail, `project-${projectName}`);

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Removed user ${userEmail} ${userId} from group project-${projectName}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not remove user from group project, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabUserProjectRemove;
