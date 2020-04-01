# Lagoobernetes Remote

## Design flowchart
https://docs.google.com/drawings/d/1kMCJn3R2sUtiNYraG9mNce-Od8n_6oq-asoR6ISHn_8/edit

## Details

There are multiple portions to this repo;

### collector

The collector is a fluentd instance configured for `secure_forward` on for
both input and output. The `secure_forward` plugin is configured insecurely
between itself and the DaemonSet nodes. Across openshift clusters,
it is configured with a CA Certificate and requires additional manual
configuration.



### logstash

#### haproxy

  1. create router-logs service
  ~~~~
  oc apply -n lagoobernetes -f supplemental/lagoobernetes-svc-router-logs.yml
  ~~~~

  2. The openshift haproxy needs to be configured to forward to logstash.
  Update `ROUTER_SYSLOG_ADDRESS` to `router-logs.lagoobernetes.svc:5140`.
  ~~~~
  oc -n default edit dc/router
  ~~~~

Also update the template with #xxx



Additionally, `DESTINATION` needs to be set in in the `lagoobernetes-env`
configmap for the deployed project.  In production, this will be
https://logs2logs-lagoobernetes-master.ch.amazee.io .
~~~~
oc -n lagoobernetes-remote-us edit configmap/lagoobernetes-env
~~~~

~~~~
lagoobernetes project

apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  name: router-logs
spec:
  externalName: logstash.lagoobernetes-remote-us-master.svc.cluster.local
  sessionAffinity: None
  type: ExternalName
~~~~

~~~~
oc -n default patch deploymentconfig/router \
-p  '{"spec":{"template":{"spec":{"containers":{"env": {"name":"blah", "value":"Baz"}}}}}}''
~~~~
