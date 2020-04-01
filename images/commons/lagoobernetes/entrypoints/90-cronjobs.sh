#!/bin/sh
# Only if $CRONJOBS is not empty and /lagoobernetes/crontabs/crontab is not existing yet
if [ -x /lagoobernetes/bin/cron ] && [ ! -z "$CRONJOBS" ] && [ ! -f /lagoobernetes/crontabs/crontab ]; then
  echo "Setting up Cronjobs:"
  echo "${CRONJOBS}"
  echo "${CRONJOBS}" > /lagoobernetes/crontabs/crontab
  # go-crond does not like if group and others have write access to the crontab
  chmod go-w /lagoobernetes/crontabs/crontab
  /lagoobernetes/bin/cron $(whoami):/lagoobernetes/crontabs/crontab --allow-unprivileged --no-auto -v &
fi