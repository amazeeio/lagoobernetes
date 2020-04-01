// @flow

/* ::
import type MariaSQL from 'mariasql';
*/

const harborClient = require('../../clients/harborClient');
const logger = require('../../logger');
const R = require('ramda');
const Sql = require('../env-variables/sql');
const { isPatchEmpty, prepare, query, whereAnd } = require('../../util/db');

const lagoobernetesHarborRoute = R.compose(
  R.defaultTo('http://172.17.0.1:8084'),
  R.find(R.test(/harbor-nginx/)),
  R.split(','),
  R.propOr('', 'LAGOOBERNETES_ROUTES'),
)(process.env);

const createHarborOperations = (sqlClient /* : MariaSQL */) => ({
  addProject: async (lagoobernetesProjectName, projectID) => {
    // Create harbor project
    try {
      var res = await harborClient.post(`projects`, {
        body: {
          count_limit: -1,
          project_name: lagoobernetesProjectName,
          storage_limit: -1,
          metadata: {
            auto_scan: "true",
            reuse_sys_cve_whitelist: "true",
            public: "false"
          }
        }
      });
      logger.debug(`Harbor project ${lagoobernetesProjectName} created!`)
    } catch (err) {
      // 409 means project already exists
      // 201 means project created successfully
      if (err.statusCode == 409) {
        logger.info(`Unable to create the harbor project "${lagoobernetesProjectName}", as it already exists in harbor!`)
      } else {
        console.log(res)
        logger.error(`Unable to create the harbor project "${lagoobernetesProjectName}", error: ${err}`)
      }
    }

    // Get new harbor project's id
    try {
      const res = await harborClient.get(`projects?name=${lagoobernetesProjectName}`)
      var harborProjectID = res.body[0].project_id
      logger.debug(`Got the harbor project id for project ${lagoobernetesProjectName} successfully!`)
    } catch (err) {
      if (err.statusCode == 404) {
        logger.error(`Unable to get the harbor project id of "${lagoobernetesProjectName}", as it does not exist in harbor!`)
      } else {
        logger.error(`Unable to get the harbor project id of "${lagoobernetesProjectName}" !!`)
      }
    }

    logger.debug(`Harbor project id for ${lagoobernetesProjectName}: ${harborProjectID}`)
    // Create robot account for new harbor project
    try {
      const res = await harborClient.post(`projects/${harborProjectID}/robots`, {
        body: {
          name: lagoobernetesProjectName,
          access: [
            {
              resource: `/project/${harborProjectID}/repository`,
              action: "push"
            }
          ]
        }
      })
      var harborTokenInfo = res.body
      logger.debug(`Robot was created for Harbor project ${lagoobernetesProjectName} !`)
    } catch (err) {
      // 409 means project already exists
      // 201 means project created successfully
      if (err.statusCode == 409) {
        logger.warn(`Unable to create a robot account for harbor project "${lagoobernetesProjectName}", as a robot account of the same name already exists!`)
      } else {
        logger.warn(`Unable to create a robot account for harbor project "${lagoobernetesProjectName}" !!`)
      }
    }

    // Set Harbor env vars for lagoobernetes environment
    try {
      await query(
        sqlClient,
        Sql.insertEnvVariable({
          "name": "INTERNAL_REGISTRY_URL",
          "value": lagoobernetesHarborRoute,
          "scope": "INTERNAL_CONTAINER_REGISTRY",
          "project": projectID,
        }),
      );
      logger.debug(`Environment variable INTERNAL_REGISTRY_URL for ${lagoobernetesProjectName} created!`)

      await query(
        sqlClient,
        Sql.insertEnvVariable({
          "name": "INTERNAL_REGISTRY_USERNAME",
          "value": harborTokenInfo.name,
          "scope": "INTERNAL_CONTAINER_REGISTRY",
          "project": projectID,
        }),
      );
      logger.debug(`Environment variable INTERNAL_REGISTRY_USERNAME for ${lagoobernetesProjectName} created!`)

      await query(
        sqlClient,
        Sql.insertEnvVariable({
          "name": "INTERNAL_REGISTRY_PASSWORD",
          "value": harborTokenInfo.token,
          "scope": "INTERNAL_CONTAINER_REGISTRY",
          "project": projectID,
        }),
      );
      logger.debug(`Environment variable INTERNAL_REGISTRY_PASSWORD for ${lagoobernetesProjectName} created!`)
    } catch (err) {
      logger.error(`Error while setting up harbor environment variables for ${lagoobernetesProjectName}, error: ${err}`)
    }
  }
})

module.exports = createHarborOperations;
