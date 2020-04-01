// @flow
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { removeUserFromGroup, sanitizeGroupName } = require('@lagoobernetes/commons/src/api');
const { getGroup } = require('@lagoobernetes/commons/src/gitlabApi');

import type { WebhookRequestData } from '../types';

async function gitlabUserGroupRemove(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  let group;
  try {
    group = await getGroup(body.group_id);
  } catch (err) {
    if (err.message === '404 Group Not Found') {
      // Group was deleted, no need to manually remove user
      return;
    }

    throw err;
  }

  try {
    const { group_path: groupName, user_id: gitlabUserId, user_email: userEmail } = body;

    const meta = {
      data: body,
      userEmail,
      gitlabUserId,
      groupName,
    };

    await removeUserFromGroup(userEmail, sanitizeGroupName(group.full_path));

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Removed user ${gitlabUserId} ${userEmail} from group ${groupName}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not remove user from group, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabUserGroupRemove;
