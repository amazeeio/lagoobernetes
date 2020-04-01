# Varnish in Drupal

We suggest using Drupal with a Varnish reverse proxy. Lagoobernetes provides a `varnish-drupal` Docker image that has Varnish already configured with a [Drupal Varnish config](https://github.com/amazeeio/lagoobernetes/blob/master/images/varnish-drupal/drupal.vcl).

This Varnish config does the following:

- It understands Drupal session cookies and automatically disables the Varnish caching for any authenticated request.
- It automatically caches any assets (images, css, js, etc.) for one month and also sends this header to the browser, so browser cache the assets as well. This happens for authenticated and non-authenticated requests.
- It has support for `BAN` and `URIBAN` which is used by the Drupal 8 purge module
- It removes `utm_` and `gclid` from the URL parameter to prevent that Google Analytics links cause multiple cache objects.
- And many other good things, just check out the [drupal.vcl](https://github.com/amazeeio/lagoobernetes/blob/master/images/varnish-drupal/drupal.vcl)

## Usage with Drupal 8

TL;DR: Check out the [Drupal 8 Example](https://github.com/amazeeio/drupal-example), it's shipped with the needed modules and needed Drupal configuration.

### Install Purge and Varnish Purge modules

In order to fully use Varnish with Drupal 8 Cache Tags, you need to install the [Purge](https://www.drupal.org/project/purge) and [Varnish Purge](https://www.drupal.org/project/varnish_purge) modules. They itself ship with many submodules, we suggest to install at least the following: `purge`, `purge_drush`, `purge_tokens`, `purge_ui`, `purge_processor_cron`, `purge_processor_lateruntime`, `purge_queuer_coretags`, `varnish_purger`, `varnish_purge_tags`.

Grab them all at once:

    composer require drupal/purge drupal/varnish_purge


    drush en purge purge_drush purge_tokens purge_ui purge_processor_cron purge_processor_lateruntime purge_queuer_coretags varnish_purger varnish_purge_tags

### Configure Varnish Purge

1. Visit `Configuration > Development > Performance > Purge`
2. Add a purger via `Add purger`
3. Select `Varnish Bundled Purger` (not the `Varnish Purger`, see the #Behind the Scenes section, for more information.)
4. Click the dropdown beside the just added purger and click `Configure`
5. Give it a nice name, `Lagoobernetes Varnish` sounds very good
6. Configure it with:

        TYPE: Tag

        REQUEST:
        Hostname: varnish
        (or whatever your Varnish is called in docker-compose.yml)
        Port: 8080
        Path: /
        Request Method: BAN
        Scheme: http

        HEADERS:
        Header: Cache-Tags
        Value: [invalidations:separated_pipe]

7. `Save configuration`

That's it! If you'd like to test this locally, make sure you read the next section.

### Configure Drupal for Varnish

There are a few other configurations that can be done:

1. Uninstall the `Internal Page Cache` Drupal module with `drush pmu page_cache`. It can cause some weird double caching situations where only the Varnish cache is cleared but not the internal cache and changes appear very slowly to the users. Also it uses a lot of cache storage on big sites.
2. Change `$config['system.performance']['cache']['page']['max_age']` in `production.settings.php` to `2628000`. This tells Varnish to cache sites for up 1 month, which sounds like a lot, but the Drupal 8 Cache Tag system is so awesome, that it will basically make sure that the varnish cache is purged whenever something changes.

### Test Varnish Locally

Drupal setups on Lagoobernetes locally have Varnish and the Drupal caches disabled as it can be rather hard to develop with all them set, this is done via:

- the `VARNISH_BYPASS=true` environment variable in `docker-compose.yml` which tells Varnish to basically disable itself
- Drupal is configured to not send any cache headers (via setting the Drupal config `$config['system.performance']['cache']['page']['max_age'] = 0` in `development.settings.php`)

To test Varnish locally, change the following in `docker-compose.yml`

- set `VARNISH_BYPASS` to `false` in the varnish service section.
- set `LAGOOBERNETES_ENVIRONMENT_TYPE` to `production` in the `x-environment` section
- run `docker-compose up -d` which restart all services with the new environment variables

Now you should be able to test Varnish, here a short example assuming there is a node with the ID `1` and has the URL `drupal-example.docker.amazee.io/node/1`

1. Run `curl -I drupal-example.docker.amazee.io/node/1` and look for these Headers:
    - `X-LAGOOBERNETES` should include `varnish` which tells you that the request actually went through `varnish`
    - `Age:` will be still `0` as Varnish probably never saw this site before and the first request will warm the varnish cache.
    - `X-Varnish-Cache` will be `MISS` telling you as well that Varnish didn't find a previously cached version of this request.
2. Now run `curl -I drupal-example.docker.amazee.io/node/1` again and the headers should now be:
    - `Age:` will show you how many seconds ago the request has been cached, in our example it will probably something between 1-30, depending on how fast you are executing the command
    - `X-Varnish-Cache` will be `HIT`, telling you that Varnish successfully found a cached version of the request and returned that one to you.
3. Change the Node 1 in Drupal
4. Run `curl -I drupal-example.docker.amazee.io/node/1` and the headers should be like on the very first request:
    - `Age:0`
    - `X-Varnish-Cache: MISS`

### Varnish on Drupal behind the scenes

If you come from other Drupal hosts or have done a Drupal 8 & Varnish tutorial before, you might have realized that there are a couple of changes in the Lagoobernetes Drupal Varnish tutorial. Let's address them:

#### Usage of `Varnish Bundled Purger` instead of `Varnish Purger`

The `Varnish Purger` purger sends a `BAN` request for each single Cache-Tag that should be invalidated. Drupal has a lot of Cache-Tags and therefore this could lead into quite an amount of requests sent to Varnish. `Varnish Bundled Purger` instead sends just one `BAN` request for multiple invalidations, separated nicely by pipe (`|`) which fits perfectly to the varnish regular expression system of bans. This causes less requests and a smaller ban list table inside Varnish.

#### Usage of `Purge Late runtime processor`

Contradictory to the Varnish module in Drupal 7, the Drupal 8 Purge module has a slightly different approach to purging caches: It adds them to a queue which is then processed by different processors. Purge suggests to use the `Cron processor` which means that the varnish cache is only purged during a Cron run. This can lead into old data begin cached by Varnish, as your cron is probably not configured to run every minute or so, and can result in onfused editors and clients.

Instead we suggest using the `Purge Late runtime processor`, which  processes the queue at the end of each Drupal request. This has the advantage that if a Cache-Tag is added to the purge queue (because an editor edited a Drupal node, for example) the Cache-Tags for this node are directly purged. Together with the `Varnish Bundled Purger`, this means just a single additional request to Varnish at the very end of a Drupal request, which causes no noticeable processing time on the request.

#### Full support for Varnish Ban Lurker

Our Varnish configurations have full support for `Ban Lurker`. Ban Lurker is basically a small tool that runs through the Varnish ban list and compares them to the cached requests in the varnish cache. If it finds one that should be "banned" it removes them from the cache and also removes the ban itself. This keeps the list of bans small and with that less processing time for Varnish on each request.

### Troubleshooting

Varnish doesn't cache? Or something else not working? Here a couple of ways to debug:

- Run `drush p-debug-en` to enable debug logging of the purge module, this should show you debugging in the Drupal log under `admin/reports/dblog`
- Make sure that Drupal sends proper cache headers. To test this best use the URL that Lagoobernetes generates for bypassing the Varnish cache, (locally in Drupal example this is http://nginx-drupal-example.docker.amazee.io). Check for `Cache-Control: max-age=900, public` header, where the `900` is what you configured in `$config['system.performance']['cache']['page']['max_age']`
- Make sure that the environment variable `VARNISH_BYPASS` is **not** set to `true` (see `docker-compose.yml` and run `docker-compose up -d varnish` to make sure the environment variable is configured correctly).
- If all fails and before you flip your table, talk to the Lagoobernetes Team, we're happy to help.
