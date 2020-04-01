# MongoDB

> _MongoDB is a general purpose, document-based, distributed database built for modern application developers and for the cloud era. MongoDB is a document database, which means it stores data in JSON-like documents._
>
> \- from [mongodb.com](https://www.mongodb.com/)

[Lagoobernetes `MongoDB` image Dockerfile](https://github.com/amazeeio/lagoobernetes/blob/master/images/mongo/Dockerfile). Based on the official package `mongodb` provided by the `alpine:3.8` image.

This Dockerfile is intended to be used to set up a standalone MongoDB database server.

## Lagoobernetes & OpenShift adaptions

This image is prepared to be used on Lagoobernetes, which leverages OpenShift. There are therefore some things already done:

* Folder permissions are automatically adapted with [`fix-permissions`](https://github.com/sclorg/s2i-base-container/blob/master/core/root/usr/bin/fix-permissions), so this image will work with a random user, and therefore also on OpenShift.

