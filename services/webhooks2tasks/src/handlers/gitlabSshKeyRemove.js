// @flow

const R = require('ramda');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { getUserBySshKey, deleteSshKey } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabSshKeyRemove(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const { id, key, username } = body;

    const user = await getUserBySshKey(key);
    const {
      userBySshKey: { id: userId, sshKeys }
    } = user;

    const meta = {
      data: body,
      key: id,
      user: userId
    };

    const name = R.head(
      R.map(R.prop('name'), sshKeys.filter(sshKey => sshKey.id == id))
    );

    await deleteSshKey(name);

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Deleted key ${id}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not delete key, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabSshKeyRemove;
