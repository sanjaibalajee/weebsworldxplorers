# pot system implementation

## database
- [x] add user_pots table to schema.sql
- [x] add pot_transactions table to schema.sql
- [x] add pot type to expenses

## schema (drizzle)
- [x] add userPots table to schema.ts
- [x] add potTransactions table to schema.ts
- [x] add relations for new tables
- [x] update expenses type to include "pot"

## actions
- [x] create pot actions (loadPot, getPotBalance, getPotTransactions)
- [x] update expense actions to handle pot expenses
- [x] update balance calculations to exclude pot expenses

## ui - admin
- [x] create admin dashboard with pot management
- [x] create load pot page/modal
- [x] update expense form for pot expenses (admin only)

## ui - users
- [x] show pot balance on dashboard
- [x] show pot transaction history (via pot transactions)
- [x] exclude pot expenses from settle page

## testing
- [ ] run SQL in Neon Editor to create pot tables
- [ ] test pot loading flow
- [ ] test pot expense creation
- [ ] test balance calculations exclude pot expenses
