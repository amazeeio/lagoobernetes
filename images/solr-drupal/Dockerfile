ARG SOLR_MAJ_MIN_VERSION
ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/solr:${SOLR_MAJ_MIN_VERSION}
ARG SOLR_MAJ_MIN_VERSION

COPY solr${SOLR_MAJ_MIN_VERSION} /solr-conf

RUN precreate-core drupal /solr-conf

CMD ["solr-foreground"]
