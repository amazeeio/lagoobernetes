// @flow

const promisify = require('util').promisify;
const OpenShiftClient = require('openshift-client');
const R = require('ramda');
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

const lagoobernetesSshHost = R.propOr('ssh.lagoobernetes.svc', 'LAGOOBERNETES_SSH_HOST', process.env);
const lagoobernetesSshPort = R.propOr('2020', 'LAGOOBERNETES_SSH_PORT', process.env);

initSendToLagoobernetesLogs();
initSendToLagoobernetesTasks();

const failTask = async taskId => {
  try {
    await updateTask(taskId, {
      status: 'FAILED',
    });
  } catch (error) {
    logger.error(
      `Could not fail task ${taskId}. Message: ${error}`
    );
  }
}

const messageConsumer = async msg => {
  const { project, task, environment } = JSON.parse(msg.content.toString());

  logger.verbose(
    `Received JobOpenshift task for project: ${project.name}, task: ${task.id}`
  );

  const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
  const result = await getOpenShiftInfoForProject(project.name);
  const projectOpenShift = result.project;

  const ocsafety = string =>
    string.toLocaleLowerCase().replace(/[^0-9a-z-]/g, '-');

  try {
    var safeBranchName = ocsafety(environment.name);
    var safeProjectName = ocsafety(project.name);
    var openshiftConsole = projectOpenShift.openshift.consoleUrl.replace(
      /\/$/,
      ''
    );
    var openshiftToken = projectOpenShift.openshift.token || '';
    var openshiftProject = projectOpenShift.openshiftProjectPattern
      ? projectOpenShift.openshiftProjectPattern
          .replace('${branch}', safeBranchName)
          .replace('${project}', safeProjectName)
      : `${safeProjectName}-${safeBranchName}`;
    var jobName = `${openshiftProject}-${task.id}`;
  } catch (error) {
    logger.error(`Error while loading information for project ${project.name}`);
    logger.error(error);
    throw error;
  }

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

  // OpenShift API object
  const openshift = new OpenShiftClient.OApi({
    url: openshiftConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: openshiftToken
    }
  });

  const batchApi = new OpenShiftClient.Batch({
    url: openshiftConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: openshiftToken
    }
  });

  let projectStatus = {};
  try {
    const projectsGet = promisify(openshift.projects(openshiftProject).get);
    projectStatus = await projectsGet();
  } catch (err) {
    if (err.code == 404) {
      logger.error(`Project ${openshiftProject} does not exist, bailing`);
      failTask(taskId);
      return;
    } else {
      logger.error(err);
      throw new Error();
    }
  }

  // Get pod spec for desired service
  let taskPodSpec;
  try {
    const deploymentConfigsGet = promisify(openshift.ns(openshiftProject).deploymentconfigs.get);
    const deploymentConfigs = await deploymentConfigsGet();

    const oneContainerPerSpec = deploymentConfigs.items.reduce(
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
    const addTaskEnvVars = R.over(containerEnvLens, R.concat([
      {
        name: 'TASK_API_HOST',
        value: lagoobernetesApiRoute,
      },
      {
        name: 'TASK_SSH_HOST',
        value: lagoobernetesSshHost,
      },
      {
        name: 'TASK_SSH_PORT',
        value: lagoobernetesSshPort,
      },
      {
        name: 'TASK_DATA_ID',
        value: `${taskId}`,
      },
    ]));

    const containerCommandLens = R.lensPath(['containers', 0, 'command']);
    const setContainerCommand = R.set(containerCommandLens, [
      '/sbin/tini',
      '--',
      '/lagoobernetes/entrypoints.sh',
      '/bin/sh',
      '-c',
      task.command,
    ]);

    taskPodSpec = R.pipe(
      R.prop(task.service),
      removeCronjobs,
      addTaskEnvVars,
      setContainerCommand,
    )(oneContainerPerSpec);
  } catch (err) {
    logger.error(err);
    throw new Error(err);
  }

  // Create a new openshift job to run the lagoobernetes task
  let openshiftJob;
  try {
    const jobConfigPost = promisify(
      batchApi.namespaces(openshiftProject).jobs.post
    );
    openshiftJob = await jobConfigPost({
      body: jobConfig(jobName, taskPodSpec)
    });
  } catch (err) {
    logger.error(err);
    throw new Error();
  }

  // Update lagoobernetes task
  let updatedTask;
  try {
    const convertDateFormat = R.init;
    const dateOrNull = R.unless(R.isNil, convertDateFormat);

    updatedTask = await updateTask(taskId, {
      remoteId: openshiftJob.metadata.uid,
      created: convertDateFormat(openshiftJob.metadata.creationTimestamp),
      started: dateOrNull(openshiftJob.status.startTime)
    });
  } catch (error) {
    logger.error(
      `Could not update task ${project.name} ${task.name}. Message: ${error}`
    );
  }

  logger.verbose(`${openshiftProject}: Running job: ${task.name}`);

  const monitorPayload = {
    task: updatedTask.updateTask,
    project,
    environment
  };

  const taskMonitorLogs = await createTaskMonitor(
    'job-openshift',
    monitorPayload
  );

  sendToLagoobernetesLogs(
    'start',
    project.name,
    '',
    'task:job-openshift:start',
    {},
    `*[${project.name}]* Task \`${task.id}\` *${task.name}* started`
  );
};

const deathHandler = async (msg, lastError) => {
  const { project, task } = JSON.parse(msg.content.toString());

  failTask(taskId);

  sendToLagoobernetesLogs(
    'error',
    project.name,
    '',
    'task:job-openshift:error',
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
    'task:job-openshift:retry',
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

consumeTasks('job-openshift', messageConsumer, retryHandler, deathHandler);
