# Workflows

Lagoobernetes tries to support any development workflow possible. It specifically does not enforce any workflows onto teams, so that each development team can define how they would like to develop and deploy their code.

## Fixed Branches

The most obvious and easiest workflow are deployment-based on some fixed branches:

You define which branches \(like `develop`, `staging` and `master`, which would be `^(develop|staging|master)$` as regular expressions\) that Lagoobernetes should deploy and it will do so. Done!

If you would like to test a new feature, just merge them into a branch that you have set up locally and push, and Lagoobernetes will deploy the feature and you can test. When all is good, merge the branch into your production branch and push.

## Feature Branches

A bit more advanced are feature branches. Since Lagoobernetes supports the ability to define the branches you would like to deploy via regular expressions, you can also extend the above regular expression to this: `^feature\/|^(staging|master)$`. This will instruct Lagoobernetes to deploy all branches that start with `feature/`, plus the branches called `staging` and `master`. Our development workflow could be as following:

* Create a new branch from `master` called `feature/myfeature` and push `feature/myfeature`.
* Lagoobernetes will deploy the branch `feature/myfeature` as a new environment, where you can test your feature independently of any other features.
* Merge `feature/myfeature` into the `master` branch and it will deploy to your production environment.

If you like, you can also merge `feature/myfeature` and any other feature branches into `staging` first, in order to test the functionality of multiple features together. After you have tested the features together on staging, you can merge the features into master.

This workflow needs a high level of branch pruning and cleanliness in your Git repository. Since each feature branch will create its own Lagoobernetes environment, you can have very quickly generate a LOT of environments, which all of them will use resources. Be sure to merge or delete unused branches.

Because of this, it could make sense to think about a pull request based workflow.

## Pull requests

Even more advanced are workflows via pull requests. Such workflows need the support of a Git hosting which supports pull requests \(also called merge requests\). The idea of pull request-based workflows lies behind that idea that you can test a feature together with a target branch, without actually needing to merge yet, as Lagoobernetes will do the merging for you during the build.

In our example we would configure Lagoobernetes to deploy the branches `^(staging|master)$` and the pull requests to `.*` \(to deploy all pull requests\). Now our workflow would be:

* Create a new branch from `master` called `feature/myfeature` and push `feature/myfeature` \(no deployment will happen now because we have only specific staging and master as our branches to be deployed\).
* Create a pull request in your Git hosting from `feature/myfeature` into `master`.
* Lagoobernetes will now merge the `feature/myfeature` branch merged on top of the `master` branch and deploy that resulting code for you.
* Now you can test the functionality of the `feature/myfeature` branch just as if it had been merged into `master`, so all changes that have happened in `master` since you created the  `feature/myfeature` branch from it will be there, and you don't need to worry that you might have an older version of the `master` branch.
  * If there is a merge conflict, the build will fail, Lagoobernetes will stop and notify you.
* After you have tested your pull request branch, you can go back to your Git hosting and actually merge the code into `master`, this will now trigger a deployment of `master`.
* With the merge of the pull request it is automatically closed and Lagoobernetes will remove the environment for the pull request automatically.

Some teams might opt to create the pull request against a shared `staging` branch and then merge the `staging` branch into the `master` branch via another pull request. This depends on the kind of Git workflow you're using.

Additionally, in Lagoobernetes you can define that only pull requests with a specific text in the title are deployed. `[BUILD]` defined as regular expression will only deploy pull requests that have a title like `[BUILD] My Pull Request`, while a pull request with that title `My other Pull Request` is not automatically deployed. This helps to keep the amount of environments small and allows for pull requests that don't need an environment yet.

### Automatic database sync for pull requests

Automatic pull request environments are a fantastic thing. But it would also be handy to have the database synced from another environment.

The following example will sync the staging database on the first rollout of the pull request environment:


```
tasks:
  post-rollout:
    - run:
        name: IF no Drupal installed & Pullrequest = Sync database from staging
        command: |
            if [[ -n ${LAGOOBERNETES_PR_BASE_BRANCH} ]] && tables=$(drush sqlq 'show tables;') && [ -z "$tables" ]; then
                drush -y sql-sync @staging default
            fi
        service: cli
        shell: bash
```


## Promotion

Another way of deploying your code into an environment is the promotion workflow.

The idea behind the promotion workflow comes from this \(as an example\):

Even if you merge the branch `staging` into the `master` branch, _and_ if there were no changes to `master` , so `master` and `staging` have the exact same code in Git, it could still technically be possible that the resulting Docker images are slightly different. This is because it's possible that between the last `staging` deployment and the current `master` deployment, some upstream Docker images may have changed, or dependencies loaded from the various package managers may have changed. This is a very small chance, but it's there.

For this situation, Lagoobernetes understand the concept of promoting Lagoobernetes images from one environment to another. This basically means that it will take the already built and deployed Docker images from one environment, and will use those exact same Docker images for another environment.

In our example, we want to promote the Docker images from the `master` environment to the `production` environment:

* First, we need a regular deployed environment with the name `master`. Make sure that the deployment successfully.
* Also, make sure that you don't have a branch called `production` in your Git repository. This could lead to weird confusions \(like people pushing into this branch, etc.\).
* Now trigger a promotion deployment via this curl request:

```bash
  curl -X POST \
      https://rest.lagoobernetes.amazeeio.cloud/promote \
      -H 'Content-Type: application/json' \
      -d '{
          "projectName":"myproject",
          "sourceEnvironmentName": "master",
          "branchName": "production"
      }'
```

This tells Lagoobernetes that you want to promote from the source `master` to the destination `production` \(yes, it really uses `branchName` as destination, which is a bit unfortunate, but it will be fixed soon\).

Lagoobernetes will now do the following:

* Checkout the Git branch `master` in order to load the `.lagoobernetes.yml` and `docker-compose.yml` \(Lagoobernetes still needs these in order to fully work\).
* Create all Kubernetes/OpenShift objects for the defined services in `docker-compose.yml` , but with `LAGOOBERNETES_GIT_BRANCH=production` as environment variable.
* Copy the newest images from the `master` environment and use them \(instead of building Images or tagging them from upstream\).
* Run all post-rollout tasks like a normal deployment.

You will receive the same notifications of success or failures like any other deployment.

