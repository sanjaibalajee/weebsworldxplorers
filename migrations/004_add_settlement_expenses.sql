-- Migration: Add settlement_expenses table to link settlements to specific expenses
-- Run this after 003_add_settlement_status.sql

CREATE TABLE IF NOT EXISTS settlement_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  amount_thb NUMERIC(10, 2) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settlement_expenses_settlement ON settlement_expenses(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_expenses_expense ON settlement_expenses(expense_id);
