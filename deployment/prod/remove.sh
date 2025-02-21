#!/usr/bin/env bash

set -e  # Exit on any error

# Include bootstrap configuration (assuming it's already set up)
. ../common/bootstrap.sh

echo "Project Name: $PROJECT_NAME"
echo "================================================"

# List all containers with the project name filter
docker ps --filter "name=$PROJECT_NAME"

# Stop containers forcefully and remove them
docker-compose --project-name $PROJECT_NAME down --volumes --remove-orphans

# Attempt to force kill all containers related to the project
RUNNING_CONTAINERS=$(docker ps -a --filter "name=$PROJECT_NAME" -q)
if [ -n "$RUNNING_CONTAINERS" ]; then
  echo "Forcing stop and kill of containers..."
  docker kill $RUNNING_CONTAINERS
  docker rm $RUNNING_CONTAINERS
else
  echo "All containers stopped successfully."
fi

# Prune unused containers, networks, and volumes
docker container prune -f
docker network prune -f
docker volume prune -f
docker system prune -a -f
docker system df

echo "Cleanup completed successfully."
