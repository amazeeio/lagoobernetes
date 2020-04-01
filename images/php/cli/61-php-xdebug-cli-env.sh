#!/bin/sh

# Only if XDEBUG_ENABLE is not empty
if [ ! -z ${XDEBUG_ENABLE} ]; then
  # XDEBUG_CONFIG is used by xdebug to decide if an xdebug session should be started in the CLI or not.
  # The content doesn't really matter it just needs to be set, the actual connection details are loaded from /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
  export XDEBUG_CONFIG="idekey=lagoobernetes"

  # PHP_IDE_CONFIG is used by PhpStorm and should be the URL of the project, we use the `LAGOOBERNETES_ROUTE` for it (if it exists)
  if [ ${LAGOOBERNETES_ROUTE+x} ]; then
    SERVERNAME=$(echo $LAGOOBERNETES_ROUTE | sed 's/https\?:\/\///')
  else
    SERVERNAME="lagoobernetes"
  fi
  export PHP_IDE_CONFIG="serverName=${SERVERNAME}"
fi

