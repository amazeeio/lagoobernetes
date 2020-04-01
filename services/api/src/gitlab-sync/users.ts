import * as R from 'ramda';
import * as gitlabApi from '@lagoobernetes/commons/src/gitlabApi';
import * as api from '@lagoobernetes/commons/src/api';
import { logger } from '@lagoobernetes/commons/src/local-logging';

interface GitlabUser {
  name: string,
  email: string,
  id: number,
};

const usernameExistsRegex = /Username.*?exists/;

(async () => {
  const allUsers = await gitlabApi.getAllUsers() as GitlabUser[];

  logger.info(`Syncing ${allUsers.length} users`);

  for (const user of allUsers) {
    logger.debug(`Processing ${user.email}`);

    let firstName = user.name,
      lastName;
    if (user.name.includes(' ')) {
      const nameParts = user.name.split(' ');
      firstName = R.head(nameParts);
      lastName = R.tail(nameParts).join(' ');
    }

    try {
      await api.addUser(
        user.email,
        firstName,
        lastName,
        null,
        user.id,
      );
    } catch (err) {
      if (!R.test(usernameExistsRegex, err.message)) {
        logger.error(`Could not sync (add) gitlab user ${user.email} id ${user.id}: ${err.message}`);
      } else {
        try {
          await api.updateUser(
            user.email,
            {
              email: user.email,
              firstName,
              lastName,
              comment: null,
              gitlabId: user.id,
            }
          );
        } catch (err) {
          logger.error(`Could not sync (update) gitlab user ${user.email} id ${user.id}: ${err.message}`);
        }
      }
    }
  }

  logger.info('Sync completed');
})()
