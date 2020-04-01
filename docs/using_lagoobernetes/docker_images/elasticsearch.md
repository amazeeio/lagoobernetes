# Elasticsearch

> [_Elasticsearch_](https://www.elastic.co/) _is a distributed, open source search and analytics engine for all types of data, including textual, numerical, geospatial, structured, and unstructured._
>
> \- from [https://www.elastic.co/](https://www.elastic.co/)

## Supported versions

* 6.8.2 [\[Dockerfile\]](https://github.com/amazeeio/lagoobernetes/blob/master/images/elasticsearch/Dockerfile6)
* 7.1.1 [\[Dockerfile\]](https://github.com/amazeeio/lagoobernetes/blob/master/images/elasticsearch/Dockerfile7.1)
* 7.3.0 [\[Dockerfile\]](https://github.com/amazeeio/lagoobernetes/blob/master/images/elasticsearch/Dockerfile7)

## Known issues

On Linux-based systems, the start of the Elasticsearch container may fail due to a low `vm.max_map_count` setting.

```bash
elasticsearch_1  | ERROR: [1] bootstrap checks failed
elasticsearch_1  | [1]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]
```

[Solution to this issue can be found here](https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html#_set_vm_max_map_count_to_at_least_262144).

