import * as R from 'ramda';
import Api, { ClientConfiguration } from 'kubernetes-client';
const Client = Api.Client1_13;

const { logger } = require('@lagoobernetes/commons/src/local-logging');
const {
  getOpenShiftInfoForProject,
  updateTask
} = require('@lagoobernetes/commons/src/api');
const {
  sendToLagoobernetesLogs,
  initSendToLagoobernetesLogs
} = require('@lagoobernetes/commons/src/logs');
const {
  consumeTasks,
  initSendToLagoobernetesTasks,
  createTaskMonitor
} = require('@lagoobernetes/commons/src/tasks');

const lagoobernetesApiRoute = R.compose(
  // Default to the gateway IP in virtualbox, so pods running in minishift can
  // connect to docker-for-mac containers.
  R.defaultTo('http://10.0.2.2:3000'),
  R.find(R.test(/api-/)),
  R.split(','),
  R.propOr('', 'LAGOOBERNETES_ROUTES')
)(process.env);

const lagoobernetesSshHost = R.propOr(
  'ssh.lagoobernetes.svc',
  'LAGOOBERNETES_SSH_HOST',
  process.env
);
const lagoobernetesSshPort = R.propOr('2020', 'LAGOOBERNETES_SSH_PORT', process.env);

initSendToLagoobernetesLogs();
initSendToLagoobernetesTasks();

const failTask = async taskId => {
  try {
    await updateTask(taskId, {
      status: 'FAILED'
    });
  } catch (error) {
    logger.error(`Could not fail task ${taskId}. Message: ${error}`);
  }
};

const jobConfig = (name, spec) => {
  let config = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      template: {
        metadata: {
          name: 'pi'
        },
        spec: {
          ...spec,
          restartPolicy: 'Never'
        }
      }
    }
  };

  return config;
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

const ocsafety = string =>
  string.toLocaleLowerCase().replace(/[^0-9a-z-]/g, '-');

const getNamespaceName = (project, environment, projectInfo) => {
  try {
    const safeBranchName = ocsafety(environment.name);
    const safeProjectName = ocsafety(project.name);
    const namespace = projectInfo.openshiftProjectPattern
      ? projectInfo.openshiftProjectPattern
          .replace('${branch}', safeBranchName)
          .replace('${project}', safeProjectName)
      : `${safeProjectName}-${safeBranchName}`;
    return { namespace };
  } catch (error) {
    logger.error(`Error while loading information for project ${project.name}`);
    logger.error(error);
    throw error;
  }
};

const projectExists = async (client, namespace) => {
  const namespaces = await client.api.v1.namespaces(namespace).get();
  if (
    namespaces.statusCode !== 200 &&
    namespaces.body.metadata.name !== namespace
  ) {
    return false;
  }

  return true;
};

const getPodSpec = async (client, namespace, task, taskId) => {
  try {
    const deployment = await client.apis.app.v1
      .namespaces(namespace)
      .deployments.get();
    const oneContainerPerSpec = deployment.body.items.reduce(
      (specs, deploymentConfig) => ({
        ...specs,
        ...deploymentConfig.spec.template.spec.containers.reduce(
          (specs, container) => ({
            ...specs,
            [container.name]: {
              ...deploymentConfig.spec.template.spec,
              containers: [container]
            }
          }),
          {}
        )
      }),
      {}
    );

    if (!oneContainerPerSpec[task.service]) {
      logger.error(`No spec for service ${task.service}, bailing`);
      failTask(taskId);
      return;
    }

    const cronjobEnvVars = env => env.name === 'CRONJOBS';
    const containerEnvLens = R.lensPath(['containers', 0, 'env']);
    const removeCronjobs = R.over(containerEnvLens, R.reject(cronjobEnvVars));
    const addTaskEnvVars = R.over(
      containerEnvLens,
      R.concat([
        {
          name: 'TASK_API_HOST',
          value: lagoobernetesApiRoute
        },
        {
          name: 'TASK_SSH_HOST',
          value: lagoobernetesSshHost
        },
        {
          name: 'TASK_SSH_PORT',
          value: lagoobernetesSshPort
        },
        {
          name: 'TASK_DATA_ID',
          value: `${taskId}`
        }
      ])
    );

    const containerCommandLens = R.lensPath(['containers', 0, 'command']);
    const setContainerCommand = R.set(containerCommandLens, [
      '/sbin/tini',
      '--',
      '/lagoobernetes/entrypoints.sh',
      '/bin/sh',
      '-c',
      task.command
    ]);

    const taskPodSpec = R.pipe(
      R.prop(task.service),
      removeCronjobs,
      addTaskEnvVars,
      setContainerCommand
    )(oneContainerPerSpec);

    return taskPodSpec;
  } catch (err) {
    logger.error(err);
    throw new Error(err);
  }
};

const createJob = async (client, namespace, jobName, taskPodSpec) => {
  try {
    return client.apis.batch.v1
      .namespaces(namespace)
      .jobs.post({ body: jobConfig(jobName, taskPodSpec) });
  } catch (err) {
    logger.error(err);
    throw new Error();
  }
};

const performUpdateTask = async (taskId, job, task, project) => {
  try {
    const convertDateFormat = R.init;
    const dateOrNull = R.unless(R.isNil, convertDateFormat);

    const updatedTask = await updateTask(taskId, {
      remoteId: job.body.metadata.uid,
      created: convertDateFormat(job.body.metadata.creationTimestamp),
      started: dateOrNull(job.body.metadata.creationTimestamp)
    });

    return updatedTask;
  } catch (error) {
    logger.error(
      `Could not update task ${project.name} ${task.name}. Message: ${error}`
    );
  }
};

const deathHandler = async (msg, lastError) => {
  const { project, task } = JSON.parse(msg.content.toString());

  const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
  failTask(taskId);

  sendToLagoobernetesLogs(
    'error',
    project.name,
    '',
    'task:job-kubernetes:error',
    {},
    `*[${project.name}]* Task \`${task.id}\` *${task.name}* ERROR:
\`\`\`
${lastError}
\`\`\``
  );
};

const retryHandler = async (msg, error, retryCount, retryExpirationSecs) => {
  const { project, task } = JSON.parse(msg.content.toString());

  sendToLagoobernetesLogs(
    'warn',
    project.name,
    '',
    'task:job-kubernetes:retry',
    {
      error: error.message,
      msg: JSON.parse(msg.content.toString()),
      retryCount: 1
    },
    `*[${project.name}]* Task \`${task.id}\` *${task.name}* ERROR:
\`\`\`
${error.message}
\`\`\`
Retrying job in ${retryExpirationSecs} secs`
  );
};

const messageConsumer = async msg => {
  const { project, task, environment } = JSON.parse(msg.content.toString());

  logger.verbose(
    `Received Kubernetesjobs task for project: ${project.name}, task: ${task.id}`
  );

  const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;

  const { project: projectInfo } = await getOpenShiftInfoForProject(
    project.name
  );

  const { url, token } = getUrlTokenFromProjectInfo(projectInfo, project.name);
  const config: ClientConfiguration = getConfig(url, token);
  const client = new Client({ config });

  const { namespace } = getNamespaceName(project, environment, projectInfo);
  if (!(await projectExists(client, namespace))) {
    logger.error(`Project ${namespace} does not exist, bailing`);
    return;
  }

  // Get pod spec for desired service
  const taskPodSpec = await getPodSpec(client, namespace, task, taskId);
  // Create a new kubernetes job to run the lagoobernetes task
  const jobName = `${namespace}-${task.id}`;
  const job = await createJob(client, namespace, jobName, taskPodSpec);

  // Update lagoobernetes task
  const { updateTask } = await performUpdateTask(taskId, job, task, project);

  logger.verbose(`${namespace}: Running job: ${task.name}`);

  const monitorPayload = { task: updateTask, project, environment };

  await createTaskMonitor('job-kubernetes', monitorPayload);
  sendToLagoobernetesLogs(
    'start',
    project.name,
    '',
    'task:job-kubernetes:start',
    {},
    `*[${project.name}]* Task \`${task.id}\` *${task.name}* started`
  );
};

consumeTasks('job-kubernetes', messageConsumer, retryHandler, deathHandler);
