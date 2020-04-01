// @flow

const amqp = require('amqp-connection-manager');
const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { sendToLagoobernetesLogs, initSendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { sendToLagoobernetesTasks, initSendToLagoobernetesTasks } = require('@lagoobernetes/commons/src/tasks');

const processQueue = require('./processQueue');

import type { ChannelWrapper } from './types';



initSendToLagoobernetesLogs();
initSendToLagoobernetesTasks();

const rabbitmqHost = process.env.RABBITMQ_HOST || "broker"
const rabbitmqUsername = process.env.RABBITMQ_USERNAME || "guest"
const rabbitmqPassword = process.env.RABBITMQ_PASSWORD || "guest"
const connection = amqp.connect([`amqp://${rabbitmqUsername}:${rabbitmqPassword}@${rabbitmqHost}`], { json: true });

connection.on('connect', ({ url }) => logger.verbose('Connected to %s', url, { action: 'connected', url }));
connection.on('disconnect', params => logger.error('Not connected, error: %s', params.err.code, { action: 'disconnected', reason: params }));

// Cast any to ChannelWrapper to get type-safetiness through our own code
const channelWrapperWebhooks: ChannelWrapper = connection.createChannel({
	setup: channel => {
		return Promise.all([

			// Our main Exchange for all lagoobernetes-webhooks
			channel.assertExchange('lagoobernetes-webhooks', 'direct', { durable: true }),

			// Queue which is bound to the exachange
			channel.assertQueue('lagoobernetes-webhooks:queue', { durable: true }),
			channel.bindQueue('lagoobernetes-webhooks:queue', 'lagoobernetes-webhooks', ''),

			// delay exchnage
			channel.assertExchange('lagoobernetes-webhooks-delay', 'x-delayed-message', { durable: true, arguments: { 'x-delayed-type': 'fanout' }}),
			channel.bindExchange('lagoobernetes-webhooks', 'lagoobernetes-webhooks-delay', ''),

			// handle up to four messages at the same time
			channel.prefetch(4),

			channel.consume('lagoobernetes-webhooks:queue', msg => {processQueue(msg, channelWrapperWebhooks)}, {noAck: false}),

		]);
	}
});
