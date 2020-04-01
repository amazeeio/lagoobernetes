# Varnish

The [Lagoobernetes `Varnish` image Dockerfile](https://github.com/amazeeio/lagoobernetes/blob/master/images/varnish/Dockerfile). Based on the [official `varnish` package](https://hub.docker.com/_/varnish) provided by `alpine:3.7` image.

By default, `vmod-dynamic` and `vmod-bodyaccess` modules are installed.

## Lagoobernetes & OpenShift adaptions

This image is prepared to be used on Lagoobernetes, which leverages OpenShift. There are therefore some things already done:

* Folder permissions are automatically adapted with [`fix-permissions`](https://github.com/sclorg/s2i-base-container/blob/master/core/root/usr/bin/fix-permissions), so this image will work with a random user, and therefore also on OpenShift.

## Included varnish modules

* [`vbox-dynamic`](https://github.com/nigoroll/libvmod-dynamic) - Dynamic backends from DNS lookups and service discovery from SRV records.
* [`vbox-bodyaccess`](https://github.com/aondio/libvmod-bodyaccess) - Varnish `vmod` that lets you access the request body.

## Included `default.vcl` configuration file

The image ships a _default_ `vcl` configuration file, optimized to work on Lagoobernetes. Some options are configurable via environments variables \(see [Environment Variables](../environment_variables.md)\).

## Environment Variables
Environment variables defined in Varnish base image

| Environment Variable         | Default               | Description                                                                            |
| ---------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `VARNISH_BACKEND_HOST`       | nginx                 | Default Backend Host                                                                   |
| `VARNISH_BACKEND_PORT`       | 8080                  | Default listening varnish port                                                         |
| `VARNISH_SECRET`             | lagoobernetes_default_secret | Varnish secret used to connect to management                                           |
| `LIBVMOD_DYNAMIC_VERSION`    | 5.2                   | Default version of vmod-dynamic module                                                 |
| `LIBVMOD_BODYACCESS_VERSION` | 5.0                   | Default version of vmod-bodyaccess module                                              |
| `HTTP_RESP_HDR_LEN`          | 8k                    | Maximum length of any HTTP backend response header                                     |
| `HTTP_RESP_SIZE`             | 32k                   | Maximum number of bytes of HTTP backend response we will deal with                     |
| `NUKE_LIMIT`                 | 150                   | Maximum number of objects we attempt to nuke in order to make space for a object body. |
| `CACHE_TYPE`                 | malloc                | Type of varnish cache                                                                  |
| `CACHE_SIZE`                 | 500M                  | Cache size                                                                             |
| `LISTEN`                     | 8080                  | Default backend server port                                                            |
| `MANAGEMENT_LISTEN`          | 6082                  | Default management listening port                                                      |
