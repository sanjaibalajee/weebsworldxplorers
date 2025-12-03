"use server";

import { db } from "@/app/db/drizzle";
import { expenses, expensePayers, expenseSplits, users, walletTransactions } from "@/app/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "./auth";
import { recordExpensePaymentForUser, getWalletBalance } from "./wallet";

type PayerInput = {
  userId: string;
  cashGiven: number;
  changeTaken: number;
};

type SplitInput = {
  userId: string;
  shares: number;
  owedAmount: number;
};

type CreateExpenseInput = {
  title: string;
  totalAmount: number;
  date: string;
  type: "group" | "individual";
  payers: PayerInput[];
  splits: SplitInput[];
};

export async function createExpense(input: CreateExpenseInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Create expense
    const [expense] = await db
      .insert(expenses)
      .values({
        title: input.title,
        totalAmountThb: input.totalAmount.toString(),
        expenseDate: input.date,
        type: input.type,
        createdBy: currentUser.id,
      })
      .returning();

    // Create payers
    if (input.payers.length > 0) {
      await db.insert(expensePayers).values(
        input.payers.map((payer) => ({
          expenseId: expense.id,
          userId: payer.userId,
          cashGiven: payer.cashGiven.toString(),
          changeTaken: payer.changeTaken.toString(),
        }))
      );
    }

    // Create splits
    if (input.splits.length > 0) {
      await db.insert(expenseSplits).values(
        input.splits.map((split) => ({
          expenseId: expense.id,
          userId: split.userId,
          shares: split.shares.toString(),
          owedAmountThb: split.owedAmount.toString(),
        }))
      );
    }

    // Record wallet transaction for ALL payers (deduct from their wallet)
    for (const payer of input.payers) {
      const netPaid = payer.cashGiven - payer.changeTaken;
      if (netPaid > 0) {
        await recordExpensePaymentForUser(expense.id, netPaid, input.title, payer.userId);
      }
    }

    return { success: true, expense };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "Failed to create expense" };
  }
}

type UpdateExpenseInput = CreateExpenseInput & {
  id: string;
};

export async function updateExpense(input: UpdateExpenseInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Update expense
    const [expense] = await db
      .update(expenses)
      .set({
        title: input.title,
        totalAmountThb: input.totalAmount.toString(),
        expenseDate: input.date,
        type: input.type,
      })
      .where(eq(expenses.id, input.id))
      .returning();

    // Delete old payers and splits
    await db.delete(expensePayers).where(eq(expensePayers.expenseId, input.id));
    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, input.id));

    // Delete old wallet transactions for this expense
    await db.delete(walletTransactions).where(
      and(
        eq(walletTransactions.referenceId, input.id),
        eq(walletTransactions.referenceType, "expense")
      )
    );

    // Create new payers
    if (input.payers.length > 0) {
      await db.insert(expensePayers).values(
        input.payers.map((payer) => ({
          expenseId: expense.id,
          userId: payer.userId,
          cashGiven: payer.cashGiven.toString(),
          changeTaken: payer.changeTaken.toString(),
        }))
      );
    }

    // Create new splits
    if (input.splits.length > 0) {
      await db.insert(expenseSplits).values(
        input.splits.map((split) => ({
          expenseId: expense.id,
          userId: split.userId,
          shares: split.shares.toString(),
          owedAmountThb: split.owedAmount.toString(),
        }))
      );
    }

    // Record new wallet transactions for ALL payers
    for (const payer of input.payers) {
      const netPaid = payer.cashGiven - payer.changeTaken;
      if (netPaid > 0) {
        await recordExpensePaymentForUser(expense.id, netPaid, input.title, payer.userId);
      }
    }

    return { success: true, expense };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { success: false, error: "Failed to update expense" };
  }
}

export async function getExpense(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  try {
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, id),
      with: {
        createdBy: {
          columns: { id: true, name: true },
        },
        payers: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
        splits: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!expense) return null;

    return {
      id: expense.id,
      title: expense.title,
      totalAmount: parseFloat(expense.totalAmountThb),
      date: expense.expenseDate,
      type: expense.type as "group" | "individual",
      createdBy: expense.createdBy?.name || "Unknown",
      createdAt: expense.createdAt?.toISOString() || "",
      payers: expense.payers.map((p) => ({
        userId: p.userId!,
        name: p.user?.name || "Unknown",
        cashGiven: parseFloat(p.cashGiven || "0"),
        changeTaken: parseFloat(p.changeTaken || "0"),
      })),
      splits: expense.splits.map((s) => ({
        userId: s.userId!,
        name: s.user?.name || "Unknown",
        shares: parseFloat(s.shares || "1"),
        amount: parseFloat(s.owedAmountThb),
      })),
    };
  } catch (error) {
    console.error("Error fetching expense:", error);
    return null;
  }
}

export async function getExpenses(type?: "group" | "individual", onlyMine?: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const whereClause = type ? eq(expenses.type, type) : undefined;

    const allExpenses = await db.query.expenses.findMany({
      where: whereClause,
      orderBy: [desc(expenses.createdAt)],
      with: {
        createdBy: {
          columns: { id: true, name: true },
        },
        payers: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
        splits: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    // Filter: show all group expenses, but only current user's individual expenses
    // If onlyMine is true, only show expenses where user is involved
    const filtered = allExpenses.filter((expense) => {
      // For individual expenses, only show if created by current user
      if (expense.type === "individual" && expense.createdBy !== currentUser.id) {
        return false;
      }
      // If onlyMine filter is on, only show expenses where user paid or is in split
      if (onlyMine) {
        const isPayer = expense.payers.some((p) => p.userId === currentUser.id);
        const isInSplit = expense.splits.some((s) => s.userId === currentUser.id);
        return isPayer || isInSplit;
      }
      return true;
    });

    return filtered.map((expense) => {
      const yourSplit = expense.splits.find((s) => s.userId === currentUser.id);
      const primaryPayer = expense.payers[0];

      return {
        id: expense.id,
        title: expense.title,
        totalAmount: parseFloat(expense.totalAmountThb),
        date: expense.expenseDate,
        type: expense.type as "group" | "individual",
        createdAt: expense.createdAt?.toISOString() || "",
        paidBy: primaryPayer?.user?.name || "Unknown",
        splitBetween: expense.splits.length,
        yourShare: yourSplit ? parseFloat(yourSplit.owedAmountThb) : 0,
      };
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function getRecentExpenses(limit: number = 5) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const recentExpenses = await db.query.expenses.findMany({
      orderBy: [desc(expenses.createdAt)],
      limit: limit * 2, // Fetch more to account for filtering
      with: {
        payers: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
        splits: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });

    // Filter: show all group expenses, but only current user's individual expenses
    const filtered = recentExpenses.filter((expense) => {
      if (expense.type === "group") return true;
      // For individual expenses, only show if created by current user
      return expense.createdBy === currentUser.id;
    }).slice(0, limit);

    return filtered.map((expense) => {
      const yourSplit = expense.splits.find((s) => s.userId === currentUser.id);
      const primaryPayer = expense.payers[0];

      // Format date nicely
      const expenseDate = expense.createdAt ? new Date(expense.createdAt) : new Date();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateStr: string;
      if (expenseDate.toDateString() === today.toDateString()) {
        dateStr = `Today, ${expenseDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}`;
      } else if (expenseDate.toDateString() === yesterday.toDateString()) {
        dateStr = `Yesterday, ${expenseDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}`;
      } else {
        dateStr = expenseDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      return {
        id: expense.id,
        title: expense.title,
        totalAmount: parseFloat(expense.totalAmountThb),
        yourShare: yourSplit ? parseFloat(yourSplit.owedAmountThb) : 0,
        paidBy: primaryPayer?.user?.name || "Unknown",
        date: dateStr,
        type: expense.type as "group" | "individual",
      };
    });
  } catch (error) {
    console.error("Error fetching recent expenses:", error);
    return [];
  }
}

export async function deleteExpense(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Delete associated wallet transactions first
    await db.delete(walletTransactions).where(
      and(
        eq(walletTransactions.referenceId, id),
        eq(walletTransactions.referenceType, "expense")
      )
    );

    // Delete the expense (cascades to payers and splits)
    await db.delete(expenses).where(eq(expenses.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: "Failed to delete expense" };
  }
}

export async function getDashboardStats() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  try {
    // Get all expenses with splits
    const allExpenses = await db.query.expenses.findMany({
      with: {
        splits: true,
        payers: true,
      },
    });

    let groupTotal = 0; // Total of all group expenses
    let yourSpend = 0;  // Your share across all expenses

    for (const expense of allExpenses) {
      const expenseTotal = parseFloat(expense.totalAmountThb);

      // Add to group total if it's a group expense
      if (expense.type === "group") {
        groupTotal += expenseTotal;
      }

      // Add your share to your spend
      const yourSplit = expense.splits.find((s) => s.userId === currentUser.id);
      if (yourSplit) {
        yourSpend += parseFloat(yourSplit.owedAmountThb);
      }
    }

    return {
      totalGroupSpend: Math.round(groupTotal),
      totalPersonalSpend: Math.round(yourSpend),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return null;
  }
}

export async function getBalances() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  try {
    // Get all expenses with payers and splits
    const allExpenses = await db.query.expenses.findMany({
      with: {
        payers: true,
        splits: true,
      },
    });

    // Filter to group expenses in memory (avoids DB column issue during migration)
    const groupExpenses = allExpenses.filter((e) => e.type === "group");

    // Calculate net balance per person
    const balanceMap = new Map<string, number>();

    for (const expense of groupExpenses) {
      // What each person paid
      for (const payer of expense.payers) {
        if (!payer.userId) continue;
        const netPaid = parseFloat(payer.cashGiven || "0") - parseFloat(payer.changeTaken || "0");
        const current = balanceMap.get(payer.userId) || 0;
        balanceMap.set(payer.userId, current + netPaid);
      }

      // What each person owes
      for (const split of expense.splits) {
        if (!split.userId) continue;
        const owed = parseFloat(split.owedAmountThb);
        const current = balanceMap.get(split.userId) || 0;
        balanceMap.set(split.userId, current - owed);
      }
    }

    // Get settlements
    const allSettlements = await db.query.settlements.findMany();

    for (const settlement of allSettlements) {
      const amount = parseFloat(settlement.amountThbEquivalent);
      if (settlement.payerId) {
        const current = balanceMap.get(settlement.payerId) || 0;
        balanceMap.set(settlement.payerId, current + amount);
      }
      if (settlement.receiverId) {
        const current = balanceMap.get(settlement.receiverId) || 0;
        balanceMap.set(settlement.receiverId, current - amount);
      }
    }

    // Calculate owed to me and owed by me relative to current user
    const myBalance = balanceMap.get(currentUser.id) || 0;

    // Positive balance means others owe me, negative means I owe others
    let owedToMe = 0;
    let owedByMe = 0;

    if (myBalance > 0) {
      owedToMe = myBalance;
    } else {
      owedByMe = Math.abs(myBalance);
    }

    // Get wallet balance from transactions
    const walletBalance = await getWalletBalance();

    return {
      owedToMe: Math.round(owedToMe),
      owedByMe: Math.round(owedByMe),
      walletBalance: Math.round(walletBalance),
    };
  } catch (error) {
    console.error("Error fetching balances:", error);
    return null;
  }
}
