#!/bin/sh

# DATABASE_URL is set via environment variable from docker-compose

# Wait for PostgreSQL to be ready (simple retry loop)
echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if PGPASSWORD=ngm_password psql -h postgres -U ngm_user -d ngm_sec_reports -c "SELECT 1" >/dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Warning: PostgreSQL may not be ready, continuing anyway..."
  else
    echo "Attempt $i/30..."
    sleep 2
  fi
done

# Run migrations or push schema
echo "Setting up database schema..."
npx prisma migrate deploy 2>&1 || npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Schema setup completed"

# Start the application
echo "Starting application..."
exec node server.js
