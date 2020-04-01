// @flow
const retry = require('async-retry')

const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { addUserToGroup, sanitizeGroupName } = require('@lagoobernetes/commons/src/api');
const { getGroup } = require('@lagoobernetes/commons/src/gitlabApi');
const { logger } = require('@lagoobernetes/commons/src/local-logging');

import type { WebhookRequestData } from '../types';

async function gitlabUserGroupAdd(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const group = await getGroup(body.group_id);
    const { group_path: groupName, user_id: gitlabUserId, user_email: userEmail, group_access: role } = body;

    const meta = {
      data: body,
      userEmail,
      gitlabUserId,
      groupName,
      role,
    };

    // Retry adding the User to the Customer 5 times as during the creation of a new Group the customer is immediatelly added and the webhook sent at the same time
    await retry(async () => {
      // Gitlab Group Access matches the Lagoobernetes Roles, just need them Uppercase
      await addUserToGroup(userEmail, sanitizeGroupName(group.full_path), role.toUpperCase());
    }, {
      retries: 5,
    })

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Added user ${gitlabUserId} ${userEmail} to group ${groupName}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not add user to group , reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabUserGroupAdd;
