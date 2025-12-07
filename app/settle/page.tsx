import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { getDetailedBalances } from "@/app/actions/settlements";
import { getWalletBalance } from "@/app/actions/wallet";
import { SettlePage } from "@/components/settle/settle-page";

export default async function SettleUpPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const [balanceResult, walletBalance] = await Promise.all([
    getDetailedBalances(),
    getWalletBalance(),
  ]);

  const { owedToYou, owedByYou } = balanceResult;

  // Convert to the format expected by SettlePage
  // owedToYou: positive netAmount (they owe you)
  // owedByYou: negative netAmount (you owe them)
  const balances = [
    ...owedToYou.map((p) => ({
      userId: p.userId,
      name: p.name,
      netAmount: p.netAmount, // positive - they owe you
      expenses: p.expenses,
    })),
    ...owedByYou.map((p) => ({
      userId: p.userId,
      name: p.name,
      netAmount: -p.netAmount, // negative - you owe them
      expenses: p.expenses,
    })),
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      <SettlePage
        balances={balances}
        walletBalance={walletBalance}
      />
    </div>
  );
}
