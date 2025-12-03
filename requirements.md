# admin pot system requirements

## overview

admin user manages a shared "pot" system. each person contributes money to their pot upfront. when admin pays for group expenses, money comes from everyone's pot instead of creating owe relationships.

## core concepts

### pot
- each user has a pot balance (separate from wallet)
- pot = money set aside for group expenses managed by admin
- when admin spends, it deducts from everyone's pot proportionally

### wallet vs pot
- **wallet**: personal money tracker (topups, personal expenses)
- **pot**: group fund contribution (admin manages this)

## features

### 1. admin pot loading
- admin can load money into any user's pot
- when admin loads X thb into user's pot:
  - user's pot balance increases by X
  - user's wallet balance decreases by X
  - creates a wallet transaction "pot contribution" for the user
- admin dashboard shows all users' pot balances

### 2. admin pot topup
- admin can add more money to any user's pot later
- same flow as initial loading

### 3. admin group expenses
- when admin creates a group expense:
  - expense type = "pot" (new type, different from "group" and "individual")
  - money deducts from each participant's pot (not wallet)
  - NO owe relationships created (no settle up needed)
  - expense shows in history but not in balances/settle page
- split can be equal or custom shares (like regular group expenses)

### 4. pot balance tracking
- each user can see their pot balance on dashboard
- shows: initial contribution, expenses paid from pot, remaining balance

## database changes

### new table: user_pots
```sql
CREATE TABLE user_pots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) DEFAULT 0,
    UNIQUE(user_id)
);
```

### new table: pot_transactions
```sql
CREATE TABLE pot_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'contribution', 'expense'
    amount_thb NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    reference_id UUID, -- expense_id if type is expense
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### expenses table update
- add new type value: "pot" (alongside "group" and "individual")

## ui changes

### admin dashboard
- show "manage pots" button
- list all users with their pot balances
- button to load/topup each user's pot

### admin pot loading page
- select user
- enter amount
- confirm (shows: will deduct from user's wallet)

### admin expense creation
- new option: "pot expense"
- when selected, shows pot balances for each user
- warns if anyone has insufficient pot balance

### user dashboard
- show pot balance card (if pot exists)
- pot transaction history

### settle page
- exclude pot expenses from balance calculations
- pot expenses don't appear in "owed" lists

## flow examples

### example 1: initial pot setup
1. admin loads ฿5000 into sanjai's pot
2. sanjai's wallet: -฿5000
3. sanjai's pot: +฿5000
4. sanjai sees wallet transaction: "pot contribution -฿5000"

### example 2: admin pays for dinner
1. admin creates pot expense: "dinner" ฿900, split 9 ways
2. each person's pot: -฿100
3. no owe relationships created
4. everyone sees expense in history

### example 3: pot topup
1. admin loads additional ฿2000 into sanjai's pot
2. same flow as initial loading

## edge cases

- user has insufficient pot balance: show warning, block expense or allow negative?
- user has insufficient wallet balance for pot contribution: show error
- admin accidentally creates wrong expense: need delete/edit capability
- what if pot goes negative: decide policy (allow vs block)

## questions to confirm

1. can pot go negative or should we block expenses when insufficient?
2. should admin expenses always be pot type, or can admin also create regular group expenses?
3. should pot balance show on main dashboard or separate page?
4. do we need pot transaction history for each user?
