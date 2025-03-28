-- Connect to the database
\c gervis;

-- Grant all privileges on all tables to the gervis user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gervis;

-- Grant all privileges on all sequences to the gervis user
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gervis;

-- Grant all privileges on the database to the gervis user
GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis;

-- Make sure the gervis user can create new tables
ALTER USER gervis WITH CREATEDB;

-- Grant usage on the schema
GRANT USAGE ON SCHEMA public TO gervis; 