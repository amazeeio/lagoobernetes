# Solr

The [Lagoobernetes `Solr` image Dockerfile](https://github.com/amazeeio/lagoobernetes/blob/master/images/solr/Dockerfile). Based on the official [`solr:<version>-alpine` images](https://hub.docker.com/_/solr).

This Dockerfile is intended to be used to set up a standalone Solr server with an initial core `mycore`.

## Supported Versions

* 5.5
* 6.6
* 7.5

## Lagoobernetes & OpenShift adaptions

This image is prepared to be used on Lagoobernetes, which leverages OpenShift. There are therefore some things already done:

* Folder permissions are automatically adapted with [`fix-permissions`](https://github.com/sclorg/s2i-base-container/blob/master/core/root/usr/bin/fix-permissions), so this image will work with a random user, and therefore also on OpenShift.
* `10-solr-port.sh` script to fix and check `Solr` port.
* `20-solr-datadir.sh` script to check if `Solr` config is compliant for Lagoobernetes.

## Environment Variables

Environment variables defined in `Solr` base image.

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `SOLR_JAVA_MEM` | 512M | Default Java HEAP size \(ie. `SOLR_JAVA_MEM="-Xms10g -Xmx10g"` \). |

