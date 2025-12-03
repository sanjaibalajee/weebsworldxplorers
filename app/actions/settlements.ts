"use server";

import { db } from "@/app/db/drizzle";
import { settlements, expenses, expensePayers, expenseSplits, users, settlementExpenses } from "@/app/db/schema";
import { eq, desc, or, and, inArray } from "drizzle-orm";
import { getCurrentUser } from "./auth";

const EXCHANGE_RATE = 2.4; // 1 THB ≈ 2.4 INR

type ExpenseSettlement = {
  expenseId: string;
  amount: number;
};

type CreateSettlementInput = {
  otherUserId: string;
  amountThb: number;
  amountInr?: number;
  type: "pay" | "receive"; // "pay" = I'm paying them, "receive" = they're paying me
  affectsWallet: boolean;
  expenses: ExpenseSettlement[]; // Which expenses are being settled
};

export async function createSettlement(input: CreateSettlementInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  console.log("=== CREATE SETTLEMENT START ===");
  console.log("Current user:", currentUser.id, currentUser.name);
  console.log("Input:", JSON.stringify(input, null, 2));

  try {
    // Determine payer and receiver based on settlement type
    const payerId = input.type === "pay" ? currentUser.id : input.otherUserId;
    const receiverId = input.type === "pay" ? input.otherUserId : currentUser.id;

    console.log("Settlement type:", input.type);
    console.log("Payer ID:", payerId);
    console.log("Receiver ID:", receiverId);

    // Store wallet preferences
    const affectsPayerWallet = input.type === "pay" ? input.affectsWallet.toString() : "true";
    const affectsReceiverWallet = input.type === "receive" ? input.affectsWallet.toString() : "true";

    console.log("Affects payer wallet:", affectsPayerWallet);
    console.log("Affects receiver wallet:", affectsReceiverWallet);

    // If type is "receive", the current user IS the receiver confirming receipt
    // So we can confirm immediately. Only "pay" needs confirmation from the other party.
    const isPendingConfirmation = input.type === "pay";
    console.log("Is pending confirmation:", isPendingConfirmation);

    const [settlement] = await db
      .insert(settlements)
      .values({
        payerId,
        receiverId,
        amountThbEquivalent: input.amountThb.toString(),
        amountInrPaid: input.amountInr?.toString() || null,
        status: isPendingConfirmation ? "pending" : "confirmed",
        affectsPayerWallet,
        affectsReceiverWallet,
        confirmedAt: isPendingConfirmation ? null : new Date(),
      })
      .returning();

    // Link settlement to specific expenses
    if (input.expenses && input.expenses.length > 0) {
      await db.insert(settlementExpenses).values(
        input.expenses.map((exp) => ({
          settlementId: settlement.id,
          expenseId: exp.expenseId,
          amountThb: exp.amount.toString(),
        }))
      );
    }

    // If confirmed immediately (type === "receive"), record wallet transaction for receiver
    if (!isPendingConfirmation && input.affectsWallet) {
      console.log("Recording immediate settlement (type=receive)...");
      const { recordSettlementReceived } = await import("./wallet");

      // Get payer's name
      const payer = await db.query.users.findFirst({
        where: eq(users.id, payerId),
        columns: { name: true },
      });

      console.log("Recording settlement received for receiver:", receiverId);
      // Record for receiver (current user) - they received money
      const result = await recordSettlementReceived(
        settlement.id,
        input.amountThb,
        receiverId, // receiver's wallet (current user)
        payerId,
        payer?.name || "Unknown",
        true
      );
      console.log("Settlement received result:", result);
    }

    console.log("=== CREATE SETTLEMENT SUCCESS ===");
    return { success: true, settlement };
  } catch (error) {
    console.error("Error creating settlement:", error);
    return { success: false, error: "Failed to create settlement" };
  }
}

// Confirm a pending settlement (called by receiver)
export async function confirmSettlement(settlementId: string, affectsMyWallet: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  console.log("=== CONFIRM SETTLEMENT START ===");
  console.log("Settlement ID:", settlementId);
  console.log("Current user (confirming):", currentUser.id, currentUser.name);
  console.log("Affects my wallet:", affectsMyWallet);

  try {
    // Get the settlement
    const settlement = await db.query.settlements.findFirst({
      where: eq(settlements.id, settlementId),
      with: {
        payer: { columns: { id: true, name: true } },
        receiver: { columns: { id: true, name: true } },
      },
    });

    if (!settlement) {
      console.log("ERROR: Settlement not found");
      return { success: false, error: "Settlement not found" };
    }

    console.log("Settlement found:", {
      id: settlement.id,
      payerId: settlement.payerId,
      payerName: settlement.payer?.name,
      receiverId: settlement.receiverId,
      receiverName: settlement.receiver?.name,
      amount: settlement.amountThbEquivalent,
      status: settlement.status,
      affectsPayerWallet: settlement.affectsPayerWallet,
      affectsReceiverWallet: settlement.affectsReceiverWallet,
    });

    // Only the receiver can confirm
    if (settlement.receiverId !== currentUser.id) {
      console.log("ERROR: Current user is not the receiver");
      return { success: false, error: "Only the receiver can confirm this settlement" };
    }

    if (settlement.status !== "pending") {
      console.log("ERROR: Settlement is not pending, status:", settlement.status);
      return { success: false, error: `Settlement is not pending (current status: ${settlement.status})` };
    }

    const amount = parseFloat(settlement.amountThbEquivalent);
    const payerWallet = settlement.affectsPayerWallet === "true";
    const receiverWallet = affectsMyWallet;

    console.log("Amount:", amount);
    console.log("Payer wallet affected:", payerWallet);
    console.log("Receiver wallet affected:", receiverWallet);

    // Import wallet functions
    const { recordSettlementSent, recordSettlementReceived } = await import("./wallet");

    // Record wallet transactions
    // Payer's wallet: deduct the amount they paid
    if (payerWallet && settlement.payerId) {
      console.log("Recording settlement SENT for payer:", settlement.payerId);
      const sentResult = await recordSettlementSent(
        settlement.id,
        amount,
        settlement.payerId, // payer's wallet
        settlement.receiverId!,
        settlement.receiver?.name || "Unknown",
        true
      );
      console.log("Settlement sent result:", sentResult);
    } else {
      console.log("Skipping payer wallet (payerWallet:", payerWallet, ", payerId:", settlement.payerId, ")");
    }

    // Receiver's wallet: add the amount they received
    if (receiverWallet && settlement.receiverId) {
      console.log("Recording settlement RECEIVED for receiver:", settlement.receiverId);
      const receivedResult = await recordSettlementReceived(
        settlement.id,
        amount,
        settlement.receiverId, // receiver's wallet
        settlement.payerId!,
        settlement.payer?.name || "Unknown",
        true
      );
      console.log("Settlement received result:", receivedResult);
    } else {
      console.log("Skipping receiver wallet (receiverWallet:", receiverWallet, ", receiverId:", settlement.receiverId, ")");
    }

    // Update settlement status
    console.log("Updating settlement status to confirmed...");
    await db
      .update(settlements)
      .set({
        status: "confirmed",
        affectsReceiverWallet: affectsMyWallet.toString(),
        confirmedAt: new Date(),
      })
      .where(eq(settlements.id, settlementId));

    console.log("=== CONFIRM SETTLEMENT SUCCESS ===");
    return { success: true };
  } catch (error) {
    console.error("Error confirming settlement:", error);
    return { success: false, error: "Failed to confirm settlement" };
  }
}

// Reject a pending settlement (called by receiver)
export async function rejectSettlement(settlementId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const settlement = await db.query.settlements.findFirst({
      where: eq(settlements.id, settlementId),
    });

    if (!settlement) {
      return { success: false, error: "Settlement not found" };
    }

    // Only the receiver can reject
    if (settlement.receiverId !== currentUser.id) {
      return { success: false, error: "Only the receiver can reject this settlement" };
    }

    if (settlement.status !== "pending") {
      return { success: false, error: "Settlement is not pending" };
    }

    // Delete the settlement
    await db.delete(settlements).where(eq(settlements.id, settlementId));

    return { success: true };
  } catch (error) {
    console.error("Error rejecting settlement:", error);
    return { success: false, error: "Failed to reject settlement" };
  }
}

// Get pending settlements for current user (as receiver - needs confirmation)
export async function getPendingSettlements() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const pending = await db.query.settlements.findMany({
      where: and(
        eq(settlements.receiverId, currentUser.id),
        eq(settlements.status, "pending")
      ),
      orderBy: [desc(settlements.createdAt)],
      with: {
        payer: { columns: { id: true, name: true } },
        receiver: { columns: { id: true, name: true } },
      },
    });

    console.log("getPendingSettlements found:", pending.length, "settlements for user", currentUser.id);
    pending.forEach(s => console.log("  - Settlement", s.id, "status:", s.status));

    return pending.map((s) => ({
      id: s.id,
      amount: parseFloat(s.amountThbEquivalent),
      amountInr: s.amountInrPaid ? parseFloat(s.amountInrPaid) : null,
      payerId: s.payerId,
      payerName: s.payer?.name || "Unknown",
      receiverId: s.receiverId,
      receiverName: s.receiver?.name || "Unknown",
      date: s.createdAt?.toISOString() || "",
    }));
  } catch (error) {
    console.error("Error fetching pending settlements:", error);
    return [];
  }
}

// Get outgoing pending settlements (current user is payer, waiting for receiver to confirm)
export async function getOutgoingPendingSettlements() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const pending = await db.query.settlements.findMany({
      where: and(
        eq(settlements.payerId, currentUser.id),
        eq(settlements.status, "pending")
      ),
      orderBy: [desc(settlements.createdAt)],
      with: {
        payer: { columns: { id: true, name: true } },
        receiver: { columns: { id: true, name: true } },
      },
    });

    return pending.map((s) => ({
      id: s.id,
      amount: parseFloat(s.amountThbEquivalent),
      amountInr: s.amountInrPaid ? parseFloat(s.amountInrPaid) : null,
      payerId: s.payerId,
      payerName: s.payer?.name || "Unknown",
      receiverId: s.receiverId,
      receiverName: s.receiver?.name || "Unknown",
      date: s.createdAt?.toISOString() || "",
    }));
  } catch (error) {
    console.error("Error fetching outgoing pending settlements:", error);
    return [];
  }
}

export async function getSettlements() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const allSettlements = await db.query.settlements.findMany({
      where: or(
        eq(settlements.payerId, currentUser.id),
        eq(settlements.receiverId, currentUser.id)
      ),
      orderBy: [desc(settlements.createdAt)],
      with: {
        payer: {
          columns: { id: true, name: true },
        },
        receiver: {
          columns: { id: true, name: true },
        },
      },
    });

    return allSettlements.map((s) => ({
      id: s.id,
      amount: parseFloat(s.amountThbEquivalent),
      amountInr: s.amountInrPaid ? parseFloat(s.amountInrPaid) : null,
      from: s.payer?.name || "Unknown",
      fromId: s.payerId,
      to: s.receiver?.name || "Unknown",
      toId: s.receiverId,
      date: s.createdAt?.toISOString() || "",
    }));
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return [];
  }
}

type PersonBalance = {
  userId: string;
  name: string;
  netAmount: number;
  expenses: {
    id: string;
    title: string;
    amount: number;
    total: number;
    date: string;
    paidBy: string;
  }[];
};

export async function getDetailedBalances() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { owedToYou: [], owedByYou: [] };
  }

  console.log("=== GET DETAILED BALANCES ===");
  console.log("Current user:", currentUser.id, currentUser.name);

  try {
    // Get all users
    const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

    // Get all CONFIRMED settlements involving current user with their linked expenses
    const confirmedSettlements = await db.query.settlements.findMany({
      where: and(
        or(
          eq(settlements.payerId, currentUser.id),
          eq(settlements.receiverId, currentUser.id)
        ),
        eq(settlements.status, "confirmed")
      ),
      with: {
        settlementExpenses: true,
      },
    });

    console.log("Confirmed settlements found:", confirmedSettlements.length);
    for (const s of confirmedSettlements) {
      console.log("  Settlement:", s.id);
      console.log("    Payer:", s.payerId, "-> Receiver:", s.receiverId);
      console.log("    Amount:", s.amountThbEquivalent);
      console.log("    Linked expenses:", s.settlementExpenses?.length || 0);
      if (s.settlementExpenses) {
        for (const se of s.settlementExpenses) {
          console.log("      - Expense:", se.expenseId, "Amount:", se.amountThb);
        }
      }
    }

    // Build a set of settled expense IDs per person
    // Key: `${expenseId}-${otherUserId}`, Value: amount settled
    const settledExpenseAmounts = new Map<string, number>();

    for (const settlement of confirmedSettlements) {
      const otherUserId = settlement.payerId === currentUser.id
        ? settlement.receiverId
        : settlement.payerId;

      if (!otherUserId) continue;

      // If settlement has linked expenses, track them specifically
      if (settlement.settlementExpenses && settlement.settlementExpenses.length > 0) {
        for (const se of settlement.settlementExpenses) {
          const key = `${se.expenseId}-${otherUserId}`;
          const current = settledExpenseAmounts.get(key) || 0;
          settledExpenseAmounts.set(key, current + parseFloat(se.amountThb));
        }
      }
    }

    console.log("Settled expense amounts map:");
    for (const [key, amount] of settledExpenseAmounts) {
      console.log("  ", key, "=", amount);
    }

    // Get all group expenses with payers and splits
    const groupExpenses = await db.query.expenses.findMany({
      with: {
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

    // Filter to only group expenses (exclude pot and individual - they don't create owe relationships)
    const filteredExpenses = groupExpenses.filter((e) => e.type === "group");
    console.log("Group expenses found (excluding pot/individual):", filteredExpenses.length);

    // Track balance and expense details per person relative to current user
    const balanceDetails = new Map<
      string,
      {
        netAmount: number;
        expenses: {
          id: string;
          title: string;
          amount: number;
          total: number;
          date: string;
          paidBy: string;
          isSettled: boolean;
        }[];
      }
    >();

    // Initialize for all users except current
    for (const user of allUsers) {
      if (user.id !== currentUser.id) {
        balanceDetails.set(user.id, { netAmount: 0, expenses: [] });
      }
    }

    // Process each expense
    for (const expense of filteredExpenses) {
      const primaryPayer = expense.payers[0];
      const paidByName = primaryPayer?.user?.name || "Unknown";
      const totalAmount = parseFloat(expense.totalAmountThb);

      console.log("\nProcessing expense:", expense.id, expense.title);
      console.log("  Total:", totalAmount, "Paid by:", paidByName);

      // Calculate net contribution for each person in this expense
      const netContributions = new Map<string, number>();

      for (const split of expense.splits) {
        if (!split.userId) continue;
        const payer = expense.payers.find((p) => p.userId === split.userId);
        const paid = payer
          ? parseFloat(payer.cashGiven || "0") - parseFloat(payer.changeTaken || "0")
          : 0;
        const owed = parseFloat(split.owedAmountThb);
        netContributions.set(split.userId, paid - owed);
        console.log("  User:", split.userId, userMap.get(split.userId), "paid:", paid, "owed:", owed, "net:", paid - owed);
      }

      // Get my net contribution
      const myNet = netContributions.get(currentUser.id) || 0;
      console.log("  My net contribution:", myNet);
      if (Math.abs(myNet) < 0.01) {
        console.log("  Skipping - I'm square for this expense");
        continue;
      }

      // Calculate total overpaid for proportional distribution
      let totalOverpaid = 0;
      for (const [, net] of netContributions) {
        if (net > 0) totalOverpaid += net;
      }

      // For each other person, calculate what they owe me (or I owe them)
      for (const split of expense.splits) {
        if (!split.userId || split.userId === currentUser.id) continue;

        const theirNet = netContributions.get(split.userId) || 0;
        let balanceChange = 0;

        if (myNet > 0 && theirNet < 0) {
          if (totalOverpaid > 0) {
            balanceChange = Math.abs(theirNet) * (myNet / totalOverpaid);
          }
        } else if (myNet < 0 && theirNet > 0) {
          if (totalOverpaid > 0) {
            balanceChange = -(Math.abs(myNet) * (theirNet / totalOverpaid));
          }
        }

        if (Math.abs(balanceChange) >= 0.5) {
          const details = balanceDetails.get(split.userId)!;

          // Check if this expense has been settled with this person
          const settledKey = `${expense.id}-${split.userId}`;
          const settledAmount = settledExpenseAmounts.get(settledKey) || 0;

          // Calculate remaining amount correctly:
          // - If balanceChange > 0 (they owe me), subtract settled amount
          // - If balanceChange < 0 (I owe them), add settled amount (reduces my debt)
          const roundedBalance = Math.round(balanceChange);
          const remainingAmount = balanceChange > 0
            ? roundedBalance - settledAmount  // they owe me, subtract what they paid
            : roundedBalance + settledAmount; // I owe them, add what I paid (reduces debt)
          const isFullySettled = Math.abs(remainingAmount) < 1;

          console.log("  With user:", split.userId, userMap.get(split.userId));
          console.log("    Balance change:", balanceChange, "(", balanceChange > 0 ? "they owe me" : "I owe them", ")");
          console.log("    Settled key:", settledKey);
          console.log("    Settled amount:", settledAmount);
          console.log("    Remaining amount:", remainingAmount);
          console.log("    Is fully settled:", isFullySettled);

          // Add to net amount (unsettled portion only)
          if (!isFullySettled) {
            details.netAmount += remainingAmount;
            details.expenses.push({
              id: expense.id,
              title: expense.title,
              amount: remainingAmount,
              total: totalAmount,
              date: expense.expenseDate || "",
              paidBy: paidByName,
              isSettled: false,
            });
            console.log("    -> Added to unsettled expenses");
          } else {
            console.log("    -> Expense is fully settled, not adding");
          }
        }
      }
    }

    // Separate into owed to you vs owed by you
    const owedToYou: PersonBalance[] = [];
    const owedByYou: PersonBalance[] = [];

    for (const [userId, details] of balanceDetails) {
      if (Math.abs(details.netAmount) < 1) continue;

      // Only show unsettled expenses
      const unsettledExpenses = details.expenses.filter(e => !e.isSettled);

      const person: PersonBalance = {
        userId,
        name: userMap.get(userId) || "Unknown",
        netAmount: Math.round(Math.abs(details.netAmount)),
        expenses: unsettledExpenses.map(e => ({
          id: e.id,
          title: e.title,
          amount: Math.abs(e.amount),
          total: e.total,
          date: e.date,
          paidBy: e.paidBy,
        })),
      };

      if (details.netAmount > 0) {
        owedToYou.push(person);
      } else {
        owedByYou.push(person);
      }
    }

    // Sort by amount descending
    owedToYou.sort((a, b) => b.netAmount - a.netAmount);
    owedByYou.sort((a, b) => b.netAmount - a.netAmount);

    console.log("\n=== FINAL BALANCES ===");
    console.log("Owed TO you:");
    for (const p of owedToYou) {
      console.log("  ", p.name, "owes you", p.netAmount);
      for (const e of p.expenses) {
        console.log("    - Expense:", e.id, e.title, "Amount:", e.amount);
      }
    }
    console.log("Owed BY you:");
    for (const p of owedByYou) {
      console.log("  You owe", p.name, p.netAmount);
      for (const e of p.expenses) {
        console.log("    - Expense:", e.id, e.title, "Amount:", e.amount);
      }
    }
    console.log("=== END DETAILED BALANCES ===\n");

    return { owedToYou, owedByYou };
  } catch (error) {
    console.error("Error fetching detailed balances:", error);
    return { owedToYou: [], owedByYou: [] };
  }
}
