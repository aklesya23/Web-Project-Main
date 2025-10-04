-- Seed data for Universal Market
-- Run this after creating the database structure

-- First insert sample users to avoid foreign key constraint errors
INSERT INTO users (full_name, email, phone, password_hash) VALUES
('John Smith', 'john.smith@email.com', '+1234567890', '$2b$10$example.hash.for.password123'),
('Sarah Johnson', 'sarah.johnson@email.com', '+1234567891', '$2b$10$example.hash.for.password456'),
('Mike Davis', 'mike.davis@email.com', '+1234567892', '$2b$10$example.hash.for.password789'),
('Emily Wilson', 'emily.wilson@email.com', '+1234567893', '$2b$10$example.hash.for.password101'),
('David Brown', 'david.brown@email.com', '+1234567894', '$2b$10$example.hash.for.password112');

-- Insert sample products with valid seller_id references
INSERT INTO products (name, description, price, category, image_url, stock_quantity, seller_id) VALUES
('iPhone 14 Pro', 'Latest Apple smartphone with advanced camera system', 999.99, 'Electronics', '/placeholder.svg?height=300&width=300', 15, 1),
('Samsung Galaxy S23', 'Flagship Android smartphone with excellent display', 849.99, 'Electronics', '/placeholder.svg?height=300&width=300', 20, 2),
('MacBook Air M2', 'Lightweight laptop with Apple M2 chip', 1199.99, 'Electronics', '/placeholder.svg?height=300&width=300', 8, 1),
('Dell XPS 13', 'Premium ultrabook with stunning display', 1099.99, 'Electronics', '/placeholder.svg?height=300&width=300', 12, 3),
('iPad Pro 12.9"', 'Professional tablet with M2 chip', 1099.99, 'Electronics', '/placeholder.svg?height=300&width=300', 10, 1),

('Nike Air Max 270', 'Comfortable running shoes with air cushioning', 150.00, 'Clothing', '/placeholder.svg?height=300&width=300', 50, 2),
('Levi''s 501 Jeans', 'Classic straight-fit denim jeans', 89.99, 'Clothing', '/placeholder.svg?height=300&width=300', 30, 4),
('Adidas Ultraboost 22', 'Premium running shoes with boost technology', 180.00, 'Clothing', '/placeholder.svg?height=300&width=300', 25, 2),
('North Face Jacket', 'Waterproof outdoor jacket for all seasons', 199.99, 'Clothing', '/placeholder.svg?height=300&width=300', 15, 5),
('Champion Hoodie', 'Comfortable cotton blend hoodie', 59.99, 'Clothing', '/placeholder.svg?height=300&width=300', 40, 4),

('Toyota Camry 2023', 'Reliable mid-size sedan with excellent fuel economy', 25000.00, 'Vehicles', '/placeholder.svg?height=300&width=300', 5, 3),
('Honda Civic 2023', 'Compact car with modern features and efficiency', 23000.00, 'Vehicles', '/placeholder.svg?height=300&width=300', 7, 5),
('Ford F-150 2023', 'America''s best-selling pickup truck', 35000.00, 'Vehicles', '/placeholder.svg?height=300&width=300', 3, 3),
('Tesla Model 3', 'Electric sedan with autopilot capabilities', 45000.00, 'Vehicles', '/placeholder.svg?height=300&width=300', 4, 1),
('BMW X3 2023', 'Luxury compact SUV with premium features', 42000.00, 'Vehicles', '/placeholder.svg?height=300&width=300', 2, 5),

('3-Bedroom House', 'Beautiful family home in quiet neighborhood', 350000.00, 'Real Estate', '/placeholder.svg?height=300&width=300', 1, 3),
('Downtown Apartment', 'Modern 2-bedroom apartment in city center', 280000.00, 'Real Estate', '/placeholder.svg?height=300&width=300', 2, 4),
('Luxury Condo', 'High-end condominium with city views', 450000.00, 'Real Estate', '/placeholder.svg?height=300&width=300', 1, 5),
('Suburban Villa', 'Spacious 4-bedroom home with garden', 520000.00, 'Real Estate', '/placeholder.svg?height=300&width=300', 1, 3),
('Studio Apartment', 'Cozy studio in trendy neighborhood', 180000.00, 'Real Estate', '/placeholder.svg?height=300&width=300', 3, 4),

('IKEA Sofa Set', 'Comfortable 3-piece living room furniture set', 899.99, 'Home Goods', '/placeholder.svg?height=300&width=300', 12, 2),
('KitchenAid Mixer', 'Professional stand mixer for baking enthusiasts', 379.99, 'Home Goods', '/placeholder.svg?height=300&width=300', 18, 1),
('Dyson V15 Vacuum', 'Cordless vacuum with laser dust detection', 749.99, 'Home Goods', '/placeholder.svg?height=300&width=300', 8, 5),
('Instant Pot Duo', '7-in-1 electric pressure cooker', 99.99, 'Home Goods', '/placeholder.svg?height=300&width=300', 25, 2),
('Philips Air Fryer', 'Healthy cooking with rapid air technology', 149.99, 'Home Goods', '/placeholder.svg?height=300&width=300', 20, 4),

('Chanel Perfume', 'Luxury fragrance with elegant floral notes', 120.00, 'Cosmetics', '/placeholder.svg?height=300&width=300', 25, 4),
('MAC Lipstick Set', 'Collection of premium lipsticks in various shades', 85.00, 'Cosmetics', '/placeholder.svg?height=300&width=300', 40, 5),
('Fenty Beauty Foundation', 'Inclusive foundation with 40+ shades', 36.00, 'Cosmetics', '/placeholder.svg?height=300&width=300', 50, 2),
('Urban Decay Palette', 'Eyeshadow palette with vibrant colors', 54.00, 'Cosmetics', '/placeholder.svg?height=300&width=300', 30, 4),
('The Ordinary Skincare Set', 'Complete skincare routine for all skin types', 45.00, 'Cosmetics', '/placeholder.svg?height=300&width=300', 35, 1);
