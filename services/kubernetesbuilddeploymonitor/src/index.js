const promisify = require('util').promisify;
const kubernetesClient = require('kubernetes-client');
const sleep = require("es7-sleep");
const R = require('ramda');
const { logger } = require('@lagoobernetes/commons/src/local-logging');

const {
  getOpenShiftInfoForProject,
  getEnvironmentByName,
  updateEnvironment,
  getDeploymentByRemoteId,
  getDeploymentByName,
  updateDeployment,
  setEnvironmentServices,
} = require('@lagoobernetes/commons/src/api');

const { sendToLagoobernetesLogs, initSendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { consumeTaskMonitor, initSendToLagoobernetesTasks } = require('@lagoobernetes/commons/src/tasks');

class BuildNotCompletedYet extends Error {
  constructor(message) {
    super(message);
    this.name = 'BuildNotCompletedYet';
  }
}

initSendToLagoobernetesLogs();
initSendToLagoobernetesTasks();

const messageConsumer = async msg => {
  const {
    buildName: jobName,
    projectName,
    openshiftProject,
    branchName,
    sha
  } = JSON.parse(msg.content.toString())

  logger.verbose(`Received builddeploy-kubernetes monitoring task for project: ${projectName}, jobName: ${jobName}, openshiftProject: ${openshiftProject}, branch: ${branchName}, sha: ${sha}`);

  const projectResult = await getOpenShiftInfoForProject(projectName);
  const project = projectResult.project

  const environmentResult = await getEnvironmentByName(branchName, project.id)
  const environment = environmentResult.environmentByName

  let deploymentResult;
  let deployment;
  try {
    deploymentResult = await getDeploymentByName(openshiftProject, jobName);
    deployment = deploymentResult.environment.deployments[0];
  }catch(error) {
    logger.warn(`Error while fetching deployment openshiftproject: ${openshiftProject}: ${error}`)
    throw(error)
  }

  try {
    var gitSha = sha
    var kubernetesConsole = project.openshift.consoleUrl.replace(/\/$/, "");
    var kubernetesToken = project.openshift.token || ""
  } catch(error) {
    logger.warn(`Error while loading information for project ${projectName}: ${error}`)
    throw(error)
  }

  // kubernetes API object
  const kubernetesApi = new kubernetesClient.Api({
    url: kubernetesConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: kubernetesToken
    },
  });

  // Kubernetes API Object - needed as some API calls are done to the Kubernetes API part of kubernetes and
  // the kubernetes API does not support them.
  const kubernetesCore = new kubernetesClient.Core({
    url: kubernetesConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: kubernetesToken
    },
  });

  const kubernetesBatchApi = new kubernetesClient.Batch({
    url: kubernetesConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: kubernetesToken
    }
  });

  // Check if project exists
  try {
    const namespacesSearch = promisify(kubernetesCore.namespaces.get);
    const namespacesResult = await namespacesSearch({
      qs: {
        fieldSelector: `metadata.name=${openshiftProject}`
      }
    });
    const namespaces = R.propOr([], 'items', namespacesResult);

    // An empty list means the namespace does not exist
    if (R.isEmpty(namespaces)) {
      logger.error(`Project ${openshiftProject} does not exist, bailing`)
      return; // we are done here
    }
  } catch (err) {
    logger.error(err);
    throw new Error();
  }

  let jobInfo;
  try {
    const jobsGet = promisify(kubernetesBatchApi.namespaces(openshiftProject).jobs(jobName).get);
    jobInfo = await jobsGet();
  } catch (err) {
    if (err.code == 404) {
      logger.error(`Job ${jobName} does not exist, bailing`);
      return;
    } else {
      logger.error(err);
      throw new Error();
    }
  }


  const jobsLogGet = async () => {
    // First fetch the pod(s) used to run this job
    const podsGet = promisify(kubernetesCore.namespaces(openshiftProject).pods.get);
    const pods = await podsGet({
      qs: {
        labelSelector: `job-name=${jobName}`
      }
    });
    const podNames = pods.items.map(pod => pod.metadata.name);

    // Combine all logs from all pod(s)
    let finalLog = '';
    for (const podName of podNames) {
      const podLogGet = promisify(kubernetesCore.namespaces(openshiftProject).pods(podName).log.get)
      const podLog = await podLogGet();

      finalLog =
        finalLog +
        `
========================================
Logs on pod ${podName}
========================================
${podLog}`;
    }

    return finalLog;
  };

  let status;
  try {
    const deployment = await getDeploymentByRemoteId(jobInfo.metadata.uid);

    if (!deployment.deploymentByRemoteId) {
      throw new Error(`No deployment found with remote id ${jobInfo.metadata.uid}`);
    }

    const convertDateFormat = R.init;
    const dateOrNull = R.unless(R.isNil, convertDateFormat);

    // The status needs a mapping from k8s job status (active, succeeded, failed) to api deployment statuses (new, pending, running, cancelled, error, failed, complete)
    status = ((status) => {
      switch (status) {
        case 'active':
          return 'running';
        case 'complete':
          return 'complete';
        case 'failed':
        default:
          return 'failed';
      }
    })(jobInfo.status.active ? 'active' : jobInfo.status.conditions[0].type.toLowerCase());

    await updateDeployment(deployment.deploymentByRemoteId.id, {
      status: status.toUpperCase(),
      created: convertDateFormat(jobInfo.metadata.creationTimestamp),
      started: dateOrNull(jobInfo.status.startTime),
      completed: dateOrNull(jobInfo.status.completionTime),
    });
  } catch (error) {
    logger.error(`Could not update deployment ${projectName} ${jobName}. Message: ${error}`);
  }

  const meta = JSON.parse(msg.content.toString())
  const logLink = deployment.uiLink;
  let logMessage = ''
  if (sha) {
    meta.shortSha = sha.substring(0, 7)
    logMessage = `\`${branchName}\` (${sha.substring(0, 7)})`
  } else {
    logMessage = `\`${branchName}\``
  }

  switch (status) {
    case "running":
      sendToLagoobernetesLogs('info', projectName, "", `task:builddeploy-kubernetes:${status}`, meta,
        `*[${projectName}]* ${logMessage} Build \`${jobName}\` running`
      )
      throw new BuildNotCompletedYet(`*[${projectName}]* ${logMessage} Build \`${jobName}\` running`)
      break;

    case "failed":
      try {
        const buildLog = await jobsLogGet()
        await saveBuildLog(jobName, projectName, branchName, buildLog, status, jobInfo.metadata.uid)
      } catch (err) {
        logger.warn(`${projectName} ${jobName}: Error while getting and sending to lagoobernetes-logs, Error: ${err}.`)
      }
      sendToLagoobernetesLogs('error', projectName, "", `task:builddeploy-kubernetes:${status}`, meta,
        `*[${projectName}]* ${logMessage} Build \`${jobName}\` failed. <${logLink}|Logs>`
      )
      break;

    case "complete":
      try {
        const buildLog = await jobsLogGet()
        await saveBuildLog(jobName, projectName, branchName, buildLog, status, jobInfo.metadata.uid)
      } catch (err) {
        logger.warn(`${projectName} ${jobName}: Error while getting and sending to lagoobernetes-logs, Error: ${err}.`)
      }
      let configMap = {};
      try {
        const configMapSearch = promisify(kubernetesCore.namespaces(openshiftProject).configmaps.get);
        const configMapSearchResult = await configMapSearch({
          qs: {
            fieldSelector: `metadata.name=lagoobernetes-env`
          }
        });

        if (!R.isNil(configMapSearchResult)) {
          configMap = configMapSearchResult
        }
      } catch (err) {
        if (err.code == 404) {
          logger.error(`configmap lagoobernetes-env does not exist, continuing without routes information`)
        } else {
          logger.error(err)
          throw new Error
        }
      }

      const route = configMap.items[0].data.LAGOOBERNETES_ROUTE
      const routes = configMap.items[0].data.LAGOOBERNETES_ROUTES.split(',').filter(e => e !== route);
      meta.route = route
      meta.routes = routes
      sendToLagoobernetesLogs('info', projectName, "", `task:builddeploy-kubernetes:${status}`, meta,
        `*[${projectName}]* ${logMessage} Build \`${jobName}\` complete. <${logLink}|Logs> \n ${route}\n ${routes.join("\n")}`
      )
      try {
        const updateEnvironmentResult = await updateEnvironment(
          environment.id,
          `{
            route: "${configMap.items[0].data.LAGOOBERNETES_ROUTE}",
            routes: "${configMap.items[0].data.LAGOOBERNETES_ROUTES}",
            monitoringUrls: "${configMap.items[0].data.LAGOOBERNETES_MONITORING_URLS}",
            project: ${project.id}
          }`
        );
      } catch (err) {
        logger.warn(`${openshiftProject} ${jobName}: Error while updating routes in API, Error: ${err}. Continuing without update`)
      }

      // Tell api what services are running in this environment
      try {

        // TODO: Using Deployments may be better

        /*
          const deploymentConfigsGet = promisify(kubernetesApi.namespaces(openshiftProject).deployments.get);
          const deploymentConfigs = await deployments({});

          const serviceNames = deploymentConfigs.items.reduce(
            (names, deploymentConfig) => [
              ...names,
              ...deploymentConfig.spec.template.spec.containers.reduce(
                (names, container) => [
                  ...names,
                  container.name
                ],
                []
              )
            ],
            []
          );
        */

        const podsGet = promisify(kubernetesCore.namespaces(openshiftProject).pods.get)
        const pods = await podsGet()

        const serviceNames = pods.items.reduce(
          (names, pod) => [
            ...names,
            ...pod.spec.containers.reduce(
              (names, container) => [
                ...names,
                container.name
              ],
              []
            )
          ],
          []
        );
        await setEnvironmentServices(environment.id, serviceNames);
      } catch (err) {
        logger.error(`${openshiftProject} ${jobName}: Error while updating environment services in API, Error: ${err}`)
      }
      break;

    default:
      sendToLagoobernetesLogs('info', projectName, "", `task:builddeploy-kubernetes:${status}`, meta,
        `*[${projectName}]* ${logMessage} Build \`${jobName}\` phase ${status}`
      )
      throw new BuildNotCompletedYet(`*[${projectName}]* ${logMessage} Build \`${jobName}\` phase ${status}`)
      break;
  }
}

const saveBuildLog = async(jobName, projectName, branchName, buildLog, status, remoteId) => {
  const meta = {
    jobName,
    branchName,
    buildPhase: status,
    remoteId
  };

  sendToLagoobernetesLogs('info', projectName, "", `build-logs:builddeploy-kubernetes:${jobName}`, meta,
    buildLog
  );
};

const deathHandler = async (msg, lastError) => {
  const {
    jobName,
    projectName,
    openshiftProject,
    branchName,
    sha
  } = JSON.parse(msg.content.toString())

  let logMessage = ''
  if (sha) {
    logMessage = `\`${branchName}\` (${sha.substring(0, 7)})`
  } else {
    logMessage = `\`${branchName}\``
  }

  const task = "task:builddeploy-kubernetes:error";
  const errorMsg = `*[${projectName}]* ${logMessage} Build \`${jobName}\` ERROR: \`\`\` ${lastError} \`\`\``;
  sendToLagoobernetesLogs('error', projectName, "", task,  {}, errorMsg);

}

consumeTaskMonitor('builddeploy-kubernetes', messageConsumer, deathHandler);
