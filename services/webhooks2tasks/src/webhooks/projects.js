// @flow

const { logger } = require('@lagoobernetes/commons/src/local-logging');
const { getProjectsByGitUrl } = require('@lagoobernetes/commons/src/api');
const { sendToLagoobernetesLogs } = require('@lagoobernetes/commons/src/logs');
const githubPullRequestClosed = require('../handlers/githubPullRequestClosed');
const githubPullRequestOpened = require('../handlers/githubPullRequestOpened');
const githubPullRequestSynchronize = require('../handlers/githubPullRequestSynchronize');
const githubBranchDeleted = require('../handlers/githubBranchDeleted');
const githubPush = require('../handlers/githubPush');
const bitbucketPush = require('../handlers/bitbucketPush');
const bitbucketBranchDeleted = require('../handlers/bitbucketBranchDeleted');
const bitbucketPullRequestUpdated = require('../handlers/bitbucketPullRequestUpdated');
const bitbucketPullRequestClosed = require('../handlers/bitbucketPullRequestClosed');
const gitlabPush = require('../handlers/gitlabPush');
const gitlabBranchDeleted = require('../handlers/gitlabBranchDeleted');
const gitlabPullRequestClosed = require('../handlers/gitlabPullRequestClosed');
const gitlabPullRequestOpened = require('../handlers/gitlabPullRequestOpened');
const gitlabPullRequestUpdated = require('../handlers/gitlabPullRequestUpdated');

import type {
  WebhookRequestData,
  ChannelWrapper,
  RabbitMQMsg,
  Project
} from './types';

async function processProjects(
  rabbitMsg: RabbitMQMsg,
  channelWrapperWebhooks: ChannelWrapper
): Promise<void> {
  const webhook: WebhookRequestData = JSON.parse(rabbitMsg.content.toString());

  let projects: Project[];

  const { webhooktype, event, giturl, uuid, body } = webhook;

  try {
    projects = await getProjectsByGitUrl(giturl);
  } catch (error) {
    if (error.name == 'ProjectNotFound') {
      const meta = {
        event: `${webhooktype}:${event}`
      };
      sendToLagoobernetesLogs(
        'warn',
        'unresolved',
        uuid,
        `unresolvedProject:webhooks2tasks`,
        meta,
        `Unresolved project \`${giturl}\` while handling ${webhooktype}:${event}`
      );
      channelWrapperWebhooks.ack(rabbitMsg);
    } else {
      // we have an error that we don't know about, let's retry this message a little later

      const retryCount = rabbitMsg.properties.headers['x-retry']
        ? rabbitMsg.properties.headers['x-retry'] + 1
        : 1;

      if (retryCount > 3) {
        sendToLagoobernetesLogs(
          'error',
          '',
          uuid,
          'webhooks2tasks:resolveProject:fail',
          {
            error: error,
            msg: JSON.parse(rabbitMsg.content.toString()),
            retryCount: retryCount
          },
          `Error during loading project for GitURL '${giturl}', bailing after 3 retries, error was: ${error}`
        );
        channelWrapperWebhooks.ack(rabbitMsg);
        return;
      }

      const retryDelaySecs = Math.pow(10, retryCount);
      const retryDelayMilisecs = retryDelaySecs * 1000;

      sendToLagoobernetesLogs(
        'warn',
        '',
        uuid,
        'webhooks2tasks:resolveProject:retry',
        {
          error: error,
          msg: JSON.parse(rabbitMsg.content.toString()),
          retryCount: retryCount
        },
        `Error during loading project for GitURL '${giturl}', will try again in ${retryDelaySecs} secs, error was: ${error}`
      );

      // copying options from the original message
      const retryMsgOptions = {
        appId: rabbitMsg.properties.appId,
        timestamp: rabbitMsg.properties.timestamp,
        contentType: rabbitMsg.properties.contentType,
        deliveryMode: rabbitMsg.properties.deliveryMode,
        headers: {
          ...rabbitMsg.properties.headers,
          'x-delay': retryDelayMilisecs,
          'x-retry': retryCount
        },
        persistent: true
      };
      // publishing a new message with the same content as the original message but into the `lagoobernetes-tasks-delay` exchange,
      // which will send the message into the original exchange `lagoobernetes-tasks` after x-delay time.
      channelWrapperWebhooks.publish(
        `lagoobernetes-webhooks-delay`,
        rabbitMsg.fields.routingKey,
        rabbitMsg.content,
        retryMsgOptions
      );

      // acknologing the existing message, we cloned it and is not necessary anymore
      channelWrapperWebhooks.ack(rabbitMsg);
    }
    return;
  }

  projects.forEach(async project => {
    switch (`${webhooktype}:${event}`) {
      case 'github:pull_request':
        switch (body.action) {
          case 'closed':
            await handle(
              githubPullRequestClosed,
              webhook,
              project,
              `${webhooktype}:${event}:${body.action}`
            );
            break;

          case 'opened':
          case 'reopened':
            await handle(
              githubPullRequestOpened,
              webhook,
              project,
              `${webhooktype}:${event}:${body.action}`
            );
            break;

          case 'synchronize':
          case 'edited':
            await handle(
              githubPullRequestSynchronize,
              webhook,
              project,
              `${webhooktype}:${event}:${body.action}`
            );
            break;

          default:
            unhandled(
              webhook,
              project,
              `${webhooktype}:${event}:${body.action}`
            );
            break;
        }
        break;

      case 'github:delete':
        switch (body.ref_type) {
          case 'branch':
            // We do not handle branch deletes via github delete push event, as github also sends a regular push event with 'deleted=true'. It's handled there (see below inside "github:push")
            unhandled(
              webhook,
              project,
              `${webhooktype}:${event}:${body.ref_type}`
            );
            break;

          default:
            unhandled(
              webhook,
              project,
              `${webhooktype}:${event}:${body.ref_type}`
            );
            break;
        }
        break;

      case 'github:push':
        if (body.deleted === true) {
          await handle(
            githubBranchDeleted,
            webhook,
            project,
            `${webhooktype}:${event}`
          );
        } else {
          await handle(githubPush, webhook, project, `${webhooktype}:${event}`);
        }

        break;
      case 'bitbucket:repo:push':
        if (body.push.changes[0].closed === true) {
          await handle(
            bitbucketBranchDeleted,
            webhook,
            project,
            `${webhooktype}:${event}`
          );
        } else {
          await handle(
            bitbucketPush,
            webhook,
            project,
            `${webhooktype}:${event}`
          );
        }

        break;

      case 'bitbucket:pullrequest:created':
      case 'bitbucket:pullrequest:updated':
        await handle(
          bitbucketPullRequestUpdated,
          webhook,
          project,
          `${webhooktype}:${event}`
        );
        break;
      case 'bitbucket:pullrequest:rejected':
      case 'bitbucket:pullrequest:fulfilled':
        await handle(
          bitbucketPullRequestClosed,
          webhook,
          project,
          `${webhooktype}:${event}`
        );
        break;

      case 'gitlab:push':
        if (body.after == '0000000000000000000000000000000000000000') {
          // be aware, even though we classify this as a delete/remove event by the all-zero sha
          // the gitlab webhook payload has this marked as a normal `push` event
          await handle(
            gitlabBranchDeleted,
            webhook,
            project,
            `${webhooktype}:${event}`
          );
        } else {
          await handle(gitlabPush, webhook, project, `${webhooktype}:${event}`);
        }

        break;

      case 'gitlab:merge_request':
        switch (body.object_attributes.action) {
          case 'open':
            await handle(
              gitlabPullRequestOpened,
              webhook,
              project,
              `${webhooktype}:${event}:${body.object_attributes.action}`
            );
            break;

          case 'update':
            await handle(
              gitlabPullRequestUpdated,
              webhook,
              project,
              `${webhooktype}:${event}:${body.object_attributes.action}`
            );
            break;

          case 'merge':
          case 'close':
            await handle(
              gitlabPullRequestClosed,
              webhook,
              project,
              `${webhooktype}:${event}:${body.object_attributes.action}`
            );
            break;

          default:
            unhandled(
              webhook,
              project,
              `${webhooktype}:${event}:${body.object_attributes.action}`
            );
            break;
        }
        break;

      default:
        unhandled(webhook, project, `${webhooktype}:${event}`);
        break;
    }
  });
  channelWrapperWebhooks.ack(rabbitMsg);
}

async function handle(
  handler,
  webhook: WebhookRequestData,
  project: Project,
  fullEvent: string
) {
  const { webhooktype, event, giturl, uuid, body } = webhook;

  logger.info(`Handling ${fullEvent} for project ${project.name} `, {
    uuid,
    giturl
  });

  try {
    await handler(webhook, project);
  } catch (error) {
    logger.error(`Error handling ${fullEvent} for project ${project.name}`);
    logger.error(error);
  }
}

async function unhandled(
  webhook: WebhookRequestData,
  project: Project,
  fullEvent: string
) {
  const { webhooktype, event, giturl, uuid, body } = webhook;

  const meta = {
    fullEvent: fullEvent
  };
  sendToLagoobernetesLogs(
    'info',
    project.name,
    uuid,
    `unhandledWebhook`,
    meta,
    `Unhandled Webhook \`${fullEvent}\` for \`${project.name}\``
  );
  return;
}

module.exports = processProjects;
