# Install Lagoobernetes on OpenShift

Lagoobernetes is not only capable of _deploying_ into OpenShift, it actually _runs_ in OpenShift. This creates the just tiny chicken-egg problem of how to install Lagoobernetes on an OpenShift when there is no Lagoobernetes yet. 🐣

Luckily, we can use the local development environment to kickstart another Lagoobernetes in any OpenShift, running somewhere in the world.

Check the [OpenShift Requirements](openshift_requirements.md) before continuing.

This process consists of 4 main stages::

1. Configure existing OpenShift.
2. Configure and connect local Lagoobernetes with OpenShift.
3. Deploy!
4. Configure Installed Lagoobernetes.

## Configure existing OpenShift

!!!hint
    This also works with the OpenShift provided via MiniShift that can be started via `make minishift`.


In order to create resources inside OpenShift and push into the OpenShift Registry, Lagoobernetes needs a Service Account within OpenShift \([read more about Service Accounts](https://docs.openshift.org/latest/dev_guide/service_accounts.html)\).

Technically, Lagoobernetes can use any Service Account and also needs no admin permissions. The only requirement is that the `self-provisioner` role is given to the Service Account.

In this example we create the Service Account `lagoobernetes` in the OpenShift Project `default`.

1. Make sure you have the `oc cli` tools already installed. If not, please see [here](https://docs.openshift.org/latest/cli_reference/get_started_cli.html#cli-reference-get-started-cli).
2. Log into OpenShift as an admin:

   ```
    oc login <openshift console>
   ```

3. Run the `openshift-lagoobernetes-setup` script

   ```
   make openshift-lagoobernetes-setup
   ```

4. At the end of this script it will give you a `serviceaccount` token. Keep that somewhere safe.

## Configure and connect local Lagoobernetes with OpenShift

In order to use a local Lagoobernetes to deploy itself on an OpenShift, we need a subset of Lagoobernetes running locally. We need to teach this local Lagoobernetes how to connect to the OpenShift:

1. Edit `lagoobernetes` inside `local-dev/api-data/01-populate-api-data.gql`, in the `Lagoobernetes Kickstart Objects` section:
   1. `[REPLACE ME WITH OPENSHIFT URL]` - The URL to the OpenShift Console, without `console` at the end.
   2. `[REPLACE ME WITH OPENSHIFT LAGOOBERNETES SERVICEACCOUNT TOKEN]` - The token of the lagoobernetes service account that was shown to you during `make openshift-lagoobernetes-setup`.
2. Build required images and start services:

   ```
    make lagoobernetes-kickstart
   ```

   This will do the following:

   1. Build all required Lagoobernetes service images \(this can take a while\).
   2. Start all required Lagoobernetes services.
   3. Wait 30 secs for all services to fully start.
   4. Trigger a deployment of the `lagoobernetes` sitegroup that you edited, which will cause your local lagoobernetes to connect to the defined OpenShift and trigger a new deployment.
   5. Show the logs of all local Lagoobernetes services.

3. As soon as you see messages like `Build lagoobernetes-1 running` in the logs, it's time to connect to your OpenShift and check the build. The URL you will use for that depends on your system, but it's probably the same as in `openshift.console`.
4. Then you should see a new OpenShift Project called `[lagoobernetes] develop` , and in there a `Build` that is running. On a local OpenShift you can find that under [https://192.168.42.100:8443/console/project/lagoobernetes-develop/browse/builds/lagoobernetes?tab=history](https://192.168.42.100:8443/console/project/lagoobernetes-develop/browse/builds/lagoobernetes?tab=history).
5. If you see the build running, check the logs and see how the deployment system does its magic! This is your very first Lagoobernetes deployment running! 🎉 Congrats!
   1. Short background on what is actually happening here:
   2. Your local running Lagoobernetes \(inside `docker-compose`\) received a deploy command for a project called `lagoobernetes` that you configured.
   3. This project has defined to which OpenShift it should be deployed \(one single Lagoobernetes can deploy into multiple OpenShifts all around the world\).
   4. The local running Lagoobernetes service `openshiftBuildDeploy` connects to this OpenShift and creates a new project, some needed configurations \(ServiceAccounts, BuildConfigs, etc.\) and triggers a new build.
   5. This build will run and deploy another Lagoobernetes within the OpenShift it runs.
6. As soon as the build is done, go to the `Application > Deployments` section of the OpenShift Project, and you should see all the Lagoobernetes DeploymentConfigs deployed and running. Also go to `Application > Routes` and click on the generated route for `ui` \(for a local OpenShift this will be [http://ui-lagoobernetes-develop.192.168.42.100.xip.io/](http://ui-lagoobernetes-develop.192.168.42.100.xip.io/)\), if you get the Lagoobernetes UI as result, you did everything correct, bravo! 🏆

## OpendistroSecurity

Once Lagoobernetes is install operational, you need to initialize OpendistroSecurity to allow Kibana multitenancy. This only needs to be run once in a new setup of Lagoobernetes.

1. Open a shell of an Elasticsearch pod in `logs-db`.
2. `run ./securityadmin_demo.sh`.

## Configure Installed Lagoobernetes

We have a fully running Lagoobernetes. Now it's time to configure the first project inside of it. Follow the examples in [GraphQL API](graphql_api.md).
