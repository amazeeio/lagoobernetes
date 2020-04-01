// @flow

const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { deleteProject } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabProjectDelete(webhook: WebhookRequestData) {
  const {
    webhooktype,
    event,
    uuid,
    body,
    body: { path: name }
  } = webhook;

  try {
    const meta = {
      project: name
    };

    await deleteProject(name);

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `deleted project ${name}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not delete project, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabProjectDelete;
