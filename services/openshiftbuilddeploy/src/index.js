// @flow

const Promise = require("bluebird");
const OpenShiftClient = require('openshift-client');
const sleep = require("es7-sleep");
const R = require('ramda');
const sha1 = require('sha1');
const crypto = require('crypto');
const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { getOpenShiftInfoForProject, addOrUpdateEnvironment, getEnvironmentByName, addDeployment } = require('@lagoobernetes/commons/src/api');

const { sendToLagoobernetesLogs, initSendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const { consumeTasks, initSendToLagoobernetesTasks, createTaskMonitor } = require('@lagoobernetes/commons/src/tasks');

initSendToLagoobernetesLogs();
initSendToLagoobernetesTasks();

const CI = process.env.CI || "false"
const lagoobernetesGitSafeBranch = process.env.LAGOOBERNETES_GIT_SAFE_BRANCH || "master"
const lagoobernetesVersion = process.env.LAGOOBERNETES_VERSION
const overwriteOcBuildDeployDindImage = process.env.OVERWRITE_OC_BUILD_DEPLOY_DIND_IMAGE
const NativeCronPodMinimumFrequency = process.env.NATIVE_CRON_POD_MINIMUM_FREQUENCY || "15"
const lagoobernetesEnvironmentType = process.env.LAGOOBERNETES_ENVIRONMENT_TYPE || "development"
const jwtSecret = process.env.JWTSECRET || "super-secret-string"

const messageConsumer = async msg => {
  const {
    projectName,
    branchName,
    sha,
    type,
    headBranchName,
    headSha,
    baseBranchName,
    baseSha,
    pullrequestTitle,
    promoteSourceEnvironment,
  } = JSON.parse(msg.content.toString())

  logger.verbose(`Received DeployOpenshift task for project: ${projectName}, branch: ${branchName}, sha: ${sha}`);

  const result = await getOpenShiftInfoForProject(projectName);
  const projectOpenShift = result.project

  const ocsafety = string => string.toLocaleLowerCase().replace(/[^0-9a-z-]/g,'-')

  try {
    var safeBranchName = ocsafety(branchName)
    var safeProjectName = ocsafety(projectName)


    var overlength = 58 - safeProjectName.length;
    if ( safeBranchName.length > overlength ) {
      var hash = sha1(safeBranchName).substring(0,4)

      safeBranchName = safeBranchName.substring(0, overlength-5)
      safeBranchName = safeBranchName.concat('-' + hash)
    }

    var environmentType = branchName === projectOpenShift.productionEnvironment ? 'production' : 'development';
    var gitSha = sha
    var projectId = projectOpenShift.id
    var openshiftConsole = projectOpenShift.openshift.consoleUrl.replace(/\/$/, "");
    var openshiftToken = projectOpenShift.openshift.token || ""
    var openshiftProject = projectOpenShift.openshiftProjectPattern ? projectOpenShift.openshiftProjectPattern.replace('${branch}',safeBranchName).replace('${project}', safeProjectName) : `${safeProjectName}-${safeBranchName}`
    var openshiftName = projectOpenShift.openshift.name
    var openshiftProjectUser = projectOpenShift.openshift.projectUser || ""
    var deployPrivateKey = projectOpenShift.privateKey
    var gitUrl = projectOpenShift.gitUrl
    var subfolder = projectOpenShift.subfolder || ""
    var routerPattern = projectOpenShift.openshift.routerPattern ? projectOpenShift.openshift.routerPattern.replace('${branch}',safeBranchName).replace('${project}', safeProjectName) : ""
    var prHeadBranchName = headBranchName || ""
    var prHeadSha = headSha || ""
    var prBaseBranchName = baseBranchName || ""
    var prBaseSha = baseSha || ""
    var prPullrequestTitle = pullrequestTitle || ""
    var graphqlEnvironmentType = environmentType.toUpperCase()
    var graphqlGitType = type.toUpperCase()
    var openshiftPromoteSourceProject = promoteSourceEnvironment ? `${safeProjectName}-${ocsafety(promoteSourceEnvironment)}` : ""
    // A secret which is the same across all Environments of this Lagoobernetes Project
    var projectSecret = crypto.createHash('sha256').update(`${projectName}-${jwtSecret}`).digest('hex');
  } catch(error) {
    logger.error(`Error while loading information for project ${projectName}`)
    logger.error(error)
    throw(error)
  }

  // Deciding which git REF we would like deployed
  switch (type) {
    case "branch":
      // if we have a sha given, we use that, if not we fall back to the branch (which needs be prefixed by `origin/`
      var gitRef = gitSha ? gitSha : `origin/${branchName}`
      var deployBaseRef = branchName
      var deployHeadRef = null
      var deployTitle = null
      break;

    case "pullrequest":
      var gitRef = gitSha
      var deployBaseRef = prBaseBranchName
      var deployHeadRef = prHeadBranchName
      var deployTitle = prPullrequestTitle
      break;

    case "promote":
      var gitRef = `origin/${promoteSourceEnvironment}`
      var deployBaseRef = promoteSourceEnvironment
      var deployHeadRef = null
      var deployTitle = null
      break;
  }


  // Generates a buildconfig object
  const buildconfig = (resourceVersion, secret, type, environment = {}) => {

    let buildFromImage = {}
    // During CI we want to use the OpenShift Registry for our build Image and use the OpenShift registry for the base Images
    if (CI == "true") {
      buildFromImage = {
        "kind": "ImageStreamTag",
        "namespace": "lagoobernetes",
        "name": "oc-build-deploy-dind:latest",
      }
    } else if (overwriteOcBuildDeployDindImage) {
      // allow to overwrite the image we use via OVERWRITE_OC_BUILD_DEPLOY_DIND_IMAGE env variable
      buildFromImage = {
        "kind": "DockerImage",
        "name": overwriteOcBuildDeployDindImage,
      }
    } else if (lagoobernetesEnvironmentType == 'production') {
      // we are a production environment, use the amazeeio/ image with our current lagoobernetes version
      buildFromImage = {
        "kind": "DockerImage",
        "name": `amazeeio/oc-build-deploy-dind:${lagoobernetesVersion}`,
      }
    } else {
      // we are a development enviornment, use the amazeeiolagoobernetes image with the same branch name
      buildFromImage = {
        "kind": "DockerImage",
        "name": `amazeeiolagoobernetes/oc-build-deploy-dind:${lagoobernetesGitSafeBranch}`,
      }
    }

    let buildconfig = {
      "apiVersion": "v1",
      "kind": "BuildConfig",
      "metadata": {
          "creationTimestamp": null,
          "name": "lagoobernetes",
          "resourceVersion": resourceVersion
      },
      "spec": {
          "nodeSelector": null,
          "postCommit": {},
          "resources": {},
          "runPolicy": "SerialLatestOnly",
          "successfulBuildsHistoryLimit": 1,
          "failedBuildsHistoryLimit": 1,
          "source": {
              "git": {
                  "uri": gitUrl
              },
              "type": "Git"
          },
          "strategy": {
              "customStrategy": {
                  "secrets": [
                      {
                          "secretSource": {
                              "name": secret
                          },
                          "mountPath": "/var/run/secrets/lagoobernetes/deployer"
                      },
                      {
                        "secretSource": {
                            "name": "lagoobernetes-sshkey"
                        },
                        "mountPath": "/var/run/secrets/lagoobernetes/ssh"
                    }
                  ],
                  "env": [
                      {
                          "name": "TYPE",
                          "value": type
                      },
                      {
                          "name": "GIT_REF",
                          "value": gitRef
                      },
                      {
                          "name": "SUBFOLDER",
                          "value": subfolder
                      },
                      {
                          "name": "SAFE_BRANCH",
                          "value": safeBranchName
                      },
                      {
                          "name": "BRANCH",
                          "value": branchName
                      },
                      {
                          "name": "SAFE_PROJECT",
                          "value": safeProjectName
                      },
                      {
                          "name": "PROJECT",
                          "value": projectName
                      },
                      {
                          "name": "ROUTER_URL",
                          "value": routerPattern
                      },
                      {
                          "name": "ENVIRONMENT_TYPE",
                          "value": environmentType
                      },
                      {
                          "name": "OPENSHIFT_NAME",
                          "value": openshiftName
                      },
                      {
                          "name": "PROJECT_SECRET",
                          "value": projectSecret
                      },
                      {
                        "name": "NATIVE_CRON_POD_MINIMUM_FREQUENCY",
                        "value": NativeCronPodMinimumFrequency
                      }
                  ],
                  "forcePull": true,
                  "from": buildFromImage,
              },
              "type": "Custom"
          }
      }
    }
    if (CI == "true") {
      buildconfig.spec.strategy.customStrategy.env.push({"name": "CI","value": CI})
    }
    if (type == "pullrequest") {
      buildconfig.spec.strategy.customStrategy.env.push({"name": "PR_HEAD_BRANCH","value": prHeadBranchName})
      buildconfig.spec.strategy.customStrategy.env.push({"name": "PR_HEAD_SHA","value": prHeadSha})
      buildconfig.spec.strategy.customStrategy.env.push({"name": "PR_BASE_BRANCH","value": prBaseBranchName})
      buildconfig.spec.strategy.customStrategy.env.push({"name": "PR_BASE_SHA","value": prBaseSha})
      buildconfig.spec.strategy.customStrategy.env.push({"name": "PR_TITLE","value": prPullrequestTitle})
    }
    if (type == "promote") {
      buildconfig.spec.strategy.customStrategy.env.push({"name": "PROMOTION_SOURCE_ENVIRONMENT","value": promoteSourceEnvironment})
      buildconfig.spec.strategy.customStrategy.env.push({"name": "PROMOTION_SOURCE_OPENSHIFT_PROJECT","value": openshiftPromoteSourceProject})
    }
    if (!R.isEmpty(projectOpenShift.envVariables)) {
      buildconfig.spec.strategy.customStrategy.env.push({"name": "LAGOOBERNETES_PROJECT_VARIABLES", "value": JSON.stringify(projectOpenShift.envVariables)})
    }
    if (!R.isEmpty(environment.envVariables)) {
      buildconfig.spec.strategy.customStrategy.env.push({"name": "LAGOOBERNETES_ENVIRONMENT_VARIABLES", "value": JSON.stringify(environment.envVariables)})
    }
    return buildconfig
  }

  // OpenShift API object
  const openshift = new OpenShiftClient.OApi({
    url: openshiftConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: openshiftToken
    },
  });

  // Kubernetes API Object - needed as some API calls are done to the Kubernetes API part of OpenShift and
  // the OpenShift API does not support them.
  const kubernetes = new OpenShiftClient.Core({
    url: openshiftConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: openshiftToken
    },
  });


  // openshift-client does not know about the OpenShift Resources, let's teach it.
  openshift.ns.addResource('buildconfigs');
  openshift.ns.addResource('rolebindings');
  openshift.addResource('projectrequests');

  // If we should promote, first check if the source project does exist
  if (type == "promote") {
    try {
      const promotionSourceProjectsGet = Promise.promisify(openshift.projects(openshiftPromoteSourceProject).get, { context: openshift.projects(openshiftPromoteSourceProject) })
      await promotionSourceProjectsGet()
      logger.info(`${openshiftProject}: Promotion Source Project ${openshiftPromoteSourceProject} exists, continuing`)
    } catch (err) {
      const error = `${openshiftProject}: Promotion Source Project ${openshiftPromoteSourceProject} does not exists, ${err}`
      logger.error(error)
      throw new Error(error)
    }
  }

  // Create a new Project if it does not exist
  let projectStatus = {}
  try {
    const projectsGet = Promise.promisify(openshift.projects(openshiftProject).get, { context: openshift.projects(openshiftProject) })
    projectStatus = await projectsGet()
    logger.info(`${openshiftProject}: Project ${openshiftProject} already exists, continuing`)
  } catch (err) {
    // a non existing project also throws an error, we check if it's a 404, means it does not exist, so we create it.
    if (err.code == 404 || err.code == 403) {
      logger.info(`${openshiftProject}: Project ${openshiftProject}  does not exist, creating`)
      const projectrequestsPost = Promise.promisify(openshift.projectrequests.post, { context: openshift.projectrequests })
      await projectrequestsPost({ body: {"apiVersion":"v1","kind":"ProjectRequest","metadata":{"name":openshiftProject},"displayName":`[${projectName}] ${branchName}`} });
    } else {
      logger.error(err)
      throw new Error
    }
  }

  // Update GraphQL API with information about this environment
  let environment;
  try {
    environment = await addOrUpdateEnvironment(branchName, projectId, graphqlGitType, deployBaseRef, graphqlEnvironmentType, openshiftProject, deployHeadRef, deployTitle)
    logger.info(`${openshiftProject}: Created/Updated Environment in API`)
  } catch (err) {
    logger.error(err)
    throw new Error
  }

  // Used to create RoleBindings
  const rolebindingsPost = Promise.promisify(openshift.ns(openshiftProject).rolebindings.post, { context: openshift.ns(openshiftProject).rolebindings })


  // If a project user is given, give it access to our project.
  if (openshiftProjectUser) {
    try {
      const rolebindingsGet = Promise.promisify(openshift.ns(openshiftProject).rolebindings(`${openshiftProjectUser}-edit`).get, { context: openshift.ns(openshiftProject).rolebindings(`${openshiftProjectUser}-edit`) })
      projectUserRoleBinding = await rolebindingsGet()
      logger.info(`${openshiftProject}: RoleBinding ${openshiftProjectUser}-edit already exists, continuing`)
    } catch (err) {
      if (err.code == 404) {
        logger.info(`${openshiftProject}: RoleBinding ${openshiftProjectUser}-edit does not exists, creating`)
        await rolebindingsPost({ body: {"kind":"RoleBinding","apiVersion":"v1","metadata":{"name":`${openshiftProjectUser}-edit`,"namespace":openshiftProject},"roleRef":{"name":"edit"},"subjects":[{"name":openshiftProjectUser,"kind":"User","namespace":openshiftProject}]}})
      } else {
        logger.error(err)
        throw new Error
      }
    }
  }

  // Create ServiceAccount if it does not exist yet.
  try {
    const serviceaccountsGet = Promise.promisify(kubernetes.ns(openshiftProject).serviceaccounts('lagoobernetes-deployer').get, { context: kubernetes.ns(openshiftProject).serviceaccounts('lagoobernetes-deployer') })
    projectStatus = await serviceaccountsGet()
    logger.info(`${openshiftProject}: ServiceAccount lagoobernetes-deployer already exists, continuing`)
  } catch (err) {
    if (err.code == 404) {
      logger.info(`${openshiftProject}: ServiceAccount lagoobernetes-deployer does not exists, creating`)
      const serviceaccountsPost = Promise.promisify(kubernetes.ns(openshiftProject).serviceaccounts.post, { context: kubernetes.ns(openshiftProject).serviceaccounts })
      await serviceaccountsPost({ body: {"kind":"ServiceAccount","apiVersion":"v1","metadata":{"name":"lagoobernetes-deployer"} }})
      await sleep(2000); // sleep a bit after creating the ServiceAccount for OpenShift to create all the secrets
      await rolebindingsPost({ body: {"kind":"RoleBinding","apiVersion":"v1","metadata":{"name":"lagoobernetes-deployer-admin","namespace":openshiftProject},"roleRef":{"name":"admin"},"subjects":[{"name":"lagoobernetes-deployer","kind":"ServiceAccount","namespace":openshiftProject}]}})
    } else {
      logger.error(err)
      throw new Error
    }
  }

  // Give the ServiceAccount access to the Promotion Source Project, it needs two roles: 'view' and 'system:image-puller' and
  // give the ServiceAccount 'default' access to the Promotion Source Project, it needs role: 'system:image-puller'
  if (type == "promote") {
    try {
      const promotionSourcRolebindingsGet = Promise.promisify(openshift.ns(openshiftPromoteSourceProject).rolebindings(`${openshiftProject}-lagoobernetes-deployer-view`).get, { context: openshift.ns(openshiftProject).rolebindings(`${openshiftProject}-lagoobernetes-deployer-view`) })
      await promotionSourcRolebindingsGet()
      logger.info(`${openshiftProject}: RoleBinding ${openshiftProject}-lagoobernetes-deployer-view in ${openshiftPromoteSourceProject} does already exist, continuing`)
    } catch (err) {
      if (err.code == 404) {
        logger.info(`${openshiftProject}: RoleBinding ${openshiftProject}-lagoobernetes-deployer-view in ${openshiftPromoteSourceProject} does not exists, creating`)
        const promotionSourceRolebindingsPost = Promise.promisify(openshift.ns(openshiftPromoteSourceProject).rolebindings.post, { context: openshift.ns(openshiftPromoteSourceProject).rolebindings })
        await promotionSourceRolebindingsPost({ body: {"kind":"RoleBinding","apiVersion":"v1","metadata":{"name":`${openshiftProject}-lagoobernetes-deployer-view`,"namespace":openshiftPromoteSourceProject},"roleRef":{"name":"view"},"subjects":[{"name":"lagoobernetes-deployer","kind":"ServiceAccount","namespace":openshiftProject}]}})
      } else {
        logger.error(err)
        throw new Error
      }
    }
    try {
      const promotionSourceRolebindingsGet = Promise.promisify(openshift.ns(openshiftPromoteSourceProject).rolebindings(`${openshiftProject}-lagoobernetes-deployer-image-puller`).get, { context: openshift.ns(openshiftProject).rolebindings(`${openshiftProject}-lagoobernetes-deployer-image-puller`) })
      await promotionSourceRolebindingsGet()
      logger.info(`${openshiftProject}: RoleBinding ${openshiftProject}-lagoobernetes-deployer-image-puller in ${openshiftPromoteSourceProject} does already exist, continuing`)
    } catch (err) {
      if (err.code == 404) {
        logger.info(`${openshiftProject}: RoleBinding ${openshiftProject}-lagoobernetes-deployer-image-puller in ${openshiftPromoteSourceProject} does not exists, creating`)
        const promotionSourceRolebindingsPost = Promise.promisify(openshift.ns(openshiftPromoteSourceProject).rolebindings.post, { context: openshift.ns(openshiftPromoteSourceProject).rolebindings })
        await promotionSourceRolebindingsPost({ body: {"kind":"RoleBinding","apiVersion":"v1","metadata":{"name":`${openshiftProject}-lagoobernetes-deployer-image-puller`,"namespace":openshiftPromoteSourceProject},"roleRef":{"name":"system:image-puller"},"subjects":[{"name":"lagoobernetes-deployer","kind":"ServiceAccount","namespace":openshiftProject}]}})
      } else {
        logger.error(err)
        throw new Error
      }
    }
    try {
      const promotionSourceRolebindingsGet = Promise.promisify(openshift.ns(openshiftPromoteSourceProject).rolebindings(`${openshiftProject}-lagoobernetes-default-image-puller`).get, { context: openshift.ns(openshiftProject).rolebindings(`${openshiftProject}-lagoobernetes-default-image-puller`) })
      await promotionSourceRolebindingsGet()
      logger.info(`${openshiftProject}: RoleBinding ${openshiftProject}-lagoobernetes-default-image-puller in ${openshiftPromoteSourceProject} does already exist, continuing`)
    } catch (err) {
      if (err.code == 404) {
        logger.info(`${openshiftProject}: RoleBinding ${openshiftProject}-lagoobernetes-default-image-puller in ${openshiftPromoteSourceProject} does not exists, creating`)
        const promotionSourceRolebindingsPost = Promise.promisify(openshift.ns(openshiftPromoteSourceProject).rolebindings.post, { context: openshift.ns(openshiftPromoteSourceProject).rolebindings })
        await promotionSourceRolebindingsPost({ body: {"kind":"RoleBinding","apiVersion":"v1","metadata":{"name":`${openshiftProject}-lagoobernetes-default-image-puller`,"namespace":openshiftPromoteSourceProject},"roleRef":{"name":"system:image-puller"},"subjects":[{"name":"default","kind":"ServiceAccount","namespace":openshiftProject}]}})
      } else {
        logger.error(err)
        throw new Error
      }
    }
  }

  // Create SSH Key Secret if not exist yet, if it does update it.
  let sshKey = {}
  const sshKeyBase64 = new Buffer(deployPrivateKey.replace(/\\n/g, "\n")).toString('base64')
  try {
    const secretsGet = Promise.promisify(kubernetes.ns(openshiftProject).secrets('lagoobernetes-sshkey').get, { context: kubernetes.ns(openshiftProject).secrets('lagoobernetes-sshkey') })
    sshKey = await secretsGet()
    logger.info(`${openshiftProject}: Secret lagoobernetes-sshkey already exists, updating`)
    const secretsPut = Promise.promisify(kubernetes.ns(openshiftProject).secrets('lagoobernetes-sshkey').put, { context: kubernetes.ns(openshiftProject).secrets('lagoobernetes-sshkey') })
    await secretsPut({ body: {"apiVersion":"v1","kind":"Secret","metadata":{"name":"lagoobernetes-sshkey", "resourceVersion": sshKey.metadata.resourceVersion },"type":"kubernetes.io/ssh-auth","data":{"ssh-privatekey":sshKeyBase64}}})
  } catch (err) {
    if (err.code == 404) {
      logger.info(`${openshiftProject}: Secret lagoobernetes-sshkey does not exists, creating`)
      const secretsPost = Promise.promisify(kubernetes.ns(openshiftProject).secrets.post, { context: kubernetes.ns(openshiftProject).secrets })
      await secretsPost({ body: {"apiVersion":"v1","kind":"Secret","metadata":{"name":"lagoobernetes-sshkey"},"type":"kubernetes.io/ssh-auth","data":{"ssh-privatekey":sshKeyBase64}}})
    } else {
      logger.error(err)
      throw new Error
    }
  }

  // Load the Token Secret Name for our created ServiceAccount
  const serviceaccountsGet = Promise.promisify(kubernetes.ns(openshiftProject).serviceaccounts("lagoobernetes-deployer").get, { context: kubernetes.ns(openshiftProject).serviceaccounts("lagoobernetes-deployer") })
  serviceaccount = await serviceaccountsGet()
  // a ServiceAccount can have multiple secrets, we are interested in one that has starts with 'lagoobernetes-deployer-token'
  let serviceaccountTokenSecret = '';
  for (var key in serviceaccount.secrets) {
    if(/^lagoobernetes-deployer-token/.test(serviceaccount.secrets[key].name)) {
      serviceaccountTokenSecret = serviceaccount.secrets[key].name
      break;
    }
  }
  if (serviceaccountTokenSecret == '') {
    throw new Error(`${openshiftProject}: Could not find token secret for ServiceAccount lagoobernetes-deployer`)
  }

  // Create or update the BuildConfig
  try {
    const buildConfigsGet = Promise.promisify(openshift.ns(openshiftProject).buildconfigs('lagoobernetes').get, { context: openshift.ns(openshiftProject).buildconfigs('lagoobernetes') })
    currentBuildConfig = await buildConfigsGet()
    logger.info(`${openshiftProject}: Buildconfig lagoobernetes already exists, updating`)
    const buildConfigsPut = Promise.promisify(openshift.ns(openshiftProject).buildconfigs('lagoobernetes').put, { context: openshift.ns(openshiftProject).buildconfigs('lagoobernetes') })
    // The OpenShift API needs the current resource Version so it knows that we're updating data of the last known version. This is filled within currentBuildConfig.metadata.resourceVersion
    await buildConfigsPut({ body: buildconfig(currentBuildConfig.metadata.resourceVersion, serviceaccountTokenSecret, type, environment.addOrUpdateEnvironment) })
  } catch (err) {
    // Same as for projects, if BuildConfig does not exist, it throws an error and we check the error is an 404 and with that we know it does not exist.
    if (err.code == 404) {
      logger.info(`${openshiftProject}: Buildconfig lagoobernetes does not exist, creating`)
      const buildConfigsPost = Promise.promisify(openshift.ns(openshiftProject).buildconfigs.post, { context: openshift.ns(openshiftProject).buildconfigs })
      // This is a complete new BuildConfig, so the resource version is "0" (it will be updated automatically by OpenShift)
      await buildConfigsPost({ body: buildconfig("0", serviceaccountTokenSecret, type, environment.addOrUpdateEnvironment) })
    } else {
      logger.error(err)
      throw new Error
    }
  }

  // Instantiate = Create a new Build from an existing BuildConfig
  const buildConfigsInstantiatePost = Promise.promisify(openshift.ns(openshiftProject).buildconfigs('lagoobernetes/instantiate').post, { context: openshift.ns(openshiftProject).buildconfigs('lagoobernetes/instantiate') })
  const build = await buildConfigsInstantiatePost({body: {"kind":"BuildRequest","apiVersion":"v1","metadata":{"name":"lagoobernetes"}}})
  const buildName = build.metadata.name

  try {
    const convertDateFormat = R.init;
    const apiEnvironment = await getEnvironmentByName(branchName, projectId);
    await addDeployment(buildName, build.status.phase.toUpperCase(), convertDateFormat(build.metadata.creationTimestamp), apiEnvironment.environmentByName.id, build.metadata.uid);
  } catch (error) {
    logger.error(`Could not save deployment for project ${projectId}, build ${buildName}. Message: ${error}`);
  }

  logger.verbose(`${openshiftProject}: Running build: ${buildName}`)

  const monitorPayload = {
    buildName: buildName,
    projectName: projectName,
    openshiftProject: openshiftProject,
    branchName: branchName,
    sha: sha
  }

  const taskMonitorLogs = await createTaskMonitor('builddeploy-openshift', monitorPayload)

  let logMessage = ''
  if (gitSha) {
    logMessage = `\`${branchName}\` (${buildName})`
  } else {
    logMessage = `\`${branchName}\``
  }

  sendToLagoobernetesLogs('start', projectName, "", "task:builddeploy-openshift:start", {},
    `*[${projectName}]* ${logMessage}`
  )

}

const deathHandler = async (msg, lastError) => {
  const {
    projectName,
    branchName,
    sha
  } = JSON.parse(msg.content.toString())

  let logMessage = ''
  if (sha) {
    logMessage = `\`${branchName}\` (${sha.substring(0, 7)})`
  } else {
    logMessage = `\`${branchName}\``
  }

  sendToLagoobernetesLogs('error', projectName, "", "task:builddeploy-openshift:error",  {},
`*[${projectName}]* ${logMessage} ERROR:
\`\`\`
${lastError}
\`\`\``
  )

}

const retryHandler = async (msg, error, retryCount, retryExpirationSecs) => {
  const {
    projectName,
    branchName,
    sha
  } = JSON.parse(msg.content.toString())

  let logMessage = ''
  if (sha) {
    logMessage = `\`${branchName}\` (${sha.substring(0, 7)})`
  } else {
    logMessage = `\`${branchName}\``
  }

  sendToLagoobernetesLogs('warn', projectName, "", "task:builddeploy-openshift:retry", {error: error.message, msg: JSON.parse(msg.content.toString()), retryCount: retryCount},
`*[${projectName}]* ${logMessage} ERROR:
\`\`\`
${error}
\`\`\`
Retrying deployment in ${retryExpirationSecs} secs`
  )
}
consumeTasks('builddeploy-openshift', messageConsumer, retryHandler, deathHandler)
