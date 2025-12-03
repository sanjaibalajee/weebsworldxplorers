"use client";

import { useRouter } from "next/navigation";

type BalanceCardsProps = {
  owedToMe: number;
  owedByMe: number;
  walletBalance: number;
  potBalance: number;
};

export function BalanceCards({ owedToMe, owedByMe, walletBalance, potBalance }: BalanceCardsProps) {
  const router = useRouter();

  return (
    <div className="space-y-2 mb-6">
      {/* Top row - 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center cursor-pointer hover:bg-green-500/20 transition-colors"
          onClick={() => router.push("/settle")}
        >
          <p className="text-[10px] text-muted-foreground mb-1">Owed to me</p>
          <p className="text-base font-bold text-green-600 dark:text-green-400">
            ฿{owedToMe.toLocaleString()}
          </p>
        </div>
        <div
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center cursor-pointer hover:bg-red-500/20 transition-colors"
          onClick={() => router.push("/settle")}
        >
          <p className="text-[10px] text-muted-foreground mb-1">Owed by me</p>
          <p className="text-base font-bold text-red-600 dark:text-red-400">
            ฿{owedByMe.toLocaleString()}
          </p>
        </div>
        <div
          className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center cursor-pointer hover:bg-blue-500/20 transition-colors"
          onClick={() => router.push("/wallet")}
        >
          <p className="text-[10px] text-muted-foreground mb-1">My Wallet</p>
          <p className="text-base font-bold text-blue-600 dark:text-blue-400">
            ฿{walletBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Pot balance - full width */}
      {potBalance > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Group Pot</p>
            <p className="text-xs text-muted-foreground">Pre-paid for expenses</p>
          </div>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            ฿{potBalance.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
