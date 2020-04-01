// @flow

const { logger } = require('@lagoobernetes/commons/src/local-logging');

import type { WebhookRequestData } from './types';

export type ChannelWrapper = {
  publish: (string, string, Buffer, Object) => void,
  sendToQueue: (evt: string, data: Buffer, opts: Object) => void,
}

async function sendToLagoobernetesWebhooks (args: WebhookRequestData, channelWrapperWebhooks: ChannelWrapper): Promise<void> {
  const {
    webhooktype,
    event,
    giturl,
    uuid,

  } = args;

  try {
    const buffer = new Buffer(JSON.stringify(args));
    await channelWrapperWebhooks.publish(`lagoobernetes-webhooks`, '', buffer, { persistent: true });

    logger.verbose(`Success send to lagoobernetes-webhooks ${webhooktype}:${event}`, {
      webhooktype,
      event,
      uuid,
    });
  } catch(error) {
    logger.error(`Error queuing lagoobernetes-webhooks ${webhooktype}:${event}, error: ${error}`);
  }
}

module.exports = sendToLagoobernetesWebhooks;
