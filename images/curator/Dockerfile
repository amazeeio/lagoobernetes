ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/commons as commons
FROM bobrik/curator:5.7.6

USER root

LABEL maintainer="amazee.io"
ENV LAGOOBERNETES=curator

ARG LAGOOBERNETES_VERSION
ENV LAGOOBERNETES_VERSION=$LAGOOBERNETES_VERSION

# Copy commons files
COPY --from=commons /lagoobernetes /lagoobernetes
COPY --from=commons /bin/fix-permissions /bin/ep /bin/docker-sleep /bin/
COPY --from=commons /home /home

RUN apk add --no-cache tini \
    && chmod g+w /etc/passwd \
    && mkdir -p /home

ENV TMPDIR=/tmp \
    TMP=/tmp \
    HOME=/home \
    # When Bash is invoked via `sh` it behaves like the old Bourne Shell and sources a file that is given in `ENV`
    ENV=/home/.bashrc \
    # When Bash is invoked as non-interactive (like `bash -c command`) it sources a file that is given in `BASH_ENV`
    BASH_ENV=/home/.bashrc

RUN mkdir -p /curator

WORKDIR /curator

ENTRYPOINT ["/sbin/tini", "--", "/lagoobernetes/entrypoints.sh"]

CMD ["/bin/docker-sleep"]
