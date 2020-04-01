# docker-compose.yml

The `docker-compose.yml` file is used by Lagoobernetes to:

* Learn which services/containers should be deployed.
* Define how the images for the containers are built.
* Define additional configurations like persistent volumes.

Docker-compose \(the tool\) is very strict in validating the content of the YAML file, so we can only do configuration within `labels` of a service definition.

!!!warning
    Lagoobernetes only reads the labels, service names, image names and build definitions from a `docker-compose.yml` file. Definitions like: ports, environment variables, volumes, networks, links, users, etc. are IGNORED. This is intentional as the `docker-compose` file is there to define your local environment configuration. Lagoobernetes learns from the `lagoobernetes.type` the type of service you are deploying and from that knows about ports, networks and any additional configuration that this service might need.


Here is a straightforward example of a `docker-compose.yml` file for Drupal:

```
services:

  nginx:
    build:
      context: .
      dockerfile: nginx.dockerfile
    labels:
      lagoobernetes.type: nginx-php-persistent
      lagoobernetes.persistent: /app/web/sites/default/files/

  php:
    build:
      context: .
      dockerfile: php.dockerfile
    labels:
      lagoobernetes.type: nginx-php-persistent
      lagoobernetes.name: nginx
      lagoobernetes.persistent: /app/web/sites/default/files/

  mariadb:
    image: amazeeio/mariadb-drupal
    labels:
      lagoobernetes.type: mariadb
```

## **`services`**

This defines all the services you want to deploy. _Unfortunately,_ `docker-compose` calls them services, even though they are actually containers. Going forward we'll be calling them services, and throughout this documentation.

The name of the service \(`nginx`, `php`, and `mariadb` in the example above\) is used by Lagoobernetes as the name of the Kubernetes pod \(yet another term - again, we'll be calling them services\) that is generated, plus also any additional Kubernetes objects that are created based on the defined `lagoobernetes.type`, which could be things like services, routes, persistent storage, etc.

## Docker Images

### **`build`**

If you want Lagoobernetes to build a Dockerfile for your service during every deployment, you can define it here:

`build`

* `context`
  * The build context path that should be passed on into the `docker build` command.
* `dockerfile:`
  * Location and name of the Dockerfile that should be built.

!!!warning
    Lagoobernetes does NOT support the short version of `build: <Dockerfile>` and will fail if it finds such a definition.

### `image`

If you don't need to build a Dockerfile and just want to use an existing Dockerfile, define it via `image`.

## Types

Lagoobernetes needs to know what type of service you are deploying in order to configure the correct Kubernetes and OpenShift objects.

This is done via the `lagoobernetes.type` label. There are many different types to choose from. Check [Service Types](service_types.md) to see all of them and their additional configuration possibilities.

## **Skip/Ignore containers**

If you'd like Lagoobernetes to ignore a service completely - for example, you need a container only during local development - just give it the type `none`.

## Persistent Storage

Some containers need persistent storage. In many cases, Lagoobernetes knows where that persistent storage needs to go. For example, for a MariaDB container, Lagoobernetes knows that the persistent storage should be put into `/var/lib/mysql` , and puts it there automatically without any extra configuration to define that. For some situations, though, Lagoobernetes needs your help to know where to put the persistent storage:

* `lagoobernetes.persistent` - The **absolute** path where the persistent storage should be mounted \(the above example uses `/app/web/sites/default/files/` which is where Drupal expects its persistent storage\).
* `lagoobernetes.persistent.name` - Tells Lagoobernetes to not create a new persistent storage for that service, but instead mounts the persistent storage of another defined service into this service.
* `lagoobernetes.persistent.size` - The size of persistent storage you require \(Lagoobernetes usually gives you minimum 5G of persistent storage, if you need more define it here\).
* `lagoobernetes.persistent.class` - By default Lagoobernetes automatically assigns the right storage class for your service \(like SSDs for MySQL, bulk storage for Nginx, etc.\). If you need to overwrite this, you can do so here. This is highly dependent on the underlying Kubernetes/OpenShift that Lagoobernetes runs on. Ask your Lagoobernetes administrator about this.

## Multi-Container Pods

Kubernetes and OpenShift don't deploy plain containers. Instead, they deploy pods, with each one or more containers. Usually Lagoobernetes creates a single pod with a container inside for each defined `docker-compose` service. For some cases, we need to put two containers inside a single pod, as these containers are so dependent on each other that they should always stay together. An example for such a situation is the PHP and Nginx containers that both contain PHP code of a web application like Drupal.

For these cases, it is possible to tell Lagoobernetes which services should stay together, which is done in the following way \(remember that we are calling containers `services` because of `docker-compose`):

1. Define both services with a `lagoobernetes.type` that expects two services \(in the example this is `nginx-php-persistent` defined on the `nginx` and `php` services\).
2. Link the second service with the first one, defining the label `lagoobernetes.name` of the second one with the first one. \(in the example this is done with defining `lagoobernetes.name: nginx`\).

This will cause Lagoobernetes to realize that the `nginx` and `php` containers are combined in a pod that will be called `nginx`.

Lagoobernetes still needs to understand which of the two services is the actual individual service type \(`nginx` and `php` in this case\). It does this by searching for service names with the same name that are given by the type, so `nginx-php-persistent` expects one service with the name `nginx` and one with `php` in the `docker-compose.yml.` If for any reason you want to use different names for the services, or you  need for than one pod with the type `nginx-php-persistent` there is an additional label `lagoobernetes.deployment.servicetype` which can be used to define the actual service type.

An example:

```
nginx:
    build:
      context: .
      dockerfile: nginx.dockerfile
    labels:
      lagoobernetes.type: nginx-php-persistent
      lagoobernetes.persistent: /app/web/sites/default/files/
      lagoobernetes.name: nginx # If this isn't present, Lagoobernetes will use the container name, which in this case is nginx.
      lagoobernetes.deployment.servicetype: nginx
php:
    build:
      context: .
      dockerfile: php.dockerfile
    labels:
      lagoobernetes.type: nginx-php-persistent
      lagoobernetes.persistent: /app/web/sites/default/files/
      lagoobernetes.name: nginx # We want this service be part of the nginx pod in Lagoobernetes.
      lagoobernetes.deployment.servicetype: php
```

In the example above, the services are named `nginx` and `php` \(but you can call them whatever you want\). The `lagoobernetes.name` tells Lagoobernetes which services go together - all of the services with the same name go together.

In order for Lagoobernetes to realize which one is the `nginx` and which one is the `php` service, we define it via `lagoobernetes.deployment.servicetype: nginx` and `lagoobernetes.deployment.servicetype: php`.

### **Custom Templates**

If you need to make changes to the OpenShift templates, you can define your own template via `lagoobernetes.template`. Check out the shipped templates from the [templates folder of `oc-build-deploy-dind`](https://github.com/amazeeio/lagoobernetes/tree/master/images/oc-build-deploy-dind/openshift-templates).

!!!hint
    The template is called with `oc process`,  so you should define the same parameters as seen in the default templates.


You can also overwrite the templates only for a specific environment. This is done in [`.lagoobernetes.yml`](lagoobernetes_yml.md#environmentsnamerollouts)

### **Custom Rollout Monitor Types**

By default , Lagoobernetes expects that services from custom templates are rolled out via a `DeploymentConfig` object within Openshift/Kubernetes. It monitors the rollout based on this object. In some cases, the services that are defined via custom deployment need a different way of monitoring. This can be defined via `lagoobernetes.rollout`:

* `deploymentconfig` - This is the default. Expects a `DeploymentConfig` object in the template for the service.
* `statefulset` - Expects a `Statefulset` object in the template for the service.
* `daemonset` - Expects a `Daemonset` object in the template for the service.
* `false` - Will not monitor any rollouts, and will just be happy if the template applies and does not throw any errors.

You can also overwrite the rollout for just one specific environment. This is done in [`.lagoobernetes.yml`](lagoobernetes_yml.md#environmentsnamerollouts)

### **Custom Type**

Feeling adventurous and want to do something completely customized? Welcome to the Danger Zone!

![Welcome to the Danger Zone](/images/topgun.gif)

When defining a service as `lagoobernetes.type: custom`, you can tell Lagoobernetes to not use any pre-defined service type templates and pass your full own custom YAML file.

This also expects the label `lagoobernetes.template` to be defined with the path to the YAML file where you define all the needed Kubernetes objects to be executed. In here you can define your own OpenShift templates like the ones in the [templates folder of `oc-build-deploy-dind`](https://github.com/amazeeio/lagoobernetes/tree/master/images/oc-build-deploy-dind/openshift-templates).

!!!hint
    The template is called with `oc process`, so you should define the same parameters as in the default templates.


