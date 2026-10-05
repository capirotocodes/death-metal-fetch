#!/bin/sh
# Fly mounts the volume over /data as root; chown so the app user can write SQLite.
set -eu
mkdir -p /data
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /data
  exec runuser -u nextjs -- "$@"
fi
exec "$@"
