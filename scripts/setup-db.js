const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

const schemaSql = `
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  frotcom_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  frotcom_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  frotcom_id VARCHAR(255) UNIQUE NOT NULL,
  country_id INTEGER REFERENCES countries(id),
  warehouse_id INTEGER REFERENCES warehouses(id),
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS scoring_configs (
  id SERIAL PRIMARY KEY,
  indicator_name VARCHAR(255) NOT NULL UNIQUE,
  weight_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default indicators if they don't exist
INSERT INTO scoring_configs (indicator_name, weight_percentage) VALUES
('Harsh acceleration', 10),
('Harsh braking', 10),
('Harsh cornering', 10),
('Harsh turn between accel/brake', 10),
('Excessive idling', 10),
('Excessive RPM', 10),
('Alarms', 10),
('Time without Cruise Control', 15),
('Acceleration during Cruise Control', 15)
ON CONFLICT (indicator_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS ecodriving_scores (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  overall_score DECIMAL(5,2),
  metrics JSONB, -- Stores raw values for each indicator
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(driver_id, period_start, period_end)
);
`;

async function setupDatabase() {
    try {
        await client.connect();
        console.log('Connected to Neon Postgres.');
        await client.query(schemaSql);
        console.log('Schema setup completed successfully.');
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await client.end();
    }
}

setupDatabase();
