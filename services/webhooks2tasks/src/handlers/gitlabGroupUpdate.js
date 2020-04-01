// @flow

const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { getGroup } = require('@lagoobernetes/commons/src/gitlabApi');
const { updateGroup, sanitizeGroupName } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabGroupUpdate(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const group = await getGroup(body.group_id);
    const { id, path: name, full_path } = group;
    const { old_full_path } = body;

    const meta = {
      data: group,
      group: id
    };

    await updateGroup(sanitizeGroupName(old_full_path), {
      name: sanitizeGroupName(full_path)
    });

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Updated group ${name}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not update group, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabGroupUpdate;
