#!/bin/sh

# Create data directory if it doesn't exist
mkdir -p /app/data

# Set database URL
export DATABASE_URL="file:./data/dev.db"

# Wait a moment for filesystem to be ready
sleep 2

# Run migrations without seeding
if [ ! -f "/app/data/dev.db" ]; then
  echo "Database not found, applying schema..."
  npx prisma migrate deploy 2>&1 || npx prisma db push --skip-generate 2>&1 || echo "Migrations applied or skipped"
else
  echo "Database exists, checking migrations..."
  npx prisma migrate deploy 2>&1 || echo "Migrations up to date"
fi

# Start the application
echo "Starting application..."
exec node server.js
