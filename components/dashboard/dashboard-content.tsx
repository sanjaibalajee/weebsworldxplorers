"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import { GlobalStats } from "./global-stats";
import { BalanceCards } from "./balance-cards";
import { QuickActions } from "./quick-actions";
import { ExpenseTimeline } from "./expense-timeline";
import { FloatingActions } from "./floating-actions";
import { WalletSetupModal } from "@/components/wallet/wallet-setup-modal";

type User = {
  id: string;
  name: string;
};

type Stats = {
  totalGroupSpend: number;
  totalPersonalSpend: number;
};

type Balances = {
  owedToMe: number;
  owedByMe: number;
  walletBalance: number;
};

type Expense = {
  id: string;
  title: string;
  totalAmount: number;
  yourShare: number;
  paidBy: string;
  date: string;
};

type DashboardContentProps = {
  user: User;
  stats: Stats;
  balances: Balances;
  recentExpenses: Expense[];
  needsWalletSetup: boolean;
};

export function DashboardContent({
  user,
  stats,
  balances,
  recentExpenses,
  needsWalletSetup,
}: DashboardContentProps) {
  const router = useRouter();
  const [showWalletSetup, setShowWalletSetup] = useState(needsWalletSetup);

  const handleWalletSetupComplete = () => {
    setShowWalletSetup(false);
    router.refresh();
  };

  return (
    <>
      <div className="min-h-screen bg-background px-4 py-6 pb-28 max-w-md mx-auto">
        <DashboardHeader user={user} />

        <GlobalStats
          totalGroupSpend={stats.totalGroupSpend}
          totalPersonalSpend={stats.totalPersonalSpend}
        />

        <BalanceCards
          owedToMe={balances.owedToMe}
          owedByMe={balances.owedByMe}
          walletBalance={balances.walletBalance}
        />

        <QuickActions />

        <ExpenseTimeline expenses={recentExpenses} />

        <FloatingActions />
      </div>

      <WalletSetupModal
        isOpen={showWalletSetup}
        onComplete={handleWalletSetupComplete}
        userName={user.name}
      />
    </>
  );
}
