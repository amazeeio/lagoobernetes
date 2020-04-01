ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/oc

ENV LAGOOBERNETES=storage-calculator

RUN apk add --no-cache tini jq openssl bash curl nodejs nodejs-npm \
    && npm config set unsafe-perm true \
    && npm -g install jwtgen

COPY create_jwt.sh calculate-storage.sh /

ENV JWTSECRET=super-secret-string \
    JWTAUDIENCE=api.dev \
    PROJECT_REGEX=".+"

ENTRYPOINT ["/sbin/tini", "--", "/lagoobernetes/entrypoints.sh"]
CMD ["/bin/docker-sleep"]
