import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { getWalletBalance, getWalletTransactions } from "@/app/actions/wallet";
import { WalletDetail } from "@/components/wallet/wallet-detail";

export default async function WalletPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const [balance, transactions] = await Promise.all([
    getWalletBalance(),
    getWalletTransactions(),
  ]);

  // Calculate totals from transactions (single source of truth)
  const totalTopups = transactions
    .filter((t) => t.type === "topup")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.type === "expense_paid" || t.type === "settlement_sent")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceived = transactions
    .filter((t) => t.type === "settlement_received")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      <WalletDetail
        balance={balance}
        transactions={transactions}
        totalTopups={totalTopups}
        totalSpent={totalSpent}
        totalReceived={totalReceived}
      />
    </div>
  );
}
