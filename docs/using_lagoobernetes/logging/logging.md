# Logging

Lagoobernetes provides access to the following logs via Kibana:

* Logs from the OpenShift Routers, including every single HTTP and HTTPS request with:
    * Source IP
    * URL
    * Path
    * HTTP verb
    * Cookies
    * Headers
    * User agent
    * Project
    * Container name
    * Response size
    * Response time
* Logs from containers:
    * `stdout` and `stderr` messages
    * Container name
    * Project
* Lagoobernetes logs:
    * Webhooks parsing
    * Build logs
    * Build errors
    * Any other Lagoobernetes related logs
* Application logs:
    * Any logs sent by the running application
    * For Drupal: install the [Lagoobernetes Logs](https://www.drupal.org/project/lagoobernetes_logs) module in order to receive logs from Drupal Watchdog.

To access the logs, please check with your Lagoobernetes administrator to get the URL for the Kibana route \(for amazee.io this is [https://logs-db-ui-lagoobernetes-master.ch.amazee.io/](https://logs-db-ui-lagoobernetes-master.ch.amazee.io/)\).

Each Lagoobernetes account has their own login and will see the logs only for the projects to which they have access.

Each account also has their own **Kibana Tenant**, which means no saved searches or visualizations are shared with another account.

If you would like to know more about how to use Kibana: [https://www.elastic.co/webinars/getting-started-kibana](https://www.elastic.co/webinars/getting-started-kibana).

