-- CLEANUP: Delete all settlements to start fresh
-- Run this to clear the mess from old buggy code

-- First, show what we're about to delete
SELECT
  s.id,
  p.name as payer,
  r.name as receiver,
  s.amount_thb_equivalent as amount,
  s.status,
  s.created_at
FROM settlements s
LEFT JOIN users p ON s.payer_id = p.id
LEFT JOIN users r ON s.receiver_id = r.id
ORDER BY s.created_at DESC;

-- Delete all settlement expenses (linked records)
DELETE FROM settlement_expenses;

-- Delete all wallet transactions related to settlements
DELETE FROM wallet_transactions WHERE type IN ('settlement_sent', 'settlement_received');

-- Delete all settlements
DELETE FROM settlements;

-- Verify cleanup
SELECT COUNT(*) as remaining_settlements FROM settlements;
SELECT COUNT(*) as remaining_settlement_expenses FROM settlement_expenses;
