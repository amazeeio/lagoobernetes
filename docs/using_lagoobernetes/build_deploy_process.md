# Build and Deploy Process

This document describes what actually happens during a Lagoobernetes build and deployment. It is heavily simplified from what actually happens, but it will help you to understand what is happening under the hood every time that Lagoobernetes deploys new code for you.

## 1. Set up OpenShift Project/Kubernetes Namespace for Environment

First, Lagoobernetes checks if the OpenShift project/Kubernetes namespace for the given environment exists and is correctly set up. It will make sure that we have the needed service accounts, create secrets, and will configure environment variables into a ConfigMap `lagoobernetes-env` which is filled with information like the environment type and name, the Lagoobernetes project name, and so on.

## 2. Git Checkout & Merge

Next, Lagoobernetes will checkout your code from Git. It needs that to have access to read the `.lagoobernetes.yml` and `docker-compose.yml` but also to build the Docker images.

Based on how the deployment has been triggered, different things will happen:

### **Branch Webhook Push**

If the deployment is triggered via a webhook and is for a single branch, Lagoobernetes will check out the Git SHA which is included in the webhook. This means that even if you push code to the Git branch twice, there will be two deployments with exactly the code that was pushed, not just the newest code in the Git branch.

### **Branch REST trigger**

If you trigger a deployment via the REST API and do NOT define a `SHA` in the POST payload, Lagoobernetes will just checkout the branch with the newest code without a specific given Git SHA.

### **Pull Requests**

If the deployment is a pull request deployment, Lagoobernetes will load the base and the HEAD branch and SHAs for the pull request and will:

* Checkout the base branch \(the branch the pull request points to\).
* Merge the HEAD branch \(the branch that the pull request originates from\) on top of the base branch.
* **More specifically:**
  * Lagoobernetes will checkout and merge particular SHAs which were sent in the webhook. Those SHAs may or _may not_ point to the branch HEADs. For example, if you make a new push to a GitHub pull request, it can happen that SHA of the base branch will _not_ point to the current base branch HEAD.

If the merge fails, Lagoobernetes will also stop and inform you about this.

## 3. Build Image

For each service defined in the `docker-compose.yml` Lagoobernetes will check if images need to be built or not. If they need to be built, this will happen now. The order of building is based on the order they are configured in `docker-compose.yml` , and some build arguments are injected:

* `LAGOOBERNETES_GIT_SHA`
* `LAGOOBERNETES_GIT_BRANCH`
* `LAGOOBERNETES_PROJECT`
* `LAGOOBERNETES_BUILD_TYPE` \(either `pullrequest`, `branch` or `promote`\)
* `LAGOOBERNETES_SSH_PRIVATE_KEY` - The SSH private key that is used to clone the source repository. Use `RUN /lagoobernetes/entrypoints/05-ssh-key.sh` to convert the build argument into an actual key at `/home/.ssh/key` which will be used by SSH and Git automatically. For safety, remove the key again via `RUN rm /home/.ssh/key`.
* `LAGOOBERNETES_GIT_SOURCE_REPOSITORY` - The full Git URL of the source repository.

Also, if this is a pull request build:

* `LAGOOBERNETES_PR_HEAD_BRANCH`
* `LAGOOBERNETES_PR_HEAD_SHA`
* `LAGOOBERNETES_PR_BASE_BRANCH`
* `LAGOOBERNETES_PR_BASE_SHA`
* `LAGOOBERNETES_PR_TITLE`

Additionally, for each already built image, its name is also injected. If your `docker-compose.yml` is configured to first build the `cli` image and then the `nginx` image, the name of the `nginx` image is injected as `NGINX_IMAGE`.

## 4. Configure OpenShift/Kubernetes Services and Routes

Next, Lagoobernetes will configure OpenShift/Kubernetes with all services and routes that are defined from the service types, plus possible additional custom routes that you have defined in `.lagoobernetes.yml`.

In this step it will expose all defined routes in the `LAGOOBERNETES_ROUTES` as comma separated URLs. It will also define one route as the "main" route, in this order:

1. If custom routes defined: the first defined custom route in `.lagoobernetes.yml`.
2. The first auto generated one from a service defined in `docker-compose.yml`.
3. None

The "main" route is injected via the `LAGOOBERNETES_ROUTE` environment variable.

## 5. Push and Tag Images

Now it is time to push the previously built Docker images into the internal Docker image registry.

For services that didn't specify a Dockerfile to be built in `docker-compose.yml` and just gave an image, they are tagged via `oc tag` in the OpenShift project. This will cause the internal Docker image registry to know about the images, so that they can be used in containers.

## 6. Persistent Storage

Lagoobernetes will now create persistent storage \(PVC\) for each service that needs and requested persistent storage.

## 7. Cron jobs

For each service that requests a cron job \(like MariaDB\), plus for each custom cron job defined in `.lagoobernetes.yml,` Lagoobernetes will now generate the cron job environment variables which are later injected into the DeploymentConfigs.

## 8. DeploymentConfigs, Statefulsets, Daemonsets

This is probably the most important step. Based on the defined service type, Lagoobernetes will create the DeploymentConfigs, Statefulset or Daemonsets for the service.

It will include all previously gathered information like the cron jobs, the location of persistent storage, the pushed images and so on.

Creation of these objects will also automatically cause OpenShift/Kubernetes to trigger new deployments of the pods if necessary, like when an environment variable has changed or an image has changed. But if there is no change, there will be no deployment! This means if you just update the PHP code in your application, the Varnish, Solr, MariaDB, Redis and any other service that is defined but does not include your code will not be deployed. This makes everything much much faster.

## 9. Wait for all rollouts to be done

Now Lagoobernetes waits! It waits for all of the just-triggered deployments of the new pods to be finished, as well as for their healthchecks to be successful.

If any of the deployments or healthchecks fail, the deployment will be stopped here, and you will be informed via the defined notification systems \(like Slack\) that the deployment has failed.

## 10. Run defined post-rollout tasks

Now Lagoobernetes will check the `.lagoobernetes.yml` file for defined tasks in `post-rollout` and will run them one by one in the defined services.

If any of them fail, Lagoobernetes will immediately stop and notify you.

## 11. Success

If all went well and nothing threw any errors, Lagoobernetes will mark this build as successful and inform you via defined notifications. ✅

