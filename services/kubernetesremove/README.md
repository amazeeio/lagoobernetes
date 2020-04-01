# lagoobernetes-kubernetesremove

This service is called 'kubernetesremove', and is part of the amazee.io lagoobernetes deployment system and is responsible for removing Kubernetes Resources for each task in the rabbitmq queue `lagoobernetes-tasks:remove-kubernetes-resources`

It does the following:
1. read message from a rabbitmq queue called `lagoobernetes-tasks:remove-kubernetes-resources`, which have the following information:

- `projectName` (name of the project that should be handled)
- `kubernetesRessourceAppName` (name of resource in kubernetes that should be removed, it use them as an kubernetes label with the key `app`)
- `kubernetesProject` (name of the kubernetes project that should be removed)

2. connect to the lagoobernetes api and load additional kubernetes information (token and the console url) for the given project
3. create a new jenkinsjob which runs `oc delete all -l app={kubernetesRessourceAppName}` against the found Kubernetes console

It logs the start, success and error of the jenkins jobs into lagoobernetes-logs.

It uses https://github.com/benbria/node-amqp-connection-manager for connecting to rabbitmq, so it can handle situations were rabbitmq is not reachable and still receive webhooks, process them and keep them in memory. As soon as rabbitmq is reachable again, it will send the messages there.

## Hosting

Fully developed in Docker and hosted on amazee.io Openshift, see the `.openshift` folder. Deployed via Jenkinsfile.

Uses `lagoobernetes/node:10` as base image.

## Development

Via the existing docker-compose.yml (see the file for defining the Api, Jenkins and RabbitMQ Host to be used)

        docker-compose up -d
