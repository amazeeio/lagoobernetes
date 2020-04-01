ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/curator

COPY actions.yml curator.yml /curator/
COPY 90-generate-http-auth.sh /lagoobernetes/entrypoints/

RUN echo "source /lagoobernetes/entrypoints/90-generate-http-auth.sh" >> /home/.bashrc

ENV LAGOOBERNETES_INDEXES="^(container-logs-|router-logs-|service-logs-|application-logs-|lagoobernetes-logs-).*$" \
    ELASTICSEARCH_HOST=logs-db-service \
    ELASTICSEARCH_HOST_PORT=9200
