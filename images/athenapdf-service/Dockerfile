ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/commons as commons
FROM arachnysdocker/athenapdf-service:2.13.0

LABEL maintainer="amazee.io"
ENV LAGOOBERNETES=athenapdf-service

# Copy commons files
COPY --from=commons /lagoobernetes /lagoobernetes
COPY --from=commons /bin/fix-permissions /bin/ep /bin/docker-sleep /bin/
COPY --from=commons /home /home

RUN chmod g+w /etc/passwd \
    && mkdir -p /home

# Reproduce behavior of Alpine: Run Bash as sh
RUN rm -f /bin/sh && ln -s /bin/bash /bin/sh

ENV TMPDIR=/tmp \
    TMP=/tmp \
    HOME=/home \
    # When Bash is invoked via `sh` it behaves like the old Bourne Shell and sources a file that is given in `ENV`
    ENV=/home/.bashrc \
    # When Bash is invoked as non-interactive (like `bash -c command`) it sources a file that is given in `BASH_ENV`
    BASH_ENV=/home/.bashrc

ENV WEAVER_ATHENA_CMD="athenapdf --no-cache --ignore-certificate-errors -S"
ENV WEAVER_AUTH_KEY=lagoobernetes-athenapdf

COPY entrypoint.sh /athenapdf-service/conf/entrypoint.sh
