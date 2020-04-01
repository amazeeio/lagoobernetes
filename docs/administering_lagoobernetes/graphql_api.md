# GraphQL API

## Running GraphQL queries

Direct API interactions in Lagoobernetes are done via [GraphQL](../using_lagoobernetes/graphql_api.md).

In order to authenticate with the API, we need a JWT \(JSON Web Token\) that allows us to use the GraphQL API as admin. To generate this token, open the terminal of the `auto-idler` pod via the OpenShift UI or `oc rsh` on the command line and run the following command:

```bash
./create_jwt.sh
```

This will return a long string which is the JWT token. Make a note of this, as we will need it to send queries.

We also need the URL of the API endpoint, which can be found under "Routes" in the OpenShift UI or `oc get route api` on the command line. Make a note of this endpoint URL, which we will also need.

To compose and send GraphQL queries, we recommend [GraphiQL.app](https://github.com/skevy/graphiql-app), a desktop GraphQL client with features such as autocomplete. To continue with the next steps, install and start the app.

Under "GraphQL Endpoint", enter the API endpoint URL with `/graphql` on the end. Then click on "Edit HTTP Headers" and add a new header:

* "Header name": `Authorization`
* "Header value": `Bearer [JWT token]` \(make sure that the JWT token has no spaces, as this would not work\)

Press ESC to close the HTTP header overlay and now we are ready to send the first GraphQL request!

![Editing HTTP Headers in GraphiQL.](/images/graphiql-2020-01-29-18-05-54.png)

Enter this in the left panel

```graphql
query allProjects{
  allProjects {
    name
  }
}
```

![Running a query in GraphiQL.](/images/graphiql-2020-01-29-20-10-32.png)

And press the ▶️button \(or press CTRL+ENTER\).

If all went well, your first GraphQL response should appear shortly afterwards in the right pane.

## Creating the first project

Let's create the first project for Lagoobernetes to deploy! For this we'll use the queries from the GraphQL query template in [`create-project.gql`](https://github.com/amazeeio/lagoobernetes/blob/master/docs/administering_lagoobernetes/create-project.gql).

For each of the queries \(the blocks starting with `mutation {`\), fill in all of the empty fields marked by TODO comments and run the queries in GraphiQL.app. This will create one of each of the following two objects:

1. `openshift` : The OpenShift cluster to which Lagoobernetes should deploy. Lagoobernetes is not only capable of deploying to its own OpenShift, but also to any OpenShift anywhere in the world.
2. `project` : The Lagoobernetes project to be deployed, which is a Git repository with a `.lagoobernetes.yml` configuration file committed in the root.

## Allowing access to the project

In Lagoobernetes, each developer authenticates via their SSH key\(s\). This determines their access to:

1. The Lagoobernetes API, where they can see and edit projects they have access to.
2. Remote shell access to containers that are running in projects they have access to.
3. The Lagoobernetes logging system, where a developer can find request logs, container logs, Lagoobernetes logs and more.

To allow access to the project, we first need to add a new group to the API:

```graphql
mutation {
  addGroup (
    input: {
      # TODO: Enter the name for your new group.
      name: ""
    }
  )     {
    id
    name
  }
}
```

Then we need to add a new user to the API:

```graphql
mutation {
  addUser(
    input: {
      email: "michael.schmid@example.com"
      firstName: "Michael"
      lastName: "Schmid"
      comment: "CTO"
    }
  ) {
    # TODO: Make a note of the user ID that is returned.
    id
  }
}
```

Then we can add an SSH public key for the user to the API:

```graphql
mutation {
  addSshKey(
    input: {
      # TODO: Fill in the name field.
      # This is a non-unique identifier for the SSH key.
      name: ""
      # TODO: Fill in the keyValue field.
      # This is the actual SSH public key (without the type at the beginning and without the comment at the end, ex. `AAAAB3NzaC1yc2EAAAADAQ...3QjzIOtdQERGZuMsi0p`).
      keyValue: ""
      # TODO: Fill in the keyType field.
      # Valid values are either SSH_RSA or SSH_ED25519.
      keyType: SSH_RSA
      user: {
        # TODO: Fill in the userId field.
        # This is the user ID that we noted from the addUser query.
        id:"0",
        email:"michael.schmid@example.com"
      }
    }
  ) {
    id
  }
}
```

After we add the key, we need to add the user to a group:

```graphql
mutation {
  addUserToGroup (
    input: {
      user: {
        #TODO: Enter the email address of the user.
        email: ""
      }
      group: {
        #TODO: Enter the name of the group you want to add the user to.
        name: ""
      }
      #TODO: Enter the role of the user.
      role: OWNER

    }
  ) {
    id
    name
  }
}
```

After running one or more of these kinds of queries, the user will be granted access to create tokens via SSH, access containers and more.

## Adding notifications to the project

If you want to know what is going on during a deployment, we suggest configuring notifications for your project, which provide:

* Push notifications
* Build start information
* Build success or failure messages
* And many more!

As notifications can be quite different in terms of the information they need, each notification type has its own mutation.

As with users, we first add the notification:

```graphql
mutation {
  addNotificationSlack(
    input: {
      # TODO: Fill in the name field.
      # This is your own identifier for the notification.
      name: ""
      # TODO: Fill in the channel field.
      # This is the channel for the message to be sent to.
      channel: ""
      # TODO: Fill in the webhook field.
      # This is the URL of the webhook where messages should be sent, this is usually provided by the chat system to you.
      webhook: ""
    }
  ) {
    id
  }
}
```

After the notification is created, we can now assign it to our project:

```graphql
mutation {
  addNotificationToProject(
    input: {
      notificationType: SLACK
      # TODO: Fill in the project field.
      # This is the project name.
      project: ""
      # TODO: Fill in the notification field.
      # This is the notification name.
      notificationName: ""
    }
  ) {
    id
  }
}
```

Now for every deployment you will receive messages in your defined channel.

## Example GraphQL queries

### Adding a new OpenShift target

The OpenShift cluster to which Lagoobernetes should deploy. Lagoobernetes is not only capable of deploying to its own OpenShift, but also to any OpenShift anywhere in the world.

```graphql
mutation {
  addOpenshift(
    input: {
      # TODO: Fill in the name field.
      # This is the unique identifier of the OpenShift.
      name: ""
      # TODO: Fill in consoleUrl field.
      # This is the URL of the OpenShift console (without any `/console` suffix).
      consoleUrl: ""
      # TODO: Fill in the token field.
      # This is the token of the `lagoobernetes` service account created in this OpenShift (this is the same token that we also used during installation of Lagoobernetes).
      token: ""
    }
  ) {
    name
    id
  }
}
```

### Adding a group to a project

This query will add a group to a project. Users of that group will be able to access the project. They will be able to make changes, based on their role in that group.

```graphql
mutation {
  mutation {
    addGroupsToProject (
      input: {
        project: {
          #TODO: Enter the name of the project.
          name: ""
        }
        groups: {
          #TODO: Enter the name of the group that will be added to the project.
          name: ""
        }
      }
    ) {
      id
    }
}
```

### Adding a new project

This query adds a new Lagoobernetes project to be deployed, which is a Git repository with a `.lagoobernetes.yml` configuration file committed in the root.

If you omit the `privateKey` field, a new SSH key for the project will be generated automatically.

If you would like to reuse a key from another project. you will need to supply the key in the `addProject` mutation.

```graphql
mutation {
  addProject(
    input: {
      # TODO: Fill in the name field.
      # This is the project name.
      name: ""
      # TODO: Fill in the private key field (replace newlines with '\n').
      # This is the private key for a project, which is used to access the Git code.
      privateKey: ""
      # TODO: Fill in the OpenShift field.
      # This is the id of the OpenShift to assign to the project.
      openshift: 0
      # TODO: Fill in the name field.
      # This is the project name.
      gitUrl: ""
      # TODO: Fill in the branches to be deployed.
      branches: ""
      # TODO: Define the production environment.
      productionEnvironment: ""
    }
  ) {
    name
    openshift {
      name
      id
    }
    gitUrl
    activeSystemsDeploy
    activeSystemsRemove
    branches
    pullrequests
  }
}
```

### List projects and groups

This is a good query to see an overview of all projects, OpenShifts and groups that exist within our Lagoobernetes.

```graphql
query {
  allProjects {
    name
    gitUrl
  }
  allOpenshifts {
    name
    id
  }
  allGroups{
    id
    name
    members {
      # This will display the users in this group.
      user {
        id
        firstName
        lastName
      }
      role
    }
    groups {
      id
      name
    }
  }
}
```

### Single project

If you want a detailed look at a single project, this query has been proven quite good:

```graphql
query {
  projectByName(
    # TODO: Fill in the project name.
    name: ""
  ) {
    id
    branches
    gitUrl
    pullrequests
    productionEnvironment
    notifications(type: SLACK) {
      ... on NotificationSlack {
        name
        channel
        webhook
        id
      }
    }
    environments {
      name
      deployType
      environmentType
    }
    openshift {
      id
    }
  }
}
```

### Querying a project by its Git URL

Don't remember the name of a project, but know the Git URL? Search no longer, there is a GraphQL query for that:

```graphql
query {
  projectByGitUrl(gitUrl: "git@server.com:org/repo.git") {
    name
  }
}
```

### Updating objects

The Lagoobernetes GraphQL API can not only disply objects and create objects, it also has the capability to update existing objects, using [a patch object](https://blog.apollographql.com/designing-graphql-mutations-e09de826ed97).

Update the branches to deploy within a project:

```graphql
mutation {
  updateProject(
    input: { id: 109, patch: { branches: "^(prod|stage|dev|update)$" } }
  ) {
    id
  }
}
```

Update the production environment within a project:
!!!hint
    This needs a redeploy in order for the changes to be reflected in the containers.


```graphql
 mutation {
   updateProject(
    input: { id: 109, patch: { productionEnvironment: "master" } }
  ) {
    id
  }
}
```

You can also combine multiple changes at once:

```graphql
mutation {
  updateProject(
    input: {
      id: 109
      patch: {
        productionEnvironment: "master"
        branches: "^(prod|stage|dev|update)$"
      }
    }
  ) {
    id
  }
}
```

### Deleting Environments

You can also use the Lagoobernetes GraphQL API to delete an environment. You'll need to know the project name and the environment name in order to run the command.

```graphql
mutation {
  deleteEnvironment(
    input: {
      # TODO: Fill in the name field.
      # This is the environment name.
      name:""
      # TODO: Fill in the project field.
      # This is the project name.
      project:""
      execute:true
    }
  )
}
```

### Querying a project to see what groups and users are assigned

Want to see what groups and users have access to a project? Want to know what their roles are? Do I have a query for you! Using the query below you can search for a project and display the groups, users, and roles that are assigned to that project.

```graphql
query search{
  projectByName(
    #TODO: Enter the name of the project.
    name: ""
  ) {
    id,
    branches,
    productionEnvironment,
    pullrequests,
    gitUrl,
    openshift {
      id
    },
     groups{
      id
      name
      groups {
        id
        name
      }
      members {
        role
        user {
          id
          email
        }
      }
    }
  }
}
```

