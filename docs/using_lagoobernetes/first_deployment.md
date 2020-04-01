# First Deployment
 It's time! It's time for the first deployment into Lagoobernetes!

 We hope you are as excited as we are!

![excited](https://i.giphy.com/media/7kVRZwYRwF1ok/giphy-downsized.gif)

!!!hint
    If you are deploying a Drupal Project, skip this and read the [Drupal-specific first deployment documentation](drupal/first_deployment.md).


## 1. Make sure you are ready

In order to make your first deployment a successful one, please make sure that your project is Lagoobernetesized and that you have set up the project in Lagoobernetes. If not, or you're not sure, or that doesn't sound familiar, don't worry, go back and follow the [Step-by-Step Guides](setup_project.md) which show you how this works, and then come back and deploy!

## 2. Push!

With Lagoobernetes, you create a new deployment by just pushing into a branch that is configured to be deployed.

If you don't have any new code to push, don't worry, just run

```bash
git commit --allow-empty -m "go, go! Power Rangers!"
git push
```

This will trigger a push, and your Git hosting will inform Lagoobernetes about this push via the configured webhook.

If all is correct, you should see a notification in your configured chat system \(this has been configured by your friendly Lagoobernetes administrator\):

![Slack notification that a push has been made in a Lagoobernetesized repository.](/images/first_deployment_slack_start.jpg)

This informs you that Lagoobernetes has just started to deploy your code. Depending on the size of the code and amount of containers, this will take a couple of seconds. Just relax. If you want to know what's happening now, check out the [Build and Deploy Process of Lagoobernetes](build_deploy_process.md)

You can also check your Lagoobernetes UI to see the progress of any deployment \(your Lagoobernetes administrator has the info\).

## 3. It's done!

As soon as Lagoobernetes is done building and deploying it will send a second notification to the chat system, here an example:

![Slack notification of a successful Lagoobernetes build and deployment.](/images/first_deployment_slack_2nd_success.jpg)

It tells you:

* Which project has been deployed.
* Which branch and Git SHA have been deployed.
* A link to the full logs of the build and deployment.
* Links to all routes \(URLs\) where the environment can be reached.

You can also quickly tell what kind of notification it is by the emoji at the beginning - whether it's just info that the build has started, a success, or fail.

That's it! We hope that wasn't too hard - making devOps accessible is what we are striving for!

## But wait, how about other branches or the production environment?

That's the beauty of Lagoobernetes: it's exactly the same! Just push the branch name you defined to be your production branch and that one will be deployed.

## Failure? Don't worry.

Did the deployment fail? Oh no! But we're here to help:

1. If you deployed a Drupal site, make sure to read the [Drupal-specific first deployment documentation](drupal/first_deployment.md), which explains why this happens.
2. Click on the `Logs` link in the error notification, it will tell you where in the deployment process the failure happened.
3. If you can't figure it out, just ask your Lagoobernetes support, we are here to help!
4. Reach out to us in [Rocket Chat](https://amazeeio.rocket.chat/home).

