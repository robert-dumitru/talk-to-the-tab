CREATE SCHEMA t4;

SET search_path TO t4; 

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
);