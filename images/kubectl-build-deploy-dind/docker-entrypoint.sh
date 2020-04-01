#!/bin/bash
set -e

if docker -H docker-host.lagoobernetes.svc info &> /dev/null; then
    export DOCKER_HOST=docker-host.lagoobernetes.svc
else
    echo "could not connect to docker-host.lagoobernetes.svc";
    exit 1
fi

mkdir -p ~/.ssh

cp /var/run/secrets/lagoobernetes/ssh/ssh-privatekey ~/.ssh/key

# Add a new line to the key, as some ssh key formats need a new line
echo "" >> ~/.ssh/key

export SSH_PRIVATE_KEY=$(cat ~/.ssh/key | awk -F'\n' '{if(NR == 1) {printf $0} else {printf "\\n"$0}}')

echo -e "Host * \n    StrictHostKeyChecking no" > ~/.ssh/config
chmod 400 ~/.ssh/*

eval $(ssh-agent)
ssh-add ~/.ssh/key
