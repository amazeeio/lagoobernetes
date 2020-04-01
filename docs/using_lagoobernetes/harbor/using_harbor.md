[Harbor](https://goharbor.io/) is used as the default package repository for Lagoobernetes when deploying to Kubernetes infrastructure. Harbor provides a docker registry and a container security scanning solution provided by [Clair](https://coreos.com/clair/docs/latest/).

**Note** When running Lagoobernetes locally, the configuration for Harbor is handled entirely automagically.

If you are running Lagoobernetes locally, you can access that UI at [localhost:8084](https://localhost:8084/). The username is `admin` and the password is `admin`

**Note:** If you are hosting a site with amazee.io, we do not allow customer access to the Harbor UI within amazee.io's Lagoobernetes.

Once logged in, the first screen is a list of all repositories your user has access to. Each "repository" in Harbor correlates to a project in Lagoobernetes.

![Harbor Projects Overview](projects_overview.png)

Within each Harbor repository, you'll see a list of container images from all environments with a single Lagoobernetes project.

![Harbor Repositories Overview](repositories_overview.png)

From here, you can drill down into an individual container in order to see its details, including an overview of its security scan results.

![Harbor Container Overview](container_overview.png)
