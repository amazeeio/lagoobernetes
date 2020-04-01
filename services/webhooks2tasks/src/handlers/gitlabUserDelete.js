// @flow

const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { deleteUser } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabUserDelete(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const { user_id: id, email } = body;

    const meta = {
      user: id
    };

    await deleteUser(email);

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Deleted user ${id}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not delete user, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabUserDelete;
