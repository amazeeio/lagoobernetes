#!/bin/sh

# Create a LAGOOBERNETES_DOMAIN from LAGOOBERNETES_ROUTE but without the scheme (http:// or https://)
export LAGOOBERNETES_DOMAIN=${LAGOOBERNETES_ROUTE#*://}