# OpenShift Requirements
Lagoobernetes tries to run on as standard installation of OpenShift as possible, but it expects some things.

## OpenShift Version

Currently Lagoobernetes is tested and supported with OpenShift 3.11.

## Permissions

In order to set up Lagoobernetes in an OpenShift, you need a cluster-admin account to run the initial setup via `make lagoobernetes-kickstart`. With this, Lagoobernetes will create its own roles and permissions and the cluster-admin is not needed anymore.

## PV StorageClasses

For deployment projects by Lagoobernetes the following StorageClasses will be needed:

| Name        |Used for                             |Description |
| :---        |:---                                 |:--- |
| default     | Single pod mounts \(MariaDB, Solr\) | The default StorageClass will be used for any single pod mounts like MariaDB, Solr, etc. We suggest using SSD-based storage. |
| `bulk`      | Multi-pod mounts \(Drupal files\)   | `bulk` StorageClass will be used whenever a project requests storage that needs to be mounted into multiple pods at the same time. Like `nginx-php-persistent`, which will mount the same PVC in all `nginx-php` pods. We suggest putting these on SSD, but it's not required. |

Lagoobernetes itself will create PVCs with the following StorageClasses:

| Name                      | Used for          | Description |
| :---                      | :---              | :--- |
| `lagoobernetes-elasticsearch`    | `logs-db`         | `logs-db` will create PVCs with the StorageClass name `lagoobernetes-elasticsearch` for persistent storage of Elasticsearch. Standard deployments of `logs-db` create an Elasticsearch cluster with 3 `live` nodes. Strongly reccomend putting these on SSD. |
| `lagoobernetes-logs-db-archive`  | `logs-db`         | Beside the `live` nodes, `logs-db` also creates 3 `archive` nodes. These are used for Elasticsearch data which is older than 1 month. Therefore it should be much bigger than `lagoobernetes-elasticsearch`.  Can run on regular HDD. |
| `lagoobernetes-logs-forwarder`   | `logs-forwarder`  | Used by `logs-forwarder` fluentd to provide a persistent buffer. Default configurations of Lagoobernetes create 3 `logs-forwarder` pods. We prefer to put these on SSD, but it's not needed. |

