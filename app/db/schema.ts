import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  date,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  pin: varchar("pin", { length: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const walletTopups = pgTable("wallet_topups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  amountThb: numeric("amount_thb", { precision: 10, scale: 2 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 2 }).notNull(),
  source: varchar("source", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  totalAmountThb: numeric("total_amount_thb", { precision: 10, scale: 2 }).notNull(),
  expenseDate: date("expense_date").defaultNow(),
  type: varchar("type", { length: 20 }).notNull().default("group"), // 'group' or 'individual'
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const expensePayers = pgTable(
  "expense_payers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    cashGiven: numeric("cash_given", { precision: 10, scale: 2 }).default("0"),
    changeTaken: numeric("change_taken", { precision: 10, scale: 2 }).default("0"),
  },
  (table) => [
    check("check_positive", sql`${table.cashGiven} >= 0 AND ${table.changeTaken} >= 0`),
  ]
);

export const expenseSplits = pgTable(
  "expense_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    shares: numeric("shares", { precision: 4, scale: 1 }).default("1.0"),
    owedAmountThb: numeric("owed_amount_thb", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    unique().on(table.expenseId, table.userId),
  ]
);

// Settlement status:
// - 'pending': Payer marked as paid, waiting for receiver to confirm
// - 'confirmed': Receiver confirmed receipt, balances updated
// - 'rejected': Receiver rejected the settlement
export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  payerId: uuid("payer_id").references(() => users.id),
  receiverId: uuid("receiver_id").references(() => users.id),
  amountThbEquivalent: numeric("amount_thb_equivalent", { precision: 10, scale: 2 }).notNull(),
  amountInrPaid: numeric("amount_inr_paid", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'confirmed' | 'rejected'
  affectsPayerWallet: varchar("affects_payer_wallet", { length: 5 }).default("true"), // stored for when confirmed
  affectsReceiverWallet: varchar("affects_receiver_wallet", { length: 5 }).default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

// Settlement expenses - links settlements to specific expenses being settled
export const settlementExpenses = pgTable("settlement_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  settlementId: uuid("settlement_id").references(() => settlements.id, { onDelete: "cascade" }).notNull(),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }).notNull(),
  amountThb: numeric("amount_thb", { precision: 10, scale: 2 }).notNull(), // Amount being settled for this expense
});

// Wallet transactions - complete money trail
// Types:
// - 'topup': Money loaded into wallet (IN)
// - 'expense_paid': Cash paid for an expense (OUT)
// - 'settlement_sent': Paid someone what you owed (OUT)
// - 'settlement_received': Received money from someone (IN)
export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // 'topup' | 'expense_paid' | 'settlement_sent' | 'settlement_received'
  amountThb: numeric("amount_thb", { precision: 10, scale: 2 }).notNull(), // positive for IN, negative for OUT
  balanceAfter: numeric("balance_after", { precision: 10, scale: 2 }).notNull(), // running balance

  // Reference to the source transaction
  referenceId: uuid("reference_id"), // ID of topup/expense/settlement
  referenceType: varchar("reference_type", { length: 30 }), // 'wallet_topup' | 'expense' | 'settlement'

  // Additional context
  description: varchar("description", { length: 255 }),
  counterpartyId: uuid("counterparty_id").references(() => users.id), // For settlements: who paid/received

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  walletTopups: many(walletTopups),
  walletTransactions: many(walletTransactions, { relationName: "user" }),
  walletTransactionsAsCounterparty: many(walletTransactions, { relationName: "counterparty" }),
  createdExpenses: many(expenses),
  expensePayers: many(expensePayers),
  expenseSplits: many(expenseSplits),
  settlementsAsPayer: many(settlements, { relationName: "payer" }),
  settlementsAsReceiver: many(settlements, { relationName: "receiver" }),
}));

export const walletTopupsRelations = relations(walletTopups, ({ one }) => ({
  user: one(users, {
    fields: [walletTopups.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
  payers: many(expensePayers),
  splits: many(expenseSplits),
}));

export const expensePayersRelations = relations(expensePayers, ({ one }) => ({
  expense: one(expenses, {
    fields: [expensePayers.expenseId],
    references: [expenses.id],
  }),
  user: one(users, {
    fields: [expensePayers.userId],
    references: [users.id],
  }),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  user: one(users, {
    fields: [expenseSplits.userId],
    references: [users.id],
  }),
}));

export const settlementsRelations = relations(settlements, ({ one, many }) => ({
  payer: one(users, {
    fields: [settlements.payerId],
    references: [users.id],
    relationName: "payer",
  }),
  receiver: one(users, {
    fields: [settlements.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
  settlementExpenses: many(settlementExpenses),
}));

export const settlementExpensesRelations = relations(settlementExpenses, ({ one }) => ({
  settlement: one(settlements, {
    fields: [settlementExpenses.settlementId],
    references: [settlements.id],
  }),
  expense: one(expenses, {
    fields: [settlementExpenses.expenseId],
    references: [expenses.id],
  }),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  user: one(users, {
    fields: [walletTransactions.userId],
    references: [users.id],
    relationName: "user",
  }),
  counterparty: one(users, {
    fields: [walletTransactions.counterpartyId],
    references: [users.id],
    relationName: "counterparty",
  }),
}));
