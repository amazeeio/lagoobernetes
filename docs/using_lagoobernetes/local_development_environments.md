# Local Development Environments

Even though Lagoobernetes has only a hard dependency on Docker and [Docker Compose](https://docs.docker.com/compose/) \(which is mostly shipped with Docker\) there are some things which are nice for local development that are not included in Docker:

* A HTTP reverse proxy for nice URLs and HTTPS offloading.
* A DNS system so we don't have to remember IP addresses.
* SSH agents to use SSH keys within containers.
* A system that receives and displays mail locally.

!!!important
    You do not need to _install_ Lagoobernetes locally in order to _use_ it locally! That sounds confusing, but follow the documentation. Lagoobernetes is the system that **deploys** your local development environment to your production environment, it's **not** the environment itself.


Lagoobernetes currently works best with `pygmy` , which is the amazee.io flavored system of the above tools and works out of the box with Lagoobernetes.

`pygmy` is a [Ruby](https://www.ruby-lang.org/en/) gem, so to install it, run: `gem install pygmy`.

For detailed usage info on `pygmy`, see the [documentation of pygmy](https://pygmy.readthedocs.io/)

We are evaluating adding support for other systems like [Lando](https://lando.dev/), [Docksal](https://docksal.io/), [DDEV](https://www.ddev.com/ddev-local/), and [Docker4Drupal](https://wodby.com/docs/stacks/drupal/local/), and will possibly add full support for these in the future. If you do have Lagoobernetes running with a system like these, we would love for you to submit a [PR on GitHub](https://github.com/amazeeio/pygmy)!

