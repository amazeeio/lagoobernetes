<?php

/**
 * @file
 * Lagoobernetes Drupal 8 configuration file.
 *
 * You should not edit this file, please use environment specific files!
 * They are loaded in this order:
 * - all.settings.php
 *   For settings that should be applied to all environments (dev, prod, staging, docker, etc).
 * - all.services.yml
 *   For services that should be applied to all environments (dev, prod, staging, docker, etc).
 * - production.settings.php
 *   For settings only for the production environment.
 * - production.services.yml
 *   For services only for the production environment.
 * - development.settings.php
 *   For settings only for the development environment (development sites, docker).
 * - development.services.yml
 *   For services only for the development environment (development sites, docker).
 * - settings.local.php
 *   For settings only for the local environment, this file will not be committed in GIT!
 * - services.local.yml
 *   For services only for the local environment, this file will not be committed in GIT!
 *
 */

### Lagoobernetes Database connection
if(getenv('LAGOOBERNETES')){
  $databases['default']['default'] = array(
    'driver' => 'pgsql',
    'database' => getenv('POSTGRES_DATABASE') ?: 'drupal',
    'username' => getenv('POSTGRES_USERNAME') ?: 'drupal',
    'password' => getenv('POSTGRES_PASSWORD') ?: 'drupal',
    'host' => getenv('POSTGRES_HOST') ?: 'postgres',
    'port' => 5432,
    'prefix' => '',
  );
}

### Lagoobernetes Solr connection
// WARNING: you have to create a search_api server having "solr" machine name at
// /admin/config/search/search-api/add-server to make this work.
if (getenv('LAGOOBERNETES')) {
  $config['search_api.server.solr']['backend_config']['connector_config']['host'] = getenv('SOLR_HOST') ?: 'solr';
  $config['search_api.server.solr']['backend_config']['connector_config']['path'] = '/solr/';
  $config['search_api.server.solr']['backend_config']['connector_config']['core'] = getenv('SOLR_CORE') ?: 'drupal';
  $config['search_api.server.solr']['backend_config']['connector_config']['port'] = getenv('SOLR_PORT') ?: '8983';
  $config['search_api.server.solr']['backend_config']['connector_config']['http_user'] = (getenv('SOLR_USER') ?: '');
  $config['search_api.server.solr']['backend_config']['connector_config']['http']['http_user'] = (getenv('SOLR_USER') ?: '');
  $config['search_api.server.solr']['backend_config']['connector_config']['http_pass'] = (getenv('SOLR_PASSWORD') ?: '');
  $config['search_api.server.solr']['backend_config']['connector_config']['http']['http_pass'] = (getenv('SOLR_PASSWORD') ?: '');
  $config['search_api.server.solr']['name'] = 'Lagoobernetes Solr - Environment: ' . getenv('LAGOOBERNETES_PROJECT');
}

### Lagoobernetes Redis connection
if (getenv('LAGOOBERNETES')){
  $settings['redis.connection']['interface'] = 'PhpRedis';
  $settings['redis.connection']['host'] = getenv('REDIS_HOST') ?: 'redis';
  $settings['redis.connection']['port'] = getenv('REDIS_SERVICE_PORT') ?: '6379';

  // # Do not set the cache during installations of Drupal
  // if (!drupal_installation_attempted()) {
  //   $settings['cache']['default'] = 'cache.backend.redis';
  // }
}

### Lagoobernetes Varnish & Reverse proxy settings
if (getenv('LAGOOBERNETES')) {
  $settings['reverse_proxy'] = TRUE;

  $varnish_hosts = explode(',', getenv('VARNISH_HOSTS') ?: 'varnish');
  array_walk($varnish_hosts, function(&$value, $key) { $value .= ':6082'; });

  $config['varnish.settings']['varnish_control_terminal'] = implode($varnish_hosts, " ");
  $config['varnish.settings']['varnish_control_key'] = getenv('VARNISH_SECRET') ?: 'lagoobernetes_default_secret';
  $config['varnish.settings']['varnish_version'] = 4;
}

### Trusted Host Patterns, see https://www.drupal.org/node/2410395 for more information.
### If your site runs on multiple domains, you need to add these domains here
if (getenv('LAGOOBERNETES_ROUTES')) {
  $settings['trusted_host_patterns'] = array(
    '^' . str_replace(['.', 'https://', 'http://', ','], ['\.', '', '', '|'], getenv('LAGOOBERNETES_ROUTES')) . '$', // escape dots, remove schema, use commas as regex separator
   );
}

### Temp directory
if (getenv('TMP')) {
  $config['system.file']['path']['temporary'] = getenv('TMP');
}

### Hash Salt
if (getenv('LAGOOBERNETES')) {
  $settings['hash_salt'] = hash('sha256', getenv('LAGOOBERNETES_PROJECT'));
}

// Settings for all environments
if (file_exists(__DIR__ . '/all.settings.php')) {
  include __DIR__ . '/all.settings.php';
}

// Services for all environments
if (file_exists(__DIR__ . '/all.services.yml')) {
  $settings['container_yamls'][] = __DIR__ . '/all.services.yml';
}

if(getenv('LAGOOBERNETES_ENVIRONMENT_TYPE')){
  // Environment specific settings files.
  if (file_exists(__DIR__ . '/' . getenv('LAGOOBERNETES_ENVIRONMENT_TYPE') . '.settings.php')) {
    include __DIR__ . '/' . getenv('LAGOOBERNETES_ENVIRONMENT_TYPE') . '.settings.php';
  }

  // Environment specific services files.
  if (file_exists(__DIR__ . '/' . getenv('LAGOOBERNETES_ENVIRONMENT_TYPE') . '.services.yml')) {
    $settings['container_yamls'][] = __DIR__ . '/' . getenv('LAGOOBERNETES_ENVIRONMENT_TYPE') . '.services.yml';
  }
}

// Last: this servers specific settings files.
if (file_exists(__DIR__ . '/settings.local.php')) {
  include __DIR__ . '/settings.local.php';
}
// Last: This server specific services file.
if (file_exists(__DIR__ . '/services.local.yml')) {
  $settings['container_yamls'][] = __DIR__ . '/services.local.yml';
}
