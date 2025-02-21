#!/usr/bin/env bash

. ../common/bootstrap.sh

docker-compose --project-name $PROJECT_NAME up -d

docker container prune -f
docker network prune -f
docker volume prune -f
docker system prune -a -f
docker system df