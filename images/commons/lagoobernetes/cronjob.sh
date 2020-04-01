#!/bin/sh

exit_trap() {
  rv=$?
  # TODO: Send Lagoobernetes API information about our CronJob Success or Failure
  exit $rv
}

# on exit, always call exit_trap
trap exit_trap EXIT

echo "$(date --utc +%FT%TZ) CRONJOB: $@"

sh -c "/lagoobernetes/entrypoints.sh $@"