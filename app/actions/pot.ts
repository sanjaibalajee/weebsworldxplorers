"use server";

import { db } from "@/app/db/drizzle";
import { userPots, potTransactions, users, walletTransactions } from "@/app/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "./auth";

// Check if current user is admin
export async function isAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;
  return currentUser.name.toLowerCase() === "admin";
}

// Get pot balance for a specific user
async function getPotBalanceForUser(userId: string): Promise<number> {
  const pot = await db.query.userPots.findFirst({
    where: eq(userPots.userId, userId),
  });
  return pot ? parseFloat(pot.balance || "0") : 0;
}

// Get wallet balance for a specific user (for deducting when loading pot)
async function getWalletBalanceForUser(userId: string): Promise<number> {
  const lastTransaction = await db.query.walletTransactions.findFirst({
    where: eq(walletTransactions.userId, userId),
    orderBy: [desc(walletTransactions.createdAt)],
  });
  return lastTransaction ? parseFloat(lastTransaction.balanceAfter) : 0;
}

// Get all users with their pot balances (for admin)
export async function getAllUsersWithPots() {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const allUsers = await db.query.users.findMany({
      with: {
        pot: true,
      },
    });

    // Filter out admin
    const nonAdminUsers = allUsers.filter(u => u.name.toLowerCase() !== "admin");

    return {
      success: true,
      users: nonAdminUsers.map(u => ({
        id: u.id,
        name: u.name,
        potBalance: u.pot ? parseFloat(u.pot.balance || "0") : 0,
      })),
    };
  } catch (error) {
    console.error("Error fetching users with pots:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

// Load money into a user's pot (admin only)
// This deducts from user's wallet and adds to their pot
export async function loadPot(userId: string, amountThb: number) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Not authorized" };
  }

  if (amountThb <= 0) {
    return { success: false, error: "Amount must be positive" };
  }

  try {
    // Get user's current wallet balance
    const walletBalance = await getWalletBalanceForUser(userId);
    if (walletBalance < amountThb) {
      return { success: false, error: `Insufficient wallet balance. User has ฿${walletBalance}` };
    }

    // Get user's current pot balance
    const currentPotBalance = await getPotBalanceForUser(userId);
    const newPotBalance = currentPotBalance + amountThb;

    // Get user name for description
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    const userName = user?.name || "Unknown";

    // Update or create pot record
    const existingPot = await db.query.userPots.findFirst({
      where: eq(userPots.userId, userId),
    });

    if (existingPot) {
      await db.update(userPots)
        .set({
          balance: newPotBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(userPots.userId, userId));
    } else {
      await db.insert(userPots).values({
        userId,
        balance: newPotBalance.toString(),
      });
    }

    // Record pot transaction (contribution)
    await db.insert(potTransactions).values({
      userId,
      type: "contribution",
      amountThb: amountThb.toString(),
      balanceAfter: newPotBalance.toString(),
      description: `Pot contribution from wallet`,
      createdBy: currentUser.id,
    });

    // Deduct from user's wallet
    const newWalletBalance = walletBalance - amountThb;
    await db.insert(walletTransactions).values({
      userId,
      type: "pot_contribution",
      amountThb: (-amountThb).toString(), // Negative for outflow
      balanceAfter: newWalletBalance.toString(),
      description: `Contributed ฿${amountThb} to group pot`,
    });

    return {
      success: true,
      newPotBalance,
      newWalletBalance,
    };
  } catch (error) {
    console.error("Error loading pot:", error);
    return { success: false, error: "Failed to load pot" };
  }
}

// Get pot balance for current user
export async function getMyPotBalance() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return 0;
  }

  return getPotBalanceForUser(currentUser.id);
}

// Get pot transactions for current user
export async function getMyPotTransactions() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  try {
    const transactions = await db.query.potTransactions.findMany({
      where: eq(potTransactions.userId, currentUser.id),
      orderBy: [desc(potTransactions.createdAt)],
    });

    return transactions.map(t => ({
      id: t.id,
      type: t.type as "contribution" | "expense" | "refund",
      amount: parseFloat(t.amountThb),
      balanceAfter: parseFloat(t.balanceAfter),
      description: t.description,
      date: t.createdAt?.toISOString() || "",
    }));
  } catch (error) {
    console.error("Error fetching pot transactions:", error);
    return [];
  }
}

// Deduct from pot for an expense (called when admin creates pot expense)
export async function deductFromPot(
  userId: string,
  amountThb: number,
  expenseId: string,
  expenseTitle: string,
  adminId: string
) {
  try {
    const currentPotBalance = await getPotBalanceForUser(userId);
    const newPotBalance = currentPotBalance - amountThb;

    // Update pot balance
    await db.update(userPots)
      .set({
        balance: newPotBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(userPots.userId, userId));

    // Record pot transaction
    await db.insert(potTransactions).values({
      userId,
      type: "expense",
      amountThb: (-amountThb).toString(), // Negative for expense
      balanceAfter: newPotBalance.toString(),
      referenceId: expenseId,
      referenceType: "expense",
      description: `Pot expense: ${expenseTitle}`,
      createdBy: adminId,
    });

    return { success: true, newPotBalance };
  } catch (error) {
    console.error("Error deducting from pot:", error);
    return { success: false, error: "Failed to deduct from pot" };
  }
}

// Get all pot balances (for admin dashboard overview)
export async function getAllPotBalances() {
  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Not authorized", total: 0, balances: [] };
  }

  try {
    const allPots = await db.query.userPots.findMany({
      with: {
        user: {
          columns: { id: true, name: true },
        },
      },
    });

    let total = 0;
    const balances = allPots.map(p => {
      const balance = parseFloat(p.balance || "0");
      total += balance;
      return {
        userId: p.userId,
        userName: p.user?.name || "Unknown",
        balance,
      };
    });

    return { success: true, total, balances };
  } catch (error) {
    console.error("Error fetching pot balances:", error);
    return { success: false, error: "Failed to fetch balances", total: 0, balances: [] };
  }
}

// Bulk load pot for all non-admin users (admin only)
// Loads the same amount into each user's pot
export async function bulkLoadPot(amountThbPerPerson: number) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = await isAdmin();
  if (!admin) {
    return { success: false, error: "Not authorized" };
  }

  if (amountThbPerPerson <= 0) {
    return { success: false, error: "Amount must be positive" };
  }

  try {
    // Get all non-admin users
    const allUsers = await db.query.users.findMany();
    const nonAdminUsers = allUsers.filter(u => u.name.toLowerCase() !== "admin");

    const results: { userId: string; name: string; success: boolean; error?: string }[] = [];

    for (const user of nonAdminUsers) {
      // Check wallet balance
      const walletBalance = await getWalletBalanceForUser(user.id);
      if (walletBalance < amountThbPerPerson) {
        results.push({
          userId: user.id,
          name: user.name,
          success: false,
          error: `Insufficient wallet balance (฿${walletBalance})`,
        });
        continue;
      }

      // Get current pot balance
      const currentPotBalance = await getPotBalanceForUser(user.id);
      const newPotBalance = currentPotBalance + amountThbPerPerson;

      // Update or create pot record
      const existingPot = await db.query.userPots.findFirst({
        where: eq(userPots.userId, user.id),
      });

      if (existingPot) {
        await db.update(userPots)
          .set({
            balance: newPotBalance.toString(),
            updatedAt: new Date(),
          })
          .where(eq(userPots.userId, user.id));
      } else {
        await db.insert(userPots).values({
          userId: user.id,
          balance: newPotBalance.toString(),
        });
      }

      // Record pot transaction
      await db.insert(potTransactions).values({
        userId: user.id,
        type: "contribution",
        amountThb: amountThbPerPerson.toString(),
        balanceAfter: newPotBalance.toString(),
        description: `Bulk pot contribution from wallet`,
        createdBy: currentUser.id,
      });

      // Deduct from user's wallet
      const newWalletBalance = walletBalance - amountThbPerPerson;
      await db.insert(walletTransactions).values({
        userId: user.id,
        type: "pot_contribution",
        amountThb: (-amountThbPerPerson).toString(),
        balanceAfter: newWalletBalance.toString(),
        description: `Contributed ฿${amountThbPerPerson} to group pot (bulk load)`,
      });

      results.push({
        userId: user.id,
        name: user.name,
        success: true,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: true,
      message: `Loaded pot for ${successCount} users. ${failCount > 0 ? `${failCount} failed.` : ""}`,
      results,
    };
  } catch (error) {
    console.error("Error bulk loading pots:", error);
    return { success: false, error: "Failed to bulk load pots" };
  }
}
