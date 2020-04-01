# Set Up a New Project

!!!hint
    NOTE: We are working hard on getting our CLI and GraphQL API set up to allow everyone using Lagoobernetes to setup and configure their projects themselves. Right now, it needs more testing before we can release those features, so hold tight!


Until then, the setup of a new project involves talking to your Lagoobernetes administrator \(who is a human from amazee.io\). Anyway, they are much friendlier than APIs. ☺

Please have the following information ready for your Lagoobernetes administrator:

* SSH public keys, email addresses and the names of everybody that will work on this project. Here are instructions for generating and copying SSH keys for [GitHub](https://help.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh), [GitLab](https://docs.gitlab.com/ee/ssh/), and [Bitbucket](https://confluence.atlassian.com/bitbucket/set-up-an-ssh-key-728138079.html).
* The URL of the Git repository where your code is hosted \(`git@example.com:test/test.git`\).
* The name of the Git branch you would like to use for your production environment \(see [Environment Types](environment_types.md) for details about the environments\).
* Which branches and pull requests you would like to deploy to your additional environments. With Lagoobernetes, you can filter branches and pull requests by name with regular expressions, and your Lagoobernetes administrator can get this set up for you.

We suggest that you deploy specific important branches \(like `develop` and `master`\) and pull requests. But that's all up to you! \(see [Workflows](workflows.md) for some more information\)

## 1. Make sure your project is Lagoobernetesized

This means that the `.lagoobernetes.yml` and `docker-compose.yml` files are available in your Git repository and configured accordingly.

If this is not the case, check out the list of [Step-by-Step Guides](index.md) on how to do so before proceeding.

## 2. Provide access to your code

In order to deploy your code, Lagoobernetes needs access to it. By design and for security, Lagoobernetes only needs read access to your Git repository.

Your Lagoobernetes administrator will tell you the SSH public key or the Git account to give read access to.

## 3. Configure Webhook

Lagoobernetes needs to be informed about a couple of events that are happening to your Git repository. Currently these are pushes and pull requests, but we may add more in the future.

As Lagoobernetes supports many different Git hosts, we have split off those instructions into this documentation: [Configure Webhooks](configure_webhooks.md).

## 4. Next: First deployment

Congratulations, you are now ready to run your [first deployment](first_deployment.md).

