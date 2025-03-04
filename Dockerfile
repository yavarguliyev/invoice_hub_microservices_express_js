FROM node:20-alpine AS builder

WORKDIR /app

COPY ../../package.json /app/
COPY ../../yarn.lock /app/

RUN yarn install --frozen-lockfile

WORKDIR /app/common

COPY ../../common/package.json /app/common/
COPY ../../common/tsconfig.json /app/common/
COPY ../../common/.eslintrc.json /app/common/
COPY ../../common/src /app/common/src/

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

WORKDIR /app/${SERVICE_NAME}

COPY ../../${SERVICE_NAME}/package.json /app/${SERVICE_NAME}/
COPY ../../${SERVICE_NAME}/tsconfig.json /app/${SERVICE_NAME}/
COPY ../../${SERVICE_NAME}/.eslintrc.json /app/${SERVICE_NAME}/
COPY ../../${SERVICE_NAME}/nodemon.json /app/${SERVICE_NAME}/
COPY ../../${SERVICE_NAME}/src /app/${SERVICE_NAME}/src/

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/package.json /app/
COPY --from=builder /app/yarn.lock /app/

WORKDIR /app/common

COPY --from=builder /app/common/package.json /app/common/
COPY --from=builder /app/common/tsconfig.json /app/common/
COPY --from=builder /app/common/.eslintrc.json /app/common/
COPY --from=builder /app/common/src /app/common/src/
COPY --from=builder /app/yarn.lock /app/yarn.lock

RUN apk add --no-cache python3 make g++
RUN yarn install --frozen-lockfile
RUN yarn build

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

WORKDIR /app/${SERVICE_NAME}

COPY --from=builder /app/${SERVICE_NAME}/package.json /app/${SERVICE_NAME}/
COPY --from=builder /app/${SERVICE_NAME}/tsconfig.json /app/${SERVICE_NAME}/
COPY --from=builder /app/${SERVICE_NAME}/.eslintrc.json /app/${SERVICE_NAME}/
COPY --from=builder /app/${SERVICE_NAME}/nodemon.json /app/${SERVICE_NAME}/
COPY --from=builder /app/${SERVICE_NAME}/src /app/${SERVICE_NAME}/src/

ARG ENV_PATH
COPY ${ENV_PATH} /app/${SERVICE_NAME}/.env

RUN yarn install --frozen-lockfile

ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

ARG NODE_PORT
ENV NODE_PORT=${NODE_PORT}

EXPOSE ${NODE_PORT}

CMD if [ "$NODE_ENV" = "production" ]; then yarn start:prod; else yarn start; fi
