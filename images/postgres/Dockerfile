ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/commons as commons
# alpine 3.11 from https://github.com/docker-library/postgres/blob/master/11/alpine/Dockerfile
FROM postgres:11.6-alpine

ARG LAGOOBERNETES_VERSION
ENV LAGOOBERNETES_VERSION=$LAGOOBERNETES_VERSION

# Copy commons files
COPY --from=commons /lagoobernetes /lagoobernetes
COPY --from=commons /bin/fix-permissions /bin/ep /bin/docker-sleep /bin/
COPY --from=commons /sbin/tini /sbin/
COPY --from=commons /home /home

ENV TMPDIR=/tmp \
    TMP=/tmp \
    HOME=/home \
    # When Bash is invoked via `sh` it behaves like the old Bourne Shell and sources a file that is given in `ENV`
    ENV=/home/.bashrc \
    # When Bash is invoked as non-interactive (like `bash -c command`) it sources a file that is given in `BASH_ENV`
    BASH_ENV=/home/.bashrc

RUN chmod g+w /etc/passwd \
    && mkdir -p /home

ENV LAGOOBERNETES=postgres

COPY postgres-backup.sh /lagoobernetes/

RUN echo -e "local all all md5\nhost  all  all 0.0.0.0/0 md5" >> /usr/local/share/postgresql/pg_hba.conf

ENV PGUSER=postgres \
    POSTGRES_PASSWORD=lagoobernetes \
    POSTGRES_USER=lagoobernetes \
    POSTGRES_DB=lagoobernetes \
    PGDATA=/var/lib/postgresql/data/pgdata

# Postgresql entrypoint file needs bash, so start the entrypoints with bash
ENTRYPOINT ["/sbin/tini", "--", "/lagoobernetes/entrypoints.bash"]
CMD ["/usr/local/bin/docker-entrypoint.sh", "postgres"]