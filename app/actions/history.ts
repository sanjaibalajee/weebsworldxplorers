"use server";

import { db } from "@/app/db/drizzle";
import { expenses, settlements, walletTopups } from "@/app/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { getCurrentUser } from "./auth";

type ExpenseTransaction = {
  id: string;
  type: "expense";
  title: string;
  amount: number;
  date: string;
  paidBy: string;
  splitBetween: number;
  yourShare: number;
};

type SettlementTransaction = {
  id: string;
  type: "settlement";
  title: string;
  amount: number;
  date: string;
  from: string;
  to: string;
};

type TopupTransaction = {
  id: string;
  type: "topup";
  title: string;
  amount: number;
  date: string;
  user: string;
  exchangeRate: number;
  inrAmount: number;
};

type Transaction = ExpenseTransaction | SettlementTransaction | TopupTransaction;

export async function getTransactionHistory() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { group: [], individual: [] };
  }

  try {
    // Get all expenses
    const allExpenses = await db.query.expenses.findMany({
      orderBy: [desc(expenses.createdAt)],
      with: {
        createdBy: {
          columns: { id: true, name: true },
        },
        payers: {
          with: {
            user: { columns: { id: true, name: true } },
          },
        },
        splits: {
          with: {
            user: { columns: { id: true, name: true } },
          },
        },
      },
    });

    // Get settlements involving current user
    const allSettlements = await db.query.settlements.findMany({
      where: or(
        eq(settlements.payerId, currentUser.id),
        eq(settlements.receiverId, currentUser.id)
      ),
      orderBy: [desc(settlements.createdAt)],
      with: {
        payer: { columns: { id: true, name: true } },
        receiver: { columns: { id: true, name: true } },
      },
    });

    // Get topups for current user
    const topups = await db.query.walletTopups.findMany({
      where: eq(walletTopups.userId, currentUser.id),
      orderBy: [desc(walletTopups.createdAt)],
      with: {
        user: { columns: { id: true, name: true } },
      },
    });

    // Check if current user is admin
    const isAdmin = currentUser.name.toLowerCase() === "admin";

    // Transform expenses and separate by type
    const groupExpenseTransactions: ExpenseTransaction[] = [];
    const individualExpenseTransactions: ExpenseTransaction[] = [];

    for (const e of allExpenses) {
      const yourSplit = e.splits.find((s) => s.userId === currentUser.id);
      const primaryPayer = e.payers[0];

      // Check if user is involved in this expense
      const isInSplit = e.splits.some((s) => s.userId === currentUser.id);
      const isPayer = e.payers.some((p) => p.userId === currentUser.id);
      const isCreator = e.createdBy?.id === currentUser.id;

      // For individual expenses, only show if created by current user
      if (e.type === "individual") {
        if (isCreator) {
          individualExpenseTransactions.push({
            id: e.id,
            type: "expense" as const,
            title: e.title,
            amount: parseFloat(e.totalAmountThb),
            date: e.createdAt?.toISOString() || "",
            paidBy: primaryPayer?.user?.name || "Unknown",
            splitBetween: e.splits.length,
            yourShare: yourSplit ? parseFloat(yourSplit.owedAmountThb) : 0,
          });
        }
        continue;
      }

      // For pot expenses, admin can see all pot expenses they created
      if (e.type === "pot" && isAdmin) {
        if (isCreator) {
          groupExpenseTransactions.push({
            id: e.id,
            type: "expense" as const,
            title: e.title,
            amount: parseFloat(e.totalAmountThb),
            date: e.createdAt?.toISOString() || "",
            paidBy: primaryPayer?.user?.name || "Unknown",
            splitBetween: e.splits.length,
            yourShare: yourSplit ? parseFloat(yourSplit.owedAmountThb) : 0,
          });
        }
        continue;
      }

      // For group/pot expenses, show if user is in split, payer, or creator
      if (isInSplit || isPayer || isCreator) {
        groupExpenseTransactions.push({
          id: e.id,
          type: "expense" as const,
          title: e.title,
          amount: parseFloat(e.totalAmountThb),
          date: e.createdAt?.toISOString() || "",
          paidBy: primaryPayer?.user?.name || "Unknown",
          splitBetween: e.splits.length,
          yourShare: yourSplit ? parseFloat(yourSplit.owedAmountThb) : 0,
        });
      }
    }

    // Transform settlements
    const settlementTransactions: SettlementTransaction[] = allSettlements.map((s) => ({
      id: s.id,
      type: "settlement" as const,
      title: "Settlement",
      amount: parseFloat(s.amountThbEquivalent),
      date: s.createdAt?.toISOString() || "",
      from: s.payer?.name || "Unknown",
      to: s.receiver?.name || "Unknown",
    }));

    // Transform topups
    const topupTransactions: TopupTransaction[] = topups.map((t) => ({
      id: t.id,
      type: "topup" as const,
      title: "Wallet Top-up",
      amount: parseFloat(t.amountThb),
      date: t.createdAt?.toISOString() || "",
      user: t.user?.name || "Unknown",
      exchangeRate: parseFloat(t.exchangeRate),
      inrAmount: Math.round(parseFloat(t.amountThb) * parseFloat(t.exchangeRate)),
    }));

    // Combine group transactions (expenses + settlements + topups)
    const groupTransactions: Transaction[] = [
      ...groupExpenseTransactions,
      ...settlementTransactions,
      ...topupTransactions,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Individual transactions (just personal expenses)
    const individualTransactions: Transaction[] = individualExpenseTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      group: groupTransactions,
      individual: individualTransactions,
    };
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return { group: [], individual: [] };
  }
}
