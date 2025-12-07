-- FULL CLEANUP: Reset settlements and fix wallet balances
-- Run this to clear the mess from old buggy code

-- Step 1: Show current settlements (for reference)
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

-- Step 2: Delete all settlement-related wallet transactions
DELETE FROM wallet_transactions WHERE type IN ('settlement_sent', 'settlement_received');

-- Step 3: Delete all settlement expenses (linked records)
DELETE FROM settlement_expenses;

-- Step 4: Delete all settlements
DELETE FROM settlements;

-- Step 5: Recalculate wallet balances from remaining transactions
-- (pot_contribution and pot_return transactions should still be correct)

-- Show remaining wallet transactions
SELECT
  u.name,
  wt.type,
  wt.amount_thb,
  wt.created_at
FROM wallet_transactions wt
JOIN users u ON wt.user_id = u.id
ORDER BY u.name, wt.created_at;

-- Verify cleanup
SELECT 'Settlements remaining:' as check_type, COUNT(*)::text as count FROM settlements
UNION ALL
SELECT 'Settlement expenses remaining:', COUNT(*)::text FROM settlement_expenses
UNION ALL
SELECT 'Settlement wallet txns remaining:', COUNT(*)::text FROM wallet_transactions WHERE type IN ('settlement_sent', 'settlement_received');
