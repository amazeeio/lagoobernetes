#!/bin/sh

cp /usr/local/etc/php/conf.d/00-lagoobernetes-php.ini.tpl /usr/local/etc/php/conf.d/00-lagoobernetes-php.ini && ep /usr/local/etc/php/conf.d/00-lagoobernetes-php.ini
ep /usr/local/etc/php-fpm.conf
ep /usr/local/etc/php-fpm.d/*