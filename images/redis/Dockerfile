ARG IMAGE_REPO
ARG ALPINE_VERSION
FROM ${IMAGE_REPO:-lagoobernetes}/commons as commons
FROM redis:5.0-alpine${ALPINE_VERSION}

LABEL maintainer="amazee.io"
ENV LAGOOBERNETES=redis
ENV FLAVOR=ephemeral

ARG LAGOOBERNETES_VERSION
ENV LAGOOBERNETES_VERSION=$LAGOOBERNETES_VERSION

# Copy commons files
COPY --from=commons /lagoobernetes /lagoobernetes
COPY --from=commons /bin/fix-permissions /bin/ep /bin/docker-sleep /bin/
COPY --from=commons /sbin/tini /sbin/
COPY --from=commons /home /home

RUN chmod g+w /etc/passwd \
    && mkdir -p /home

ENV TMPDIR=/tmp \
    TMP=/tmp \
    HOME=/home \
    # When Bash is invoked via `sh` it behaves like the old Bourne Shell and sources a file that is given in `ENV`
    ENV=/home/.bashrc \
    # When Bash is invoked as non-interactive (like `bash -c command`) it sources a file that is given in `BASH_ENV`
    BASH_ENV=/home/.bashrc

COPY conf /etc/redis/
COPY docker-entrypoint /lagoobernetes/entrypoints/70-redis-entrypoint

RUN fix-permissions /etc/redis \
    fix-permissions /data

ENTRYPOINT ["/sbin/tini", "--", "/lagoobernetes/entrypoints.sh"]
CMD ["redis-server", "/etc/redis/redis.conf"]
