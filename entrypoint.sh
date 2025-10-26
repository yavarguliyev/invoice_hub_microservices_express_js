#!/bin/sh
set -e

if [ "$NODE_ENV" = "production" ]; then
  echo "🚀 Starting in production mode..."
  yarn start:prod
else
  echo "💻 Starting in development mode..."
  yarn start
fi
