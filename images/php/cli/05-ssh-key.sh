#!/bin/sh
set -e

# If we there is an ssh key injected via lagoobernetes and kubernetes, we use that
if [ -f /var/run/secrets/lagoobernetes/sshkey/ssh-privatekey ]; then
  cp -f /var/run/secrets/lagoobernetes/sshkey/ssh-privatekey /home/.ssh/key
# If there is an env variable SSH_PRIVATE_KEY we use that
elif [ ! -z "$SSH_PRIVATE_KEY" ]; then
  echo -e "$SSH_PRIVATE_KEY" > /home/.ssh/key
# If there is an env variable LAGOOBERNETES_SSH_PRIVATE_KEY we use that
elif [ ! -z "$LAGOOBERNETES_SSH_PRIVATE_KEY" ]; then
  echo -e "$LAGOOBERNETES_SSH_PRIVATE_KEY" > /home/.ssh/key
fi

if [ -f /home/.ssh/key ]; then
  # add a new line to the key. OpenSSH is very picky that keys are always end with a newline
  echo >> /home/.ssh/key
  # Fix permissions of SSH key
  chmod 600 /home/.ssh/key
fi
