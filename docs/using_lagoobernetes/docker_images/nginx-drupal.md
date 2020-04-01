# Nginx-Drupal

The [Lagoobernetes `nginx-drupal` Docker image](https://github.com/amazeeio/lagoobernetes/blob/master/images/nginx-drupal/Dockerfile). Optimized to work with Drupal. Based on [Lagoobernetes `nginx` image](./).

## Lagoobernetes & OpenShift adaptions

This image is prepared to be used on Lagoobernetes, which leverages OpenShift. There are therefore some things already done:

* Folder permissions are automatically adapted with [`fix-permissions`](https://github.com/sclorg/s2i-base-container/blob/master/core/root/usr/bin/fix-permissions), so this image will work with a random user, and therefore also on OpenShift.
* To keep `drupal.conf` 's configuration file as clean and customizable as possible, we added `include` directives in the main sections of the file:`server`, `location /`, `location @drupal` and `location @php`.
* Further information in the section [Drupal.conf customization](nginx-drupal.md#drupal-conf-customization).

## Included Nginx Drupal configuration \(`drupal.conf`\)

The image includes a full Nginx working configuration for Drupal 7 and 8. It includes some extra functionalities like:

* Support for [`humanstxt` Drupal module](https://www.drupal.org/project/humanstxt).
* Support for [`robotstxt` Drupal module](https://www.drupal.org/project/robotstxt).
* Disallow access to `vagrant` directory for local development.

## Drupal.conf customization

The `drupal.conf` file is a customized version of the `Nginx` configuration file, optimized for Drupal. Customers have different ways of customizing it:

* _Modifying it_ \(hard to support in case of errors\).
* Using _built-in_ customization through `*.conf` files.

The `drupal.conf` file is divided into several sections. The sections we've included in our customizations are:

* `server`
* `location /`
* `location @drupal`
* `location @php`.

For each of this section, there are **two** includes:

* `*_prepend.conf`
* `*_append.conf`

Here what the `location @drupal` section looks like:


```bash
location @drupal {
    include /etc/nginx/conf.d/drupal/location_drupal_prepend*.conf;

    include        /etc/nginx/fastcgi.conf;
    fastcgi_param  SCRIPT_NAME        /index.php;
    fastcgi_param  SCRIPT_FILENAME    $realpath_root/index.php;
    fastcgi_pass   ${NGINX_FASTCGI_PASS:-php}:9000;

    include /etc/nginx/conf.d/drupal/location_drupal_append*.conf;
}
```


This configuration allows customers to create files called `location_drupal_prepend.conf` and `location_drupal_append.conf`, where they can put all the configuration they want to insert before and after the other statements.

Those files, once created, **MUST** exist in the `Nginx` container, so add them to `Dockerfile.nginx` like so:


```bash
COPY location_drupal_prepend.conf /etc/nginx/conf.d/drupal/location_drupal_prepend.conf
RUN fix-permissions /etc/nginx/conf.d/drupal/location_drupal_prepend.conf
```

