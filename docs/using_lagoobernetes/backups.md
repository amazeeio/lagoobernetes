# Backups
Lagoobernetes differentiates between three backup categories: short-, mid- and
long-term Backups.

## Short-Term Backups

These backups are provided by Lagoobernetes itself, and are implemented for databases **only**. Lagoobernetes will automatically instruct the `MariaDB` and `Postgres` [services types](service_types.md) to set up a cron job which creates backups once a day \(see example [backup script](https://github.com/amazeeio/lagoobernetes/blob/master/images/mariadb/mysql-backup.sh) for MariaDB\). These backups are kept for four days and automatically cleaned up after that.

These backups are accessible for developers directly by connecting via the [remote shell](remote_shell.md) to the corresponding container \(like `mariadb`\) and checking the [folder](https://github.com/amazeeio/lagoobernetes/blob/master/images/mariadb/mysql-backup.sh#L24) where the backups are stored\). They can then be downloaded, extracted, or used in any other way.

## Mid-Term Backups

Mid-term backups are not automatically provided by Lagoobernetes and depend heavily on the underlying infrastructure where Kubernetes and OpenShift are running. Check with your Lagoobernetes administrator what backups are created on your infrastructure.

**For amazee.io infrastructure**: All persistent storage and Docker images are backed up daily for a week, and weekly for a month. If you need access to such a backup, check with the support team, they will help you.

## Long-Term Backups

Long-term backups refer to backups that are kept for multiple months and years. [AWS Glacier](https://aws.amazon.com/glacier/) is often used to store these backups. These types of backups also depend heavily on the underlying infrastructure. Check with your Lagoobernetes administrator to find out what backups are created on your infrastructure.

