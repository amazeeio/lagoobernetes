# Service Types

This table lists all service types that can be defined via `lagoobernetes.type` within a [`docker-compose.yml` file](docker-compose_yml.md).

💡 _Tip: Scroll right to see the whole table!_

| Type | Description | Healthcheck | Exposed Ports | Auto generated routes | Additional customization parameters |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cli` | Use for any kind of CLI container \(like PHP, Node.js, etc.\). Automatically gets the customer SSH private key that is mounted in `/var/run/secrets/lagoobernetes/sshkey/ssh-privatekey`. | - | - | - |  |
| `cli-persistent` | Like `cli`, expects `lagoobernetes.persistent.name` to be given the name of a service that has persistent storage, which will be mounted under defined `lagoobernetes.persistent` label. Does NOT generate its own persistent storage, only used to mount another service's persistent storage. | - | - | `lagoobernetes.persistent.name`, `lagoobernetes.persistent` |  |
| `custom` | Full custom definition, see [documentation](docker-compose_yml.md#custom-type) | - | - | - | - |
| `elasticsearch` | Elasticsearch container, will auto-generate persistent storage under `/usr/share/elasticsearch/data`. | HTTP on `localhost:9200/_cluster/health?local=true` | `9200` | - | `lagoobernetes.persistent.size` |
| `elasticsearch-cluster` | Elasticsearch cluster with 3 nodes, uses `Statefulset`, will auto-generate persistent storage for each cluster node under `/usr/share/elasticsearch/data`. | HTTP on `localhost:9200/_cluster/health?local=true` | `9200`, `9300` | - | - |
| `kibana` | Kibana container. | TCP connection on `5601` | `5601` | yes | - |
| `logstash` | Logstash container. | TCP connection on `9600` | `9600` | - | - |
| `mariadb` | A meta-service which will tell Lagoobernetes to automatically decide between `mariadb-single` and `mariadb-shared`. | - | - | - | - |
| `mariadb-galera` | MariaDB Galera Cluster with 3 nodes, uses `Statefulset`. Generates persistent storage for each cluster node. Creates cron job for backups running every 24h executing `/lagoobernetes/mysql-backup.sh 127.0.0.1`. Starts additional `maxscale` container where the service points to \(no direct connection to Galera nodes\). | TCP connection on `3306` | `3306` | - | `lagoobernetes.persistent.size` |
| `mariadb-shared` | Uses a shared MariaDB server via a MariaDB service broker. | Not Needed | `3306` | - | - |
| `mariadb-single` | MariaDB container. Creates cron job for backups running every 24h executing `/lagoobernetes/mysql-backup.sh 127.0.0.1`. | TCP connection on `3306` | `3306` | - | `lagoobernetes.persistent.size` |
| `mongo` | MongoDB container, will generate persistent storage of min 1GB mounted at `/data/db`. | TCP connection on `27017` | `27017` | - | - |
| `mongo-shared` | Uses a shared MongoDB server via a service broker. | Not Needed | `27017` | - | - |
| `nginx` | Nginx container. No persistent storage. | `localhost:50000/nginx_status` | `8080` | yes | - |
| `nginx-php` | Like `nginx`, but additionally a `php` container. | Nginx: `localhost:50000/nginx_status`, PHP: `/usr/sbin/check_fcgi` | `8080` | yes | - |
| `nginx-php-persistent` | Like `nginx-php.` Will generate persistent storage, defines mount location via `lagoobernetes.persistent`. | Nginx: `localhost:50000/nginx_status`, PHP: `/usr/sbin/check_fcgi` | http on `8080` | yes | `lagoobernetes.persistent`, `lagoobernetes.persistent.name`, `lagoobernetes.persistent.size`, `lagoobernetes.persistent.class` |
| `node` | Node.js container. | TCP connection on `3000` | `3000` | yes | - |
| `node-persistent` | Like `node`. Will generate persistent storage, defines mount location via `lagoobernetes.persistent`. | TCP connection on `3000` | `3000` | yes | `lagoobernetes.persistent`, `lagoobernetes.persistent.name`, `lagoobernetes.persistent.size`, `lagoobernetes.persistent.class` |
| `none` | Instructs Lagoobernetes to completely ignore this service. | - | - | - | - |
| `postgres` | Postgres container. Creates cron job for backups running every 24h executing `/lagoobernetes/postgres-backup.sh localhost` | TCP connection on `5432` | `5432` | - | `lagoobernetes.persistent.size` |
| `python-ckandatapusher` | Python CKAN DataPusher container. | TCP connection on `8800` | `8800` | yes | - |
| `redis` | Redis container. | TCP connection on `6379` | `6379` | - | - |
| `solr` | Solr container with auto-generated persistent storage mounted under `/opt/solr/server/solr/mycores`. | TCP connection on `8983` | `8983` | - | - |
| `varnish` | Varnish container. | HTTP request `localhost:8080/varnish_status` | `8080` | yes | - |

