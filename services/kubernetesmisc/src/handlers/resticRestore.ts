import * as R from 'ramda';
import { getOpenShiftInfoForProject, updateTask } from '@lagoobernetes/commons/src/api';
import { BaaS } from '@lagoobernetes/commons/src/openshiftApi';
import { logger } from "@lagoobernetes/commons/src/local-logging";
import { sendToLagoobernetesLogs } from '@lagoobernetes/commons/src/logs';
import { promisify } from 'util';

const ocsafety = string => string.toLocaleLowerCase().replace(/[^0-9a-z-]/g, '-');

const generateSanitizedNames = (project, environment, projectInfo, backup) => {
  try {
    const safeBranchName = ocsafety(environment.name);
    const safeProjectName = ocsafety(project.name);
    const namespace = projectInfo.openshiftProjectPattern
      ? projectInfo.openshiftProjectPattern
          .replace('${branch}', safeBranchName)
          .replace('${project}', safeProjectName)
      : `${safeProjectName}-${safeBranchName}`;
    const restoreName = `restore-${R.slice(0, 7, backup.backupId)}`;
    return { namespace, safeProjectName, restoreName };
  } catch (error) {
    logger.error(`Error while loading information for project ${project.name}`);
    logger.error(error);
    throw error;
  }
};

const getUrlTokenFromProjectInfo = (projectOpenShift, name) => {
  try {
    const url = projectOpenShift.openshift.consoleUrl.replace(/\/$/, '');
    const token = projectOpenShift.openshift.token || '';
    return { url, token };
  } catch (error) {
    logger.warn(
      `Error while loading information for project ${name}: ${error}`
    );
    throw error;
  }
};

const getConfig = (url, token) => ({
  url,
  insecureSkipTlsVerify: true,
  auth: {
    bearer: token
  }
});

const restoreConfig = (name, backupId, safeProjectName) => {
  let config = {
    apiVersion: 'backup.appuio.ch/v1alpha1',
    kind: 'Restore',
    metadata: {
      name
    },
    spec: {
      snapshot: backupId,
      restoreMethod: {
        s3: {},
      },
      backend: {
        s3: {
          bucket: `baas-${safeProjectName}`
        },
        repoPasswordSecretRef: {
          key: 'repo-pw',
          name: 'baas-repo-pw'
        },
      },
    },
  };

  return config;
};

async function resticRestore (data: any) {
  const { backup, restore, project, environment } = data;
  const { project: projectInfo} = await getOpenShiftInfoForProject(project.name);
  const { url, token } = getUrlTokenFromProjectInfo(projectInfo, project.name);
  const { namespace, safeProjectName, restoreName } = generateSanitizedNames(project, environment, projectInfo, backup);

  // Kubernetes API Object - needed as some API calls are done to the Kubernetes API part of OpenShift and
  // the OpenShift API does not support them.
  const config = getConfig(url, token)
  const baas = new BaaS(config);

  try {

    const config = {
      body: restoreConfig(restoreName, backup.backupId, safeProjectName)
    };

    const restoreConfigPost = promisify(
      baas.ns(namespace).restores.post
    );
    await restoreConfigPost(config);

  } catch (err) {
    logger.error(err);
    throw new Error();
  }

  logger.verbose(`${namespace}: Creating restore: ${backup.backupId}`);

  sendToLagoobernetesLogs(
    'start',
    project.name,
    '',
    'task:misc-kubernetes:start',
    data,
    `*[${project.name}]* Restore \`${restore.id}\` *${backup.backupId}* started`
  );
}

export default resticRestore;