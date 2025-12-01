"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
} from "lucide-react";
import { createTopup } from "@/app/actions/wallet";

type Transaction = {
  id: string;
  type: "topup" | "expense_paid" | "settlement_sent" | "settlement_received";
  amount: number;
  balanceAfter: number;
  description: string | null;
  counterparty: string | null;
  counterpartyId: string | null;
  referenceId: string | null;
  referenceType: string | null;
  date: string;
};

type WalletDetailProps = {
  balance: number;
  transactions: Transaction[];
  totalTopups: number;
  totalSpent: number;
  totalReceived: number;
};

const transactionConfig = {
  topup: {
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    label: "Loaded",
    sign: "+",
  },
  expense_paid: {
    icon: Receipt,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    label: "Expense",
    sign: "",
  },
  settlement_sent: {
    icon: ArrowUpRight,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
    label: "Paid",
    sign: "",
  },
  settlement_received: {
    icon: ArrowDownLeft,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    label: "Received",
    sign: "+",
  },
};

export function WalletDetail({
  balance,
  transactions,
  totalTopups,
  totalSpent,
  totalReceived,
}: WalletDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number | "">("");
  const [exchangeRate, setExchangeRate] = useState<number | "">(2.4);

  const handleAddTopup = () => {
    if (!topupAmount || !exchangeRate) return;

    startTransition(async () => {
      const result = await createTopup({
        amountThb: Number(topupAmount),
        exchangeRate: Number(exchangeRate),
      });

      if (result.success) {
        setShowTopupModal(false);
        setTopupAmount("");
        router.refresh();
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce(
    (groups, transaction) => {
      const date = new Date(transaction.date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {} as Record<string, Transaction[]>
  );

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
          <h1 className="text-xl font-bold">My Wallet</h1>
          <p className="text-sm text-muted-foreground">Complete money trail</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 opacity-80">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium">Current Balance</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1 bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={() => setShowTopupModal(true)}
          >
            <Plus className="w-4 h-4" />
            Top Up
          </Button>
        </div>
        <p className="text-4xl font-bold">฿{balance.toLocaleString()}</p>
        <p className="text-sm opacity-70 mt-1">
          ≈ ₹{Math.round(balance * 2.4).toLocaleString()}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-muted-foreground">Loaded</p>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
            ฿{totalTopups.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <TrendingDown className="w-4 h-4 mx-auto mb-1 text-red-600 dark:text-red-400" />
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-sm font-bold text-red-600 dark:text-red-400">
            ฿{totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <Users className="w-4 h-4 mx-auto mb-1 text-green-600 dark:text-green-400" />
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">
            ฿{totalReceived.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Transaction History
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your money trail will appear here
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                {date}
              </p>
              <div className="space-y-2">
                {dayTransactions.map((transaction) => {
                  const config = transactionConfig[transaction.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={transaction.id}
                      className="bg-card border rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}
                        >
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {transaction.description || config.label}
                              </p>
                              {transaction.counterparty && (
                                <p className="text-xs text-muted-foreground">
                                  {transaction.type === "settlement_sent"
                                    ? `To: ${transaction.counterparty}`
                                    : `From: ${transaction.counterparty}`}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p
                                className={`font-bold ${
                                  transaction.amount >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {config.sign}฿
                                {Math.abs(transaction.amount).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Balance: ฿{transaction.balanceAfter.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTopupModal(false)}
          />
          <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300">
            <button
              onClick={() => setShowTopupModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-purple-500/10 mx-auto mb-3 flex items-center justify-center">
                <Plus className="w-7 h-7 text-purple-500" />
              </div>
              <h2 className="text-lg font-bold">Add Top-up</h2>
              <p className="text-sm text-muted-foreground">
                Record a new currency exchange
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Amount in THB
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ฿
                  </span>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) =>
                      setTopupAmount(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="1000"
                    className="w-full h-12 pl-8 pr-4 rounded-lg border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Exchange Rate (INR per THB)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ₹/฿
                  </span>
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) =>
                      setExchangeRate(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="2.4"
                    step="0.01"
                    className="w-full h-12 pl-12 pr-4 rounded-lg border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {topupAmount && exchangeRate && (
                <div className="bg-purple-500/10 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    INR Equivalent
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ₹{Math.round(Number(topupAmount) * Number(exchangeRate)).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <Button
              className="w-full h-12 text-base mt-6 gap-2"
              disabled={!topupAmount || !exchangeRate || isPending}
              onClick={handleAddTopup}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add Top-up
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
