// @flow

const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { getGroup } = require('@lagoobernetes/commons/src/gitlabApi');
const { addGroup, addGroupWithParent, sanitizeGroupName } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabGroupCreate(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const group = await getGroup(body.group_id);
    const { id, path: name, description: comment, full_path, parent_id } = group;

    const meta = {
      data: group,
      gitlab_group_id: id
    };

    const groupName = sanitizeGroupName(full_path);
    if (group.parent_id) {
      const parentGroup = await getGroup(group.parent_id);
      await addGroupWithParent(groupName, sanitizeGroupName(parentGroup.full_path));
    } else {
      await addGroup(groupName);
    }

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Created group ${name}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not create group, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabGroupCreate;
