"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, User, Receipt, HandCoins, Wallet } from "lucide-react";

type ExpenseTransaction = {
  id: string;
  type: "expense";
  title: string;
  amount: number;
  date: string;
  paidBy: string;
  splitBetween: number;
  yourShare: number;
};

type SettlementTransaction = {
  id: string;
  type: "settlement";
  title: string;
  amount: number;
  date: string;
  from: string;
  to: string;
};

type TopupTransaction = {
  id: string;
  type: "topup";
  title: string;
  amount: number;
  date: string;
  user: string;
  exchangeRate: number;
  inrAmount: number;
};

type Transaction = ExpenseTransaction | SettlementTransaction | TopupTransaction;

type HistoryPageProps = {
  groupTransactions: Transaction[];
  individualTransactions: Transaction[];
};

export function HistoryPage({ groupTransactions, individualTransactions }: HistoryPageProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"group" | "individual">("group");

  const transactions = viewMode === "group" ? groupTransactions : individualTransactions;

  // Group transactions by date
  const groupedByDate = transactions.reduce((acc, tx) => {
    const date = new Date(tx.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const totalSpend = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + (tx as ExpenseTransaction).yourShare, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Transaction History</h1>
          <p className="text-sm text-muted-foreground">
            All your expenses & settlements
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-muted rounded-xl p-1">
        <button
          onClick={() => setViewMode("group")}
          className={`flex-1 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
            viewMode === "group"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Group
        </button>
        <button
          onClick={() => setViewMode("individual")}
          className={`flex-1 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
            viewMode === "individual"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-4 h-4" />
          Individual
        </button>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground">
              {viewMode === "group" ? "Your Group Spend" : "Your Personal Spend"}
            </p>
            <p className="text-2xl font-bold">฿{totalSpend.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-semibold">{transactions.length}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, txs]) => (
          <div key={date}>
            <p className="text-xs font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
              {date}
            </p>
            <div className="space-y-2">
              {txs.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onClick={() => {
                    if (tx.type === "expense") {
                      router.push(`/expense/${tx.id}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {viewMode === "group"
                ? "Group expenses will appear here"
                : "Personal expenses will appear here"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionCard({
  transaction,
  onClick,
}: {
  transaction: Transaction;
  onClick: () => void;
}) {
  const time = new Date(transaction.date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (transaction.type === "expense") {
    const tx = transaction as ExpenseTransaction;
    return (
      <button
        onClick={onClick}
        className="w-full bg-card border rounded-xl p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{tx.title}</p>
                <p className="text-xs text-muted-foreground">
                  Paid by {tx.paidBy} • Split {tx.splitBetween}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">฿{tx.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  You: ฿{tx.yourShare.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{time}</p>
          </div>
        </div>
      </button>
    );
  }

  if (transaction.type === "settlement") {
    const tx = transaction as SettlementTransaction;
    return (
      <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <HandCoins className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">Settlement</p>
                <p className="text-xs text-muted-foreground">
                  {tx.from} → {tx.to}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ฿{tx.amount.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{time}</p>
          </div>
        </div>
      </div>
    );
  }

  if (transaction.type === "topup") {
    const tx = transaction as TopupTransaction;
    return (
      <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">Wallet Top-up</p>
                <p className="text-xs text-muted-foreground">
                  {tx.user} • Rate: ₹{tx.exchangeRate}/฿
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  +฿{tx.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  ₹{tx.inrAmount.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{time}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
