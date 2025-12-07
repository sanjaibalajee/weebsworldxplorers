"use server";

import { db } from "@/app/db/drizzle";
import { settlements, users, expenses } from "@/app/db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { getCurrentUser } from "./auth";
import { recordSettlementSent, recordSettlementReceived } from "./wallet";

/**
 * SIMPLIFIED SETTLEMENT FLOW:
 *
 * - Only the creditor (person who is owed money) can take action
 * - When they click "Mark as Received", settlement is immediately confirmed
 * - Debtor's wallet is deducted, Creditor's wallet is credited
 * - No pending/confirmation flow needed
 */

type MarkAsReceivedInput = {
  debtorUserId: string;  // The person who owes money (and is paying)
  amountThb: number;
  addToMyWallet: boolean;  // Whether to add to creditor's wallet
};

export async function markAsReceived(input: MarkAsReceivedInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Get debtor's name first for logging
  const debtor = await db.query.users.findFirst({
    where: eq(users.id, input.debtorUserId),
    columns: { name: true },
  });

  const logPrefix = `[${currentUser.name}]`;

  console.log("\n" + "=".repeat(60));
  console.log(`${logPrefix} === MARK AS RECEIVED START ===`);
  console.log(`${logPrefix} I am: ${currentUser.name} (${currentUser.id})`);
  console.log(`${logPrefix} Debtor is: ${debtor?.name} (${input.debtorUserId})`);
  console.log(`${logPrefix} Amount: ฿${input.amountThb}`);
  console.log(`${logPrefix} Add to my wallet: ${input.addToMyWallet}`);
  console.log(`${logPrefix} `);
  console.log(`${logPrefix} MEANING: ${debtor?.name} owes ${currentUser.name} ฿${input.amountThb}`);
  console.log(`${logPrefix}          ${currentUser.name} is marking this as received (${debtor?.name} paid)`);
  console.log("=".repeat(60));

  try {
    // Create the settlement record (immediately confirmed)
    const [settlement] = await db
      .insert(settlements)
      .values({
        payerId: input.debtorUserId,        // The debtor is paying
        receiverId: currentUser.id,          // I (creditor) am receiving
        amountThbEquivalent: input.amountThb.toString(),
        status: "confirmed",                 // Immediately confirmed
        affectsPayerWallet: "true",          // Always deduct from debtor
        affectsReceiverWallet: input.addToMyWallet.toString(),
        confirmedAt: new Date(),
      })
      .returning();

    console.log(`${logPrefix} Settlement CREATED: ${settlement.id}`);
    console.log(`${logPrefix}   payerId (who paid): ${input.debtorUserId} (${debtor?.name})`);
    console.log(`${logPrefix}   receiverId (who received): ${currentUser.id} (${currentUser.name})`);
    console.log(`${logPrefix}   amount: ฿${input.amountThb}`);

    // Deduct from debtor's wallet
    console.log(`${logPrefix} `);
    console.log(`${logPrefix} WALLET: Deducting ฿${input.amountThb} from ${debtor?.name}'s wallet...`);
    await recordSettlementSent(
      settlement.id,
      input.amountThb,
      input.debtorUserId,      // Debtor's wallet
      currentUser.id,
      currentUser.name,
      true                     // Always deduct from debtor
    );

    // Add to my wallet if chosen
    if (input.addToMyWallet) {
      console.log(`${logPrefix} WALLET: Adding ฿${input.amountThb} to ${currentUser.name}'s wallet...`);
      await recordSettlementReceived(
        settlement.id,
        input.amountThb,
        currentUser.id,        // My wallet
        input.debtorUserId,
        debtor?.name || "Unknown",
        true
      );
    }

    console.log(`${logPrefix} `);
    console.log(`${logPrefix} === MARK AS RECEIVED SUCCESS ===`);
    console.log("=".repeat(60) + "\n");
    return { success: true, settlement };
  } catch (error) {
    console.error(`${logPrefix} ERROR:`, error);
    return { success: false, error: "Failed to mark as received" };
  }
}

/**
 * Get detailed balances - simplified version
 *
 * For each person, calculate:
 * - What they owe me from expenses (they're in split, I paid)
 * - What I owe them from expenses (I'm in split, they paid)
 * - Minus any settlements between us
 */
export async function getDetailedBalances() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { owedToYou: [], owedByYou: [] };
  }

  const logPrefix = `[${currentUser.name}]`;

  console.log("\n" + "=".repeat(70));
  console.log(`${logPrefix} === GET DETAILED BALANCES ===`);
  console.log(`${logPrefix} Logged in as: ${currentUser.name} (${currentUser.id})`);
  console.log("=".repeat(70));

  try {
    // Get all users
    const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

    // Get all group expenses with payers and splits
    const groupExpenses = await db.query.expenses.findMany({
      where: eq(expenses.type, "group"),
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

    console.log(`${logPrefix} Group expenses found: ${groupExpenses.length}`);

    // Calculate balance per person from expenses
    // Key: other user ID, Value: amount (positive = they owe me, negative = I owe them)
    const expenseBalances = new Map<string, {
      amount: number;
      expenses: { id: string; title: string; amount: number; date: string; paidBy: string }[]
    }>();

    // Initialize for all users
    for (const user of allUsers) {
      if (user.id !== currentUser.id) {
        expenseBalances.set(user.id, { amount: 0, expenses: [] });
      }
    }

    console.log(`${logPrefix}`);
    console.log(`${logPrefix} --- EXPENSE CALCULATIONS ---`);

    for (const expense of groupExpenses) {
      const totalAmount = parseFloat(expense.totalAmountThb);
      const primaryPayer = expense.payers[0];
      const paidByName = primaryPayer?.user?.name || "Unknown";

      // Calculate net contribution for each person
      // Net = what they paid - what they owe
      // Positive = they overpaid (others owe them)
      // Negative = they underpaid (they owe others)
      const netContributions = new Map<string, number>();

      // First, add all people in splits with their owed amounts
      for (const split of expense.splits) {
        if (!split.userId) continue;
        const owed = parseFloat(split.owedAmountThb);
        netContributions.set(split.userId, -owed); // Start with negative (they owe)
      }

      // Then, add what each payer paid (including payers not in splits)
      for (const payer of expense.payers) {
        if (!payer.userId) continue;
        const paid = parseFloat(payer.cashGiven || "0") - parseFloat(payer.changeTaken || "0");
        const currentNet = netContributions.get(payer.userId) || 0;
        netContributions.set(payer.userId, currentNet + paid); // Add what they paid
      }

      // Check if current user is involved (either in split or as payer)
      const myNet = netContributions.get(currentUser.id) || 0;

      // Log all participants for debugging
      const amInSplit = expense.splits.some(s => s.userId === currentUser.id);
      const amPayer = expense.payers.some(p => p.userId === currentUser.id);
      if (amInSplit || amPayer) {
        console.log(`${logPrefix} Expense: "${expense.title}" - I am ${amPayer ? 'PAYER' : ''}${amPayer && amInSplit ? ' + ' : ''}${amInSplit ? 'IN SPLIT' : ''}`);
        console.log(`${logPrefix}   All participants: ${Array.from(netContributions.entries()).map(([id, net]) => `${userMap.get(id)}=${net.toFixed(0)}`).join(', ')}`);
      }

      if (Math.abs(myNet) < 0.01) continue; // I'm square

      // Calculate total overpaid
      let totalOverpaid = 0;
      for (const [, net] of netContributions) {
        if (net > 0) totalOverpaid += net;
      }

      console.log(`${logPrefix} Expense: "${expense.title}" (paid by ${paidByName})`);
      console.log(`${logPrefix}   My net: ${myNet > 0 ? '+' : ''}${myNet.toFixed(2)} (${myNet > 0 ? 'I overpaid' : 'I underpaid'})`);

      // For each other person in the expense (including payers not in splits)
      for (const [otherUserId, theirNet] of netContributions) {
        if (otherUserId === currentUser.id) continue;

        let balanceChange = 0;

        if (myNet > 0 && theirNet < 0) {
          // I overpaid, they underpaid - they owe me
          if (totalOverpaid > 0) {
            balanceChange = Math.abs(theirNet) * (myNet / totalOverpaid);
          }
        } else if (myNet < 0 && theirNet > 0) {
          // I underpaid, they overpaid - I owe them
          if (totalOverpaid > 0) {
            balanceChange = -(Math.abs(myNet) * (theirNet / totalOverpaid));
          }
        }

        if (Math.abs(balanceChange) >= 0.5) {
          const details = expenseBalances.get(otherUserId);
          if (details) {
            details.amount += balanceChange;
            details.expenses.push({
              id: expense.id,
              title: expense.title,
              amount: Math.round(balanceChange),
              date: expense.expenseDate || "",
              paidBy: paidByName,
            });
            console.log(`${logPrefix}   → ${userMap.get(otherUserId)}: ${balanceChange > 0 ? 'they owe me' : 'I owe them'} ฿${Math.abs(balanceChange).toFixed(2)}`);
          }
        }
      }
    }

    // IMPORTANT: Round expense balances BEFORE applying settlements
    // This ensures that when we settle for ฿60 (the displayed amount),
    // it matches the rounded expense debt of ฿60 (not raw ฿59.50)
    console.log(`${logPrefix}`);
    console.log(`${logPrefix} --- EXPENSE TOTALS (before rounding) ---`);
    for (const [userId, details] of expenseBalances) {
      if (Math.abs(details.amount) >= 0.5) {
        const name = userMap.get(userId);
        const rawAmount = details.amount;
        // Round to nearest integer (same logic used for display)
        const rounded = rawAmount >= 0
          ? Math.floor(rawAmount + 0.5)
          : -Math.floor(Math.abs(rawAmount) + 0.5);

        console.log(`${logPrefix}   ${name}: raw ${rawAmount.toFixed(2)} → rounded ${rounded}`);

        // Update the balance to the rounded value
        details.amount = rounded;
      }
    }

    console.log(`${logPrefix}`);
    console.log(`${logPrefix} --- EXPENSE TOTALS (after rounding, before settlements) ---`);
    for (const [userId, details] of expenseBalances) {
      if (Math.abs(details.amount) >= 1) {
        const name = userMap.get(userId);
        if (details.amount > 0) {
          console.log(`${logPrefix}   ${name} owes me: ฿${details.amount}`);
        } else {
          console.log(`${logPrefix}   I owe ${name}: ฿${Math.abs(details.amount)}`);
        }
      }
    }

    // Get all confirmed settlements between me and others
    const confirmedSettlements = await db.query.settlements.findMany({
      where: and(
        or(
          eq(settlements.payerId, currentUser.id),
          eq(settlements.receiverId, currentUser.id)
        ),
        eq(settlements.status, "confirmed")
      ),
      orderBy: [desc(settlements.createdAt)],
    });

    console.log(`${logPrefix}`);
    console.log(`${logPrefix} --- SETTLEMENTS (${confirmedSettlements.length} found) ---`);

    // Apply settlements to balances
    for (const settlement of confirmedSettlements) {
      const amount = parseFloat(settlement.amountThbEquivalent);
      const otherUserId = settlement.payerId === currentUser.id
        ? settlement.receiverId
        : settlement.payerId;

      if (!otherUserId) continue;

      const details = expenseBalances.get(otherUserId);
      if (!details) continue;

      const otherName = userMap.get(otherUserId);
      const payerName = userMap.get(settlement.payerId || "");
      const receiverName = userMap.get(settlement.receiverId || "");
      const balanceBefore = details.amount;

      if (settlement.receiverId === currentUser.id) {
        // They paid me (I am the receiver)
        details.amount -= amount;
        console.log(`${logPrefix}   Settlement ${settlement.id.slice(0,8)}:`);
        console.log(`${logPrefix}     ${payerName} → ${receiverName} (me): ฿${amount}`);
        console.log(`${logPrefix}     "${otherName} paid me" → balance: ${balanceBefore.toFixed(2)} - ${amount} = ${details.amount.toFixed(2)}`);
      } else {
        // I paid them (I am the payer)
        details.amount += amount;
        console.log(`${logPrefix}   Settlement ${settlement.id.slice(0,8)}:`);
        console.log(`${logPrefix}     ${payerName} (me) → ${receiverName}: ฿${amount}`);
        console.log(`${logPrefix}     "I paid ${otherName}" → balance: ${balanceBefore.toFixed(2)} + ${amount} = ${details.amount.toFixed(2)}`);
      }
    }

    // Build result arrays
    type PersonBalance = {
      userId: string;
      name: string;
      netAmount: number;
      expenses: { id: string; title: string; amount: number; total: number; date: string; paidBy: string }[];
    };

    const owedToYou: PersonBalance[] = [];
    const owedByYou: PersonBalance[] = [];

    for (const [userId, details] of expenseBalances) {
      // Use Math.floor for consistent rounding (always round down the absolute value)
      // This ensures both parties see the same number
      const roundedAmount = details.amount >= 0
        ? Math.floor(details.amount + 0.5)  // Round 59.5 → 60
        : -Math.floor(Math.abs(details.amount) + 0.5);  // Round -59.5 → -60

      if (Math.abs(roundedAmount) < 1) continue;

      console.log(`${logPrefix} Rounding ${userMap.get(userId)}: ${details.amount.toFixed(2)} → ${roundedAmount}`);

      const person: PersonBalance = {
        userId,
        name: userMap.get(userId) || "Unknown",
        netAmount: Math.abs(roundedAmount),
        expenses: details.expenses.map(e => ({
          ...e,
          amount: Math.abs(e.amount),
          total: 0,
        })),
      };

      if (roundedAmount > 0) {
        owedToYou.push(person);
      } else {
        owedByYou.push(person);
      }
    }

    // Sort by amount descending
    owedToYou.sort((a, b) => b.netAmount - a.netAmount);
    owedByYou.sort((a, b) => b.netAmount - a.netAmount);

    console.log(`${logPrefix}`);
    console.log(`${logPrefix} === FINAL BALANCES FOR ${currentUser.name.toUpperCase()} ===`);
    if (owedToYou.length > 0) {
      console.log(`${logPrefix} Owed TO me:`);
      for (const p of owedToYou) {
        console.log(`${logPrefix}   ${p.name} owes me ฿${p.netAmount}`);
      }
    } else {
      console.log(`${logPrefix} Owed TO me: (none)`);
    }
    if (owedByYou.length > 0) {
      console.log(`${logPrefix} Owed BY me:`);
      for (const p of owedByYou) {
        console.log(`${logPrefix}   I owe ${p.name} ฿${p.netAmount}`);
      }
    } else {
      console.log(`${logPrefix} Owed BY me: (none)`);
    }
    console.log("=".repeat(70) + "\n");

    return { owedToYou, owedByYou };
  } catch (error) {
    console.error(`${logPrefix} ERROR:`, error);
    return { owedToYou: [], owedByYou: [] };
  }
}

// Keep getSettlements for history if needed
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
