// @flow
const got = require('got');
const R = require('ramda');

const { HARBOR_ADMIN_PASSWORD } = process.env;

const lagoobernetesHarborRoute = R.compose(
  R.defaultTo('http://172.17.0.1:8084'),
  R.find(R.test(/harbor-nginx/)),
  R.split(','),
  R.propOr('', 'LAGOOBERNETES_ROUTES'),
)(process.env);

const harborClient = got.extend({
  baseUrl: `${lagoobernetesHarborRoute}/api/`,
  json: true,
  auth: `admin:${HARBOR_ADMIN_PASSWORD || 'admin'}`,
});

module.exports = harborClient;