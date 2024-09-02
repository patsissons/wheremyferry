#!/bin/bash

WORKSPACE_PATH=/workspace
STATE_PATH=/tmp/workspace
BOOTSTRAPPED_FILE="${STATE_PATH}/.bootstrapped"

if [ ! -f "${BOOTSTRAPPED_FILE}" ]; then
  echo "bootstrapping devcontainer..." && \
  mkdir -p "${STATE_PATH}" && \
  cd "${WORKSPACE_PATH}/app" && \
  mix ecto.create && \
  cd "${WORKSPACE_PATH}" && \
  date +"%Y-%m-%dT%H:%M:%S%:z" > "${BOOTSTRAPPED_FILE}"
fi

echo "starting phoenix server..." && \
cd "${WORKSPACE_PATH}/app" && \
mix phx.server
