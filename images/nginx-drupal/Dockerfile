ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/nginx

LABEL maintainer="amazee.io"
ENV LAGOOBERNETES=nginx

RUN mkdir -p /etc/nginx/conf.d/drupal

COPY drupal /etc/nginx/conf.d/drupal/
COPY drupal.conf /etc/nginx/conf.d/app.conf

RUN fix-permissions /etc/nginx
