# MariaDB-Drupal

MariaDB is the open source successor to MySQL.

The [Lagoobernetes `mariadb-drupal` Docker image](https://github.com/amazeeio/lagoobernetes/blob/master/images/mariadb-drupal/Dockerfile) is a customized [`mariadb` image](./) to use within Drupal projects in Lagoobernetes. It differs from the `mariadb` image only for initial database setup, made by some environment variables:

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `MARIADB_DATABASE` | drupal | Drupal database created at startup. |
| `MARIADB_USER` | drupal | Default user created at startup. |
| `MARIADB_PASSWORD` | drupal | Password of default user created at startup. |

If the `LAGOOBERNETES_ENVIRONMENT_TYPE` variable is set to `production`, performances are set accordingly by using `MARIADB_INNODB_BUFFER_POOL_SIZE=1024` and `MARIADB_INNODB_LOG_FILE_SIZE=256`.

