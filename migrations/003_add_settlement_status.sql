-- Migration: Add status columns to settlements table for confirmation flow
-- Run this after 002_add_wallet_transactions.sql

-- Add status column (pending, confirmed, rejected)
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Add wallet affect tracking (stored when payer initiates, used when confirmed)
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS affects_payer_wallet VARCHAR(5) DEFAULT 'true';
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS affects_receiver_wallet VARCHAR(5) DEFAULT 'true';

-- Add confirmed timestamp
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Update existing settlements to 'confirmed' status (they were already processed)
UPDATE settlements SET status = 'confirmed', confirmed_at = created_at WHERE status = 'pending';
