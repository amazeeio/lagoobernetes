// @flow

const R = require('ramda');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { getUser } = require('@lagoobernetes/commons/src/gitlabApi');
const { updateUser } = require('@lagoobernetes/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabUserUpdate(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const user = await getUser(body.user_id);
    const { id, email, name } = user;

    const meta = {
      data: user,
      user: id
    };

    let firstName = name,
      lastName;
    if (name.includes(' ')) {
      const nameParts = name.split(' ');
      firstName = R.head(nameParts);
      lastName = R.tail(nameParts).join(' ');
    }

    await updateUser(email, {
      email,
      firstName,
      lastName
    });

    sendToLagoobernetesLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Updated user ${name}`
    );

    return;
  } catch (error) {
    sendToLagoobernetesLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not update user, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabUserUpdate;
