-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- Insert a default admin (you can change this later)
-- First, you need to create a user account, then add them as admin
-- Example: If user with email 'admin@example.com' has id 1, run:
-- INSERT INTO admins (user_id, role) VALUES (1, 'admin');

COMMENT ON TABLE admins IS 'Admin users with elevated privileges';
