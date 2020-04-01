#!/bin/bash
set -x
set -eo pipefail
set -o noglob

OPENSHIFT_REGISTRY=docker-registry.default.svc:5000
OPENSHIFT_PROJECT=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)
REGISTRY_REPOSITORY=$OPENSHIFT_PROJECT

if [ "$CI" == "true" ]; then
  CI_OVERRIDE_IMAGE_REPO=${OPENSHIFT_REGISTRY}/lagoobernetes
else
  CI_OVERRIDE_IMAGE_REPO=""
fi

if [ "$TYPE" == "pullrequest" ]; then
  /oc-build-deploy/scripts/git-checkout-pull-merge.sh "$SOURCE_REPOSITORY" "$PR_HEAD_SHA" "$PR_BASE_SHA"
else
  /oc-build-deploy/scripts/git-checkout-pull.sh "$SOURCE_REPOSITORY" "$GIT_REF"
fi

if [[ -n "$SUBFOLDER" ]]; then
  cd $SUBFOLDER
fi

if [ ! -f .lagoobernetes.yml ]; then
  echo "no .lagoobernetes.yml file found"; exit 1;
fi

INJECT_GIT_SHA=$(cat .lagoobernetes.yml | shyaml get-value environment_variables.git_sha false)
if [ "$INJECT_GIT_SHA" == "true" ]
then
  LAGOOBERNETES_GIT_SHA=`git rev-parse HEAD`
else
  LAGOOBERNETES_GIT_SHA="0000000000000000000000000000000000000000"
fi

set +x
DOCKER_REGISTRY_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

docker login -u=jenkins -p="${DOCKER_REGISTRY_TOKEN}" ${OPENSHIFT_REGISTRY}

DEPLOYER_TOKEN=$(cat /var/run/secrets/lagoobernetes/deployer/token)

oc login --insecure-skip-tls-verify --token="${DEPLOYER_TOKEN}" https://kubernetes.default.svc
set -x

oc project --insecure-skip-tls-verify $OPENSHIFT_PROJECT

ADDITIONAL_YAMLS=($(cat .lagoobernetes.yml | shyaml keys additional-yaml || echo ""))

for ADDITIONAL_YAML in "${ADDITIONAL_YAMLS[@]}"
do
  ADDITIONAL_YAML_PATH=$(cat .lagoobernetes.yml | shyaml get-value additional-yaml.$ADDITIONAL_YAML.path false)
  if [ $ADDITIONAL_YAML_PATH == "false" ]; then
    echo "No 'path' defined for additional yaml $ADDITIONAL_YAML"; exit 1;
  fi

  if [ ! -f $ADDITIONAL_YAML_PATH ]; then
    echo "$ADDITIONAL_YAML_PATH for additional yaml $ADDITIONAL_YAML not found"; exit 1;
  fi

  ADDITIONAL_YAML_COMMAND=$(cat .lagoobernetes.yml | shyaml get-value additional-yaml.$ADDITIONAL_YAML.command apply)
  ADDITIONAL_YAML_IGNORE_ERROR=$(cat .lagoobernetes.yml | shyaml get-value additional-yaml.$ADDITIONAL_YAML.ignore_error false)
  ADDITIONAL_YAML_IGNORE_ERROR="${ADDITIONAL_YAML_IGNORE_ERROR,,}" # convert to lowercase, as shyaml returns "True" if the yaml is set to "true"
  . /oc-build-deploy/scripts/exec-additional-yaml.sh
done

.  /oc-build-deploy/build-deploy-docker-compose.sh
