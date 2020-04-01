#!/bin/bash

set -e -o pipefail

oc get configmaps --all-namespaces --no-headers  | grep lagoobernetes-env | awk '{ print $1 }' | while read OPENSHIFT_PROJECT; do
  REGEX=${REGEX:-.*}
  if [[ $OPENSHIFT_PROJECT =~ $REGEX ]]; then
    . "$1"
  fi
done
