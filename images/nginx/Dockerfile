ARG IMAGE_REPO
FROM ${IMAGE_REPO:-lagoobernetes}/commons as commons
# alpine 3.11 per https://github.com/openresty/docker-openresty/blob/master/alpine/Dockerfile
FROM openresty/openresty:1.15.8.2-alpine

LABEL maintainer="amazee.io"
ENV LAGOOBERNETES=nginx

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

RUN apk add --no-cache openssl

RUN rm -Rf /etc/nginx && ln -s /usr/local/openresty/nginx/conf /etc/nginx

COPY nginx.conf /etc/nginx/nginx.conf
COPY fastcgi.conf /etc/nginx/fastcgi.conf
COPY fastcgi.conf /etc/nginx/fastcgi_params
COPY helpers/ /etc/nginx/helpers/
COPY static-files.conf /etc/nginx/conf.d/app.conf
COPY redirects-map.conf /etc/nginx/redirects-map.conf

RUN mkdir -p /app \
    && rm -f /etc/nginx/conf.d/default.conf \
    && fix-permissions /usr/local/openresty/nginx \
    && fix-permissions /var/run/

COPY docker-entrypoint /lagoobernetes/entrypoints/70-nginx-entrypoint

WORKDIR /app

EXPOSE 8080

# tells the local development environment on which port we are running
ENV LAGOOBERNETES_LOCALDEV_HTTP_PORT=8080

ENTRYPOINT ["/sbin/tini", "--", "/lagoobernetes/entrypoints.sh"]
CMD ["nginx", "-g", "daemon off;"]
