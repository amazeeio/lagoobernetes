ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/commons as commons


FROM alpine:3.7 as vmod
ENV LIBVMOD_DYNAMIC_VERSION=5.2
ENV LIBVMOD_BODYACCESS_VERSION=5.0
RUN apk --no-cache add varnish varnish-dev automake autoconf libtool python py-docutils make

RUN cd /tmp && wget https://github.com/nigoroll/libvmod-dynamic/archive/${LIBVMOD_DYNAMIC_VERSION}.zip && \
  unzip ${LIBVMOD_DYNAMIC_VERSION}.zip && cd libvmod-dynamic-${LIBVMOD_DYNAMIC_VERSION} && \
  ./autogen.sh && ./configure && make && make install

RUN cd /tmp && wget https://github.com/aondio/libvmod-bodyaccess/archive/${LIBVMOD_BODYACCESS_VERSION}.zip && \
  unzip ${LIBVMOD_BODYACCESS_VERSION}.zip && cd libvmod-bodyaccess-${LIBVMOD_BODYACCESS_VERSION} && \
  ./autogen.sh && ./configure && make && make install

FROM alpine:3.7
LABEL maintainer="amazee.io"
ENV LAGOOBERNETES=varnish

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

RUN apk --no-cache add varnish

# Add varnish mod after the varnish package creates the directory.
COPY --from=vmod /usr/lib/varnish/vmods/libvmod_dynamic.* /usr/lib/varnish/vmods/
COPY --from=vmod /usr/lib/varnish/vmods/libvmod_bodyaccess.* /usr/lib/varnish/vmods/

RUN echo "${VARNISH_SECRET:-lagoobernetes_default_secret}" >> /etc/varnish/secret

COPY default.vcl /etc/varnish/default.vcl
COPY varnish-start.sh /varnish-start.sh

RUN fix-permissions /etc/varnish/ \
    && fix-permissions /var/run/ \
    && fix-permissions /var/lib/varnish

COPY docker-entrypoint /lagoobernetes/entrypoints/70-varnish-entrypoint

EXPOSE 8080

# tells the local development environment on which port we are running
ENV LAGOOBERNETES_LOCALDEV_HTTP_PORT=8080

ENV HTTP_RESP_HDR_LEN=8k \
    HTTP_RESP_SIZE=32k \
    NUKE_LIMIT=150 \
    CACHE_TYPE=malloc \
    CACHE_SIZE=500M \
    LISTEN=":8080" \
    MANAGEMENT_LISTEN=":6082"

ENTRYPOINT ["/sbin/tini", "--", "/lagoobernetes/entrypoints.sh"]
CMD ["/varnish-start.sh"]
