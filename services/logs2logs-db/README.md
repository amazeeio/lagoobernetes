# lagoobernetes-logstash

This is a logstash used within the amazee.io lagoobernetes deployment system.

It connects to rabbitmq and creates a new `lagoobernetes-logs:logstash` queue and binds it to the `lagoobernetes-logs` exchange. Every message will be forwarded to Elasticsearch.