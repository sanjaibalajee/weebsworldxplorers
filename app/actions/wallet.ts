"use server";

import { db } from "@/app/db/drizzle";
import { walletTopups, walletTransactions } from "@/app/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "./auth";

type CreateTopupInput = {
  amountThb: number;
  exchangeRate: number;
  source?: string;
};

// Get current wallet balance from transactions
async function getCurrentBalance(userId: string): Promise<number> {
  const lastTransaction = await db.query.walletTransactions.findFirst({
    where: eq(walletTransactions.userId, userId),
    orderBy: [desc(walletTransactions.createdAt)],
  });

  return lastTransaction ? parseFloat(lastTransaction.balanceAfter) : 0;
}

export async function createTopup(input: CreateTopupInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Create the topup record
    const [topup] = await db
      .insert(walletTopups)
      .values({
        userId: currentUser.id,
        amountThb: input.amountThb.toString(),
        exchangeRate: input.exchangeRate.toString(),
        source: input.source || null,
      })
      .returning();

    // Get current balance and create transaction
    const currentBalance = await getCurrentBalance(currentUser.id);
    const newBalance = currentBalance + input.amountThb;

    await db.insert(walletTransactions).values({
      userId: currentUser.id,
      type: "topup",
      amountThb: input.amountThb.toString(),
      balanceAfter: newBalance.toString(),
      referenceId: topup.id,
      referenceType: "wallet_topup",
      description: input.source
        ? `Loaded ฿${input.amountThb} (${input.source})`
        : `Loaded ฿${input.amountThb} at rate ₹${input.exchangeRate}/฿`,
    });

    return { success: true, topup };
  } catch (error) {
    console.error("Error creating topup:", error);
    return { success: false, error: "Failed to create topup" };
  }
}

export async function getTopups() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const topups = await db.query.walletTopups.findMany({
      where: eq(walletTopups.userId, currentUser.id),
      orderBy: [desc(walletTopups.createdAt)],
      with: {
        user: {
          columns: { id: true, name: true },
        },
      },
    });

    return topups.map((t) => ({
      id: t.id,
      amountThb: parseFloat(t.amountThb),
      exchangeRate: parseFloat(t.exchangeRate),
      inrAmount: Math.round(parseFloat(t.amountThb) * parseFloat(t.exchangeRate)),
      source: t.source,
      date: t.createdAt?.toISOString() || "",
      user: t.user?.name || "Unknown",
    }));
  } catch (error) {
    console.error("Error fetching topups:", error);
    return [];
  }
}

export async function getWalletBalance() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return 0;
  }

  try {
    // Get balance from last transaction
    const balance = await getCurrentBalance(currentUser.id);
    return Math.round(balance * 100) / 100;
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return 0;
  }
}

export async function hasWalletSetup() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return false;
  }

  try {
    const transactions = await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.userId, currentUser.id),
      limit: 1,
    });

    return transactions.length > 0;
  } catch (error) {
    console.error("Error checking wallet setup:", error);
    return false;
  }
}

// Record expense payment from wallet (for current user only - legacy)
export async function recordExpensePayment(
  expenseId: string,
  amountThb: number,
  expenseTitle: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  return recordExpensePaymentForUser(expenseId, amountThb, expenseTitle, currentUser.id);
}

// Record expense payment for a specific user (used when creating expenses with multiple payers)
export async function recordExpensePaymentForUser(
  expenseId: string,
  amountThb: number,
  expenseTitle: string,
  userId: string
) {
  try {
    const currentBalance = await getCurrentBalance(userId);
    const newBalance = currentBalance - amountThb;

    await db.insert(walletTransactions).values({
      userId: userId,
      type: "expense_paid",
      amountThb: (-amountThb).toString(), // Negative for outflow
      balanceAfter: newBalance.toString(),
      referenceId: expenseId,
      referenceType: "expense",
      description: `Paid for: ${expenseTitle}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Error recording expense payment:", error);
    return { success: false, error: "Failed to record payment" };
  }
}

// Record settlement sent (payer paid someone)
export async function recordSettlementSent(
  settlementId: string,
  amountThb: number,
  payerId: string, // The person who paid (whose wallet to deduct from)
  recipientId: string,
  recipientName: string,
  fromWallet: boolean
) {
  console.log("=== RECORD SETTLEMENT SENT ===");
  console.log("Settlement ID:", settlementId);
  console.log("Amount:", amountThb);
  console.log("Payer ID (deduct from):", payerId);
  console.log("Recipient ID:", recipientId);
  console.log("Recipient name:", recipientName);
  console.log("From wallet:", fromWallet);

  if (!fromWallet) {
    console.log("Skipping - fromWallet is false");
    return { success: true };
  }

  try {
    const currentBalance = await getCurrentBalance(payerId);
    const newBalance = currentBalance - amountThb;

    console.log("Payer current balance:", currentBalance);
    console.log("Payer new balance:", newBalance);

    await db.insert(walletTransactions).values({
      userId: payerId,
      type: "settlement_sent",
      amountThb: (-amountThb).toString(), // Negative for outflow
      balanceAfter: newBalance.toString(),
      referenceId: settlementId,
      referenceType: "settlement",
      description: `Paid ฿${amountThb} to ${recipientName}`,
      counterpartyId: recipientId,
    });

    console.log("Settlement sent recorded successfully");
    return { success: true };
  } catch (error) {
    console.error("Error recording settlement sent:", error);
    return { success: false, error: "Failed to record settlement" };
  }
}

// Record settlement received (receiver got money)
export async function recordSettlementReceived(
  settlementId: string,
  amountThb: number,
  receiverId: string, // The person who received (whose wallet to add to)
  payerId: string,
  payerName: string,
  addToWallet: boolean
) {
  console.log("=== RECORD SETTLEMENT RECEIVED ===");
  console.log("Settlement ID:", settlementId);
  console.log("Amount:", amountThb);
  console.log("Receiver ID (add to):", receiverId);
  console.log("Payer ID:", payerId);
  console.log("Payer name:", payerName);
  console.log("Add to wallet:", addToWallet);

  if (!addToWallet) {
    console.log("Skipping - addToWallet is false");
    return { success: true };
  }

  try {
    const currentBalance = await getCurrentBalance(receiverId);
    const newBalance = currentBalance + amountThb;

    console.log("Receiver current balance:", currentBalance);
    console.log("Receiver new balance:", newBalance);

    await db.insert(walletTransactions).values({
      userId: receiverId,
      type: "settlement_received",
      amountThb: amountThb.toString(), // Positive for inflow
      balanceAfter: newBalance.toString(),
      referenceId: settlementId,
      referenceType: "settlement",
      description: `Received ฿${amountThb} from ${payerName}`,
      counterpartyId: payerId,
    });

    console.log("Settlement received recorded successfully");
    return { success: true };
  } catch (error) {
    console.error("Error recording settlement received:", error);
    return { success: false, error: "Failed to record settlement" };
  }
}

// Get full wallet transaction history (money trail)
export async function getWalletTransactions() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const transactions = await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.userId, currentUser.id),
      orderBy: [desc(walletTransactions.createdAt)],
      with: {
        counterparty: {
          columns: { id: true, name: true },
        },
      },
    });

    return transactions.map((t) => ({
      id: t.id,
      type: t.type as "topup" | "expense_paid" | "settlement_sent" | "settlement_received",
      amount: parseFloat(t.amountThb),
      balanceAfter: parseFloat(t.balanceAfter),
      description: t.description,
      counterparty: t.counterparty?.name || null,
      counterpartyId: t.counterpartyId,
      referenceId: t.referenceId,
      referenceType: t.referenceType,
      date: t.createdAt?.toISOString() || "",
    }));
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return [];
  }
}

export async function getAllTopups() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const topups = await db.query.walletTopups.findMany({
      orderBy: [desc(walletTopups.createdAt)],
      with: {
        user: {
          columns: { id: true, name: true },
        },
      },
    });

    return topups.map((t) => ({
      id: t.id,
      type: "topup" as const,
      title: "Wallet Top-up",
      amount: parseFloat(t.amountThb),
      date: t.createdAt?.toISOString() || "",
      user: t.user?.name || "Unknown",
      exchangeRate: parseFloat(t.exchangeRate),
      inrAmount: Math.round(parseFloat(t.amountThb) * parseFloat(t.exchangeRate)),
    }));
  } catch (error) {
    console.error("Error fetching all topups:", error);
    return [];
  }
}
