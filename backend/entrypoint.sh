#!/bin/sh
set -e

if [ "$1" = "web" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput
  exec daphne -b 0.0.0.0 -p "${PORT:-8000}" core.asgi:application
elif [ "$1" = "worker" ]; then
  exec celery -A core worker --loglevel=info
elif [ "$1" = "beat" ]; then
  exec celery -A core beat --loglevel=info
else
  exec "$@"
fi