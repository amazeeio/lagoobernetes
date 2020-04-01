ARG IMAGE_REPO
FROM ${IMAGE_REPO:-amazeeiolagoobernetes}/nginx
ADD nginx.conf /etc/nginx/conf.d/app.conf
ADD web/ /app/