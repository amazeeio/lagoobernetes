ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/varnish

COPY drupal.vcl /etc/varnish/default.vcl

RUN fix-permissions /etc/varnish/default.vcl
