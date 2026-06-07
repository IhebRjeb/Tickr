#!/bin/bash
# Create tickr_test database and initialize with same schemas as main DB
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE tickr_test;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "tickr_test" <<-EOSQL
    -- Create schemas
    CREATE SCHEMA IF NOT EXISTS users;
    CREATE SCHEMA IF NOT EXISTS events;
    CREATE SCHEMA IF NOT EXISTS tickets;
    CREATE SCHEMA IF NOT EXISTS payments;
    CREATE SCHEMA IF NOT EXISTS notifications;
    CREATE SCHEMA IF NOT EXISTS analytics;

    -- Grant permissions
    GRANT ALL PRIVILEGES ON SCHEMA users TO postgres;
    GRANT ALL PRIVILEGES ON SCHEMA events TO postgres;
    GRANT ALL PRIVILEGES ON SCHEMA tickets TO postgres;
    GRANT ALL PRIVILEGES ON SCHEMA payments TO postgres;
    GRANT ALL PRIVILEGES ON SCHEMA notifications TO postgres;
    GRANT ALL PRIVILEGES ON SCHEMA analytics TO postgres;

    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";

    -- Set default search path
    ALTER DATABASE tickr_test SET search_path TO public, users, events, tickets, payments, notifications, analytics;
EOSQL

echo "tickr_test database initialized successfully!"
