-- Migration: Add product variations (sizes and colors) and ensure image_url exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add variations to order items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS color TEXT;
