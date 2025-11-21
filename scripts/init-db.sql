-- Initialize PostgreSQL schemas for Tickr
-- This script creates separate schemas for each module

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
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- For advanced indexing

-- Set default search path
ALTER DATABASE tickr SET search_path TO public, users, events, tickets, payments, notifications, analytics;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Tickr database initialized successfully!';
END $$;
