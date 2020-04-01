// @flow

const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { deleteGroup, sanitizeGroupName } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabGroupDelete(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const { path: name, group_id: id, full_path } = body;

    const meta = {
      path: name,
      group_id: id,
    };

    await deleteGroup(sanitizeGroupName(full_path));

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Deleted group ${name}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not delete group, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabGroupDelete;
