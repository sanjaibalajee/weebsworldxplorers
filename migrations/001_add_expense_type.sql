-- Migration: Add type column to expenses table
-- Run this if your database already has the expenses table

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'group';
