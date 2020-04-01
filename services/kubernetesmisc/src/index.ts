import { logger } from '@lagoobernetes/commons/src/local-logging';
import { sendToLagoobernetesLogs, initSendToLagoobernetesLogs } from '@lagoobernetes/commons/src/logs';
import { consumeTasks, initSendToLagoobernetesTasks } from '@lagoobernetes/commons/src/tasks';

import resticRestore from './handlers/resticRestore';
import kubernetesBuildCancel from "./handlers/kubernetesBuildCancel";

initSendToLagoobernetesLogs();
initSendToLagoobernetesTasks();

const messageConsumer = async msg => {

  const { key, data, data: { project } } = JSON.parse(msg.content.toString());

  logger.verbose(
    `Received MiscKubernetes message for key: ${key}`
  );

  switch(key) {
    case 'kubernetes:restic:backup:restore':
      resticRestore(data);
      break;

    case 'kubernetes:build:cancel':
      kubernetesBuildCancel(data);
      break;

    default:
      const meta = {
        msg: JSON.parse(msg.content.toString()),
      };
      sendToLagoobernetesLogs(
        'info',
        project.name,
        '',
        'task:misc-kubernetes;unhandled',
        meta,
        `*[${project.name}]* Unhandled MISC task ${key}`
      );
  }

};

const deathHandler = async (msg, lastError) => {
  const { key, data: { project } } = JSON.parse(msg.content.toString());

  sendToLagoobernetesLogs(
    'error',
    project.name,
    '',
    'task:misc-kubernetes:error',
    {},
    `*[${project.name}]* MISC Task \`${key}\` ERROR:
\`\`\`
${lastError}
\`\`\``
  );
};

const retryHandler = async (msg, error, retryCount, retryExpirationSecs) => {
  const { key, data: { project } } = JSON.parse(msg.content.toString());

  sendToLagoobernetesLogs(
    'warn',
    project,
    '',
    'task:misc-kubernetes:retry',
    {
      error: error.message,
      msg: JSON.parse(msg.content.toString()),
      retryCount: 1
    },
    `*[${project.name}]* MISC Task \`${key}\` ERROR:
\`\`\`
${error.message}
\`\`\`
Retrying in ${retryExpirationSecs} secs`
  );
};

consumeTasks('misc-kubernetes', messageConsumer, retryHandler, deathHandler);
