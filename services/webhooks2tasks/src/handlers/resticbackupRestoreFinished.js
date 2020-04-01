// @flow

const {
  sendToLagoobernetesLogs
} = require('@lagoobernetes/commons/src/logs');
const {
  updateRestore,
  getEnvironmentByOpenshiftProjectName
} = require('@lagoobernetes/commons/src/api');
const R = require('ramda');

import type {
  WebhookRequestData
} from '../types';

async function resticbackupRestoreFinished(webhook: WebhookRequestData) {
  const {
    webhooktype,
    event,
    uuid,
    body
  } = webhook;

  try {
    const backupId = R.prop('snapshot_ID', body);

    const meta = {
      data: body,
      backupId: backupId,
    };

    await updateRestore(backupId, {
      status: 'SUCCESSFUL',
      restoreLocation: R.prop('restore_location', body)
    });

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:restored`,
      meta,
      `Updated restore ${backupId}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:error`, {
        data: body
      },
      `Could not update restore, reason: ${error}`
    );

    return;
  }
}

module.exports = resticbackupRestoreFinished;
