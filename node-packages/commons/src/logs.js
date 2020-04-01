const amqp = require('amqp-connection-manager');
const { logger } = require('./local-logging');

const rabbitmqHost = process.env.RABBITMQ_HOST || 'broker';
const rabbitmqUsername = process.env.RABBITMQ_USERNAME || 'guest';
const rabbitmqPassword = process.env.RABBITMQ_PASSWORD || 'guest';

let channelWrapperLogs;

exports.initSendToLagoobernetesLogs = initSendToLagoobernetesLogs;
exports.sendToLagoobernetesLogs = sendToLagoobernetesLogs;

function initSendToLagoobernetesLogs() {
  const connection = amqp.connect(
    [`amqp://${rabbitmqUsername}:${rabbitmqPassword}@${rabbitmqHost}`],
    { json: true },
  );

  connection.on('connect', ({ url }) =>
    logger.verbose('lagoobernetes-logs: Connected to %s', url, {
      action: 'connected',
      url,
    }),
  );
  connection.on('disconnect', params =>
    logger.error('lagoobernetes-logs: Not connected, error: %s', params.err.code, {
      action: 'disconnected',
      reason: params,
    }),
  );

  // Cast any to ChannelWrapper to get type-safetiness through our own code
  channelWrapperLogs = connection.createChannel({
    setup: channel =>
      Promise.all([
        channel.assertExchange('lagoobernetes-logs', 'direct', { durable: true }),
      ]),
  });
}

async function sendToLagoobernetesLogs(
  severity,
  project,
  uuid,
  event,
  meta,
  message,
) {
  const payload = {
    severity,
    project,
    uuid,
    event,
    meta,
    message,
  };

  try {
    const buffer = Buffer.from(JSON.stringify(payload));
    const packageName = process.env.npm_package_name || '';
    const options = {
      persistent: true,
      appId: packageName,
    };
    await channelWrapperLogs.publish('lagoobernetes-logs', '', buffer, options);

    logger.log(severity, `lagoobernetes-logs: Send to lagoobernetes-logs: ${message}`);
  } catch (error) {
    logger.error(
      `lagoobernetes-logs: Error send to rabbitmq lagoobernetes-logs exchange, error: ${error}`,
    );
  }
}