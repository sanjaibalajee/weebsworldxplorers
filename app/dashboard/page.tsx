import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { getDashboardStats, getBalances, getRecentExpenses } from "@/app/actions/expenses";
import { hasWalletSetup } from "@/app/actions/wallet";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [stats, balances, recentExpenses, walletSetup] = await Promise.all([
    getDashboardStats(),
    getBalances(),
    getRecentExpenses(5),
    hasWalletSetup(),
  ]);

  return (
    <DashboardContent
      user={user}
      stats={{
        totalGroupSpend: stats?.totalGroupSpend || 0,
        totalPersonalSpend: stats?.totalPersonalSpend || 0,
      }}
      balances={{
        owedToMe: balances?.owedToMe || 0,
        owedByMe: balances?.owedByMe || 0,
        walletBalance: balances?.walletBalance || 0,
      }}
      recentExpenses={recentExpenses}
      needsWalletSetup={!walletSetup}
    />
  );
}
