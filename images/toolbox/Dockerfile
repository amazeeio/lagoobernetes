ARG IMAGE_REPO

FROM ${IMAGE_REPO:-lagoobernetes}/mariadb as mariadb

FROM ${IMAGE_REPO:-lagoobernetes}/commons as commons

LABEL maintainer="amazee.io"

RUN apk update \
    && apk upgrade \
    && apk add --no-cache curl ncdu socat ca-certificates openssl perl perl-doc mysql-client rsync mariadb-mytop \
    && update-ca-certificates \
    && rm -rf /var/cache/apk/* \
    && wget https://raw.githubusercontent.com/major/MySQLTuner-perl/master/mysqltuner.pl -O mysqltuner.pl \
    && chmod +x mysqltuner.pl

COPY --from=mariadb /usr/bin/my_print_defaults /usr/bin/my_print_defaults
