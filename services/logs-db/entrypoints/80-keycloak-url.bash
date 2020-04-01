#!/bin/bash


# if KEYCLOAK_URL is not defined, we try to load it from LAGOOBERNETES_ROUTES
if [[ -z ${KEYCLOAK_URL+x} ]]; then
    REGEX="(https?://keycloak[0-9A-Za-z\.-]+)"

    if [[ $LAGOOBERNETES_ROUTES =~ $REGEX ]]; then
        export KEYCLOAK_URL=${BASH_REMATCH[1]}
    else
        echo "Could not load keycloak URL from LAGOOBERNETES_ROUTES, please define via KEYCLOAK_URL env variable"
        exit 1
    fi
fi

