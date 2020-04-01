import * as R from 'ramda';
import * as bitbucketApi from '@lagoobernetes/commons/src/bitbucketApi';
import * as api from '@lagoobernetes/commons/src/api';
import { logger } from '@lagoobernetes/commons/src/local-logging';

// The lagoobernetes group that has all of the projects needing to be synced
const LAGOOBERNETES_SYNC_GROUP = R.propOr(
  'bitbucket-sync',
  'BITBUCKET_SYNC_LAGOOBERNETES_GROUP',
  process.env
);

interface BitbucketUser {
  name: string;
  displayName: string;
  emailAddress: string;
  id: number;
}

const usernameExistsRegex = /Username.*?exists/;
const userExistsTest = errorMessage =>
  R.test(usernameExistsRegex, errorMessage);

const BitbucketPermsToLagoobernetesPerms = {
  REPO_READ: 'REPORTER',
  REPO_WRITE: 'DEVELOPER',
  REPO_ADMIN: 'MAINTAINER'
};

// Returns true if user was added or already exists.
// Returns false if adding user failed and no user exists.
const addUser = async (email: string): Promise<boolean> => {
  try {
    await api.addUser(email);
  } catch (err) {
    if (!userExistsTest(err.message)) {
      logger.error(
        `Could not sync (add) bitbucket user ${email}: ${err.message}`
      );
      return false;
    }
  }

  // User was added or already exists
  return true;
}

(async () => {
  // Keep track of users we know exist to avoid API calls
  let existingUsers = [];

  // Get all bitbucket related lagoobernetes projects
  const groupQuery = await api.getProjectsByGroupName(LAGOOBERNETES_SYNC_GROUP);
  const projects = R.pathOr([], ['groupByName', 'projects'], groupQuery) as [
    object
  ];

  logger.info(`Syncing users for ${projects.length} project(s)`);

  for (const project of projects) {
    const projectName = R.prop('name', project);
    const lagoobernetesProjectGroup = `project-${projectName}`;
    const repo = await bitbucketApi.searchReposByName(projectName);
    if (!repo) {
      logger.warn(`No bitbuket repo found for: ${projectName}`);
      continue;
    }

    const bbProject = R.path(['project', 'key'], repo);
    const bbRepo = R.prop('slug', repo);
    logger.debug(`Processing ${bbRepo}`);

    let userPermissions = [];
    try {
      userPermissions = await bitbucketApi.getRepoUsers(bbProject, bbRepo);
    } catch (e) {
      logger.warn(`Could not load users for repo: ${R.prop('slug', repo)}`);
      continue;
    }

    // Sync user/permissions from bitbucket to lagoobernetes
    for (const userPermission of userPermissions) {
      const bbUser = userPermission.user as BitbucketUser;
      const bbPerm = userPermission.permission;

      const email = bbUser.emailAddress.toLowerCase();

      if (!R.contains(email, existingUsers)) {
        const userAddedOrExists = await addUser(email);
        if (!userAddedOrExists) {
          // Errors for this case are logged in addUser
          continue;
        }

        existingUsers.push(email);
      }

      try {
        await api.addUserToGroup(
          email,
          lagoobernetesProjectGroup,
          BitbucketPermsToLagoobernetesPerms[bbPerm]
        );
      } catch (err) {
        logger.error(
          `Could not add user (${email}) to group (${lagoobernetesProjectGroup}): ${err.message}`
        );
      }
    }

    // Get current lagoobernetes users
    const currentMembersQuery = await api.getGroupMembersByGroupName(lagoobernetesProjectGroup);
    const lagoobernetesUsers = R.pipe(
      R.pathOr([], ['groupByName', 'members']),
      // @ts-ignore
      R.pluck('user'),
      // @ts-ignore
      R.pluck('email'),
    )(currentMembersQuery) as [string];

    // Get current bitbucket uers
    const bitbucketUsers = R.pipe(
      // @ts-ignore
      R.pluck('user'),
      // @ts-ignore
      R.pluck('emailAddress'),
    )(userPermissions) as [string];

    // Remove users from lagoobernetes project that are removed in bitbucket repo
    const deleteUsers = R.difference(lagoobernetesUsers, bitbucketUsers);
    for (const user of deleteUsers) {
      try {
        await api.removeUserFromGroup(user, lagoobernetesProjectGroup);
      } catch (err) {
        logger.error(`Could not remove user (${user}) from group (${lagoobernetesProjectGroup}): ${err.message}`);
      }
    }
  }

  logger.info('Sync completed');
})();
