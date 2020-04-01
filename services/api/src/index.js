// @flow

const { initSendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { initSendToLagoobernetesTasks } = require('@lagoobernetes/commons/src/tasks');
const waitForKeycloak = require('./util/waitForKeycloak');
const logger = require('./logger');
const createServer = require('./server');

initSendToLagoobernetesLogs();
initSendToLagoobernetesTasks();

(async () => {
  const { JWTSECRET, JWTAUDIENCE } = process.env;

  await waitForKeycloak();

  logger.debug('Starting to boot the application.');

  try {
    if (JWTSECRET == null) {
      throw new Error(
        'Required environment variable JWTSECRET is undefined or null!',
      );
    }

    if (JWTAUDIENCE == null) {
      throw new Error(
        'Required environment variable JWTAUDIENCE is undefined or null!',
      );
    }

    await createServer();

    logger.debug('Finished booting the application.');
  } catch (e) {
    logger.error('Error occurred while starting the application');
    logger.error(e.stack);
  }
})();
