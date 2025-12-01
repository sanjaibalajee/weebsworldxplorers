-- Migration: Add wallet_transactions table for complete money trail
-- Run this after 001_add_expense_type.sql

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'topup' | 'expense_paid' | 'settlement_sent' | 'settlement_received'
    amount_thb NUMERIC(10, 2) NOT NULL, -- positive for IN, negative for OUT
    balance_after NUMERIC(10, 2) NOT NULL, -- running balance after this transaction

    -- Reference to source transaction
    reference_id UUID, -- ID of the related topup/expense/settlement
    reference_type VARCHAR(30), -- 'wallet_topup' | 'expense' | 'settlement'

    -- Additional context
    description VARCHAR(255),
    counterparty_id UUID REFERENCES users(id), -- For settlements: who you paid/received from

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries by user
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
