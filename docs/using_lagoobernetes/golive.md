# Going Live

Congratulations, you're _this_ close to going live with your website on Lagoobernetes! In order to make this as seamless as possible, we've got this final checklist for you. It leads you through the last few things you should check before taking your site live.

## Check your `.lagoobernetes.yml`

### Routes / SSL

Check to be sure that all routes have been set up in your `.lagoobernetes.yml`. Be aware that if you don't point the domains towards Lagoobernetes, you should disable Let's Encrypt \(LE\) certificate creation, as it will lead to issues. Domains not pointing towards Lagoobernetes will be disabled after a while in order to not exceed the Let's Encrypt quotas.

If you use Certificate Authority \(CA\) signed certificates you can set `tls-acme` to `false` , but leave the `insecure` flag set to `Allow` or `Redirect`. In the case of CA certificates, let your Lagoobernetes administrator know the routes and the SSL certificate that needs to be put in place.

```
environments:
  master:
    routes:
      - nginx:
        - example.com:
            tls-acme: 'false'
            insecure: Allow
        - www.example.com:
            tls-acme: 'false'
            insecure: Allow
```

As soon as the DNS entries point towards your Lagoobernetes installation, you can switch the flags: `tls-acme` to `true` and `insecure` to `Redirect`

```
environments:
  master:
    routes:
      - nginx:
        - example.com:
            tls-acme: 'true'
            insecure: Redirect
        - www.example.com:
            tls-acme: 'true'
            insecure: Redirect
```


!!!hint
    As checking every page of your website might be a bit a tedious job, you can make use of [mixed-content-scan](https://github.com/bramus/mixed-content-scan). This will crawl the entire site and give you back pages that include assets from a non-HTTPS site.

### Redirects

If you need non-www to www redirects, make sure you have them set up in the `redirects-map.conf` - [see Documentation](docker_images/nginx.md#redirects-mapconf).

### Cron jobs.

Check if your cron jobs have been set up for your production environment - see [`.lagoobernetes.yml`](lagoobernetes_yml.md).

## DNS

To make it as easy as possible for you to get your site pointing to our servers, we have dedicated load-balancer DNS records. Those technical DNS resource records are used just for getting your site linked to the amazee.io infrastructure and serve no other purpose. If you are in doubt of the CNAME record, ask your Lagoobernetes administrator about the exact CNAME you need to set up.

**Example on amazee.io :** `<region-identifier>.amazee.io`

Before you switch over your domain to Lagoobernetes, make sure you lower the Time-to-Live \(TTL\) before you go live. This will ensure that the switch from the old to the new servers will go quickly. We usually advise a TTL of 300-600 seconds prior to the DNS switch. [More information about TTL](https://en.wikipedia.org/wiki/Time_to_live#DNS_records).

!!!hint
    We do not suggest configuring any static IP addresses in your DNS zones. The Lagoobernetes load balancer infrastructure may change over time which can have impact on your site availability if you configure a static IP address.

### Root Domains

Configuring the root domain \(e.g. example.com\) can be a bit tricky because the DNS specification does not allow the root domain to point to a CNAME entry. Depending on your DNS provider, the record name is different:

* ALIAS at [DNSimple](https://dnsimple.com/)
* ANAME at [DNS Made Easy](http://www.dnsmadeeasy.com/)
* ANAME at [easyDNS](https://www.easydns.com/)
* ALIAS at [PointDNS](https://pointhq.com/)
* CNAME at [CloudFlare](https://www.cloudflare.com/)
* CNAME at [NS1](http://ns1.com)

If your DNS provider needs an IP address for the root domain, get in touch with your Lagoobernetes administrator to give you the load balancer IP addresses.

## Production environment

Lagoobernetes understands the concept of development and production environments. Development environments automatically send `noindex` and `nofollow` headers in order to prohibit indexing by search engines.

`X-Robots-Tag: noindex, nofollow`

During project setup, the production environment should already be defined. If that's omitted, your environment will run in development mode. You can check if the environment is set as production environment in the Lagoobernetes user interface. If the production environment is not set, let your Lagoobernetes administrator know, and they will configure the system accordingly.

![The production environment is labelled in green on the left. ](/images/lagoobernetes-ui-production.png)

