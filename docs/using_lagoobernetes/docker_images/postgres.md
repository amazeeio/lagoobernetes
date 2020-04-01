# Postgres

The [Lagoobernetes Postgres Docker image](https://github.com/amazeeio/lagoobernetes/blob/master/images/postgres/Dockerfile). Based on [the official Postgres Alpine images](https://hub.docker.com/_/postgres).

## Supported versions

* 11.x [\[Dockerfile\]](https://github.com/amazeeio/lagoobernetes/blob/master/images/postgres/Dockerfile)

## Tips & Tricks

If you have SQL statements that need to be run immediately after container startup to initialize the database, you can place those `.sql` files in the container's `docker-entrypoint-initdb.d` directory. Any `.sql` files contained in that directory are run automatically at startup, as part of bringing the Postgres container up.

!!!hint
    Take note that these scripts are only run if the container is started with an empty database.


