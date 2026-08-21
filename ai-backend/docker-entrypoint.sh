#!/bin/sh
set -e

# saved_models/ and data/ are volume mount points (docker-compose.yml). A volume created
# before the image switched to a non-root user keeps whatever ownership it already had on
# disk (usually root, from an older image) — chown-in-image at build time only affects a
# fresh, never-before-used volume. Fix it here, every start, before dropping privileges.
chown -R app:app /app/saved_models /app/data

exec setpriv --reuid=app --regid=app --clear-groups "$@"
