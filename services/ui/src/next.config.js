const webpackShared = require('./webpack.shared-config');
require('dotenv-extended').load();

const withCSS = require('@zeit/next-css')

const lagoobernetesRoutes =
  (process.env.LAGOOBERNETES_ROUTES && process.env.LAGOOBERNETES_ROUTES.split(',')) || [];

const lagoobernetesApiRoute = lagoobernetesRoutes.find(route => route.includes('api-'));
const envApiRoute = process.env.GRAPHQL_API;

const lagoobernetesKeycloakRoute = lagoobernetesRoutes.find(routes =>
  routes.includes('keycloak-')
);
const envKeycloakRoute = process.env.KEYCLOAK_API;

const taskBlacklist =
  (process.env.LAGOOBERNETES_UI_TASK_BLACKLIST &&
    process.env.LAGOOBERNETES_UI_TASK_BLACKLIST.split(',')) ||
  [];

module.exports = withCSS({
  publicRuntimeConfig: {
    GRAPHQL_API: lagoobernetesApiRoute ? `${lagoobernetesApiRoute}/graphql` : envApiRoute,
    GRAPHQL_API_TOKEN: process.env.GRAPHQL_API_TOKEN,
    KEYCLOAK_API: lagoobernetesKeycloakRoute
      ? `${lagoobernetesKeycloakRoute}/auth`
      : envKeycloakRoute,
    LAGOOBERNETES_UI_ICON: process.env.LAGOOBERNETES_UI_ICON,
    LAGOOBERNETES_UI_TASK_BLACKLIST: taskBlacklist
  },
  distDir: '../build',
  webpack(config, options) {
    // Add aliases from shared config file.
    Object.keys(webpackShared.alias).forEach(name => config.resolve.alias[name] = webpackShared.alias[name]);

    const originalEntry = config.entry;
    config.entry = async () => {
      const entries = await originalEntry();

      if (
        entries['main.js'] &&
        !entries['main.js'].includes('./lib/polyfills.js')
      ) {
        entries['main.js'].unshift('./lib/polyfills.js');
      }

      return entries;
    };

    // Debug config.
    // console.dir(config, { depth: null });

    return config;
  }
});
