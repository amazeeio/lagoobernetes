ARG LAGOOBERNETES_GIT_BRANCH
ARG IMAGE_REPO
# STAGE 1: Loading Image lagoobernetes-node-packages-builder which contains node packages shared by all Node Services
FROM ${IMAGE_REPO:-amazeeiolagoobernetes}/yarn-workspace-builder:${LAGOOBERNETES_GIT_BRANCH:-latest} as yarn-workspace-builder

# STAGE 2: specific service Image
FROM ${IMAGE_REPO:-amazeeiolagoobernetes}/node:10

# Copying generated node_modules from the first stage
COPY --from=yarn-workspace-builder /app /app

# Setting the workdir to the service, all following commands will run from here
WORKDIR /app/services/openshiftbuilddeploymonitor/

# Copying the .env.defaults into the Workdir, as the dotenv system searches within the workdir for it
COPY --from=yarn-workspace-builder /app/.env.defaults .

# Copying files from our service
COPY . .

# Verify that all dependencies have been installed via the yarn-workspace-builder
RUN yarn check --verify-tree

# Making sure we run in production
ENV NODE_ENV production

RUN yarn run build

CMD ["yarn", "start"]