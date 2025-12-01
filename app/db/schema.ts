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

export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  payerId: uuid("payer_id").references(() => users.id),
  receiverId: uuid("receiver_id").references(() => users.id),
  amountThbEquivalent: numeric("amount_thb_equivalent", { precision: 10, scale: 2 }).notNull(),
  amountInrPaid: numeric("amount_inr_paid", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  walletTopups: many(walletTopups),
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

export const settlementsRelations = relations(settlements, ({ one }) => ({
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
}));
