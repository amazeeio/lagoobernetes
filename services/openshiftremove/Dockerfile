ARG LAGOON_GIT_BRANCH
ARG IMAGE_REPO
# STAGE 1: Loading Image lagoon-node-packages-builder which contains node packages shared by all Node Services
FROM ${IMAGE_REPO:-amazeeiolagoon}/yarn-workspace-builder:${LAGOON_GIT_BRANCH:-latest} as yarn-workspace-builder

# STAGE 2: specific service Image
FROM ${IMAGE_REPO:-amazeeiolagoon}/node:8

# Copying generated node_modules from the first stage
COPY --from=yarn-workspace-builder /app /app

# Setting the workdir to the service, all following commands will run from here
WORKDIR /app/services/openshiftremove/

# Copying the .env.defaults into the Workdir, as the dotenv system searches within the workdir for it
COPY --from=yarn-workspace-builder /app/.env.defaults .

# Copying files from our service
COPY . .

# Running yarn install in case some dependencies are not here
RUN yarn install --frozen-lockfile

# Making sure we run in production
ENV NODE_ENV production

RUN yarn run build

CMD ["yarn", "start"]