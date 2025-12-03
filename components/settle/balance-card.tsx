"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

type Expense = {
  id: string;
  title: string;
  amount: number;
  total: number;
  date: string;
  paidBy: string;
};

type PersonBalance = {
  userId: string;
  name: string;
  netAmount: number;
  expenses: Expense[];
};

type BalanceCardProps = {
  person: PersonBalance;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSettle: () => void;
  onExpenseClick: (expenseId: string) => void;
};

export function BalanceCard({
  person,
  isExpanded,
  onToggleExpand,
  onSettle,
  onExpenseClick,
}: BalanceCardProps) {
  const owesYou = person.netAmount > 0;
  const amount = Math.abs(person.netAmount);
  const inrEquivalent = Math.round(amount * 2.4);

  return (
    <div
      className={`rounded-xl border transition-colors overflow-hidden ${
        owesYou
          ? "bg-green-500/5 border-green-500/10"
          : "bg-red-500/5 border-red-500/10"
      }`}
    >
      {/* Main Row - Clickable to expand */}
      <button
        onClick={onToggleExpand}
        className={`w-full p-4 flex items-center justify-between transition-colors ${
          owesYou ? "hover:bg-green-500/10" : "hover:bg-red-500/10"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              owesYou
                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                : "bg-red-500/20 text-red-600 dark:text-red-400"
            }`}
          >
            {person.name.charAt(0)}
          </div>

          {/* Info */}
          <div className="text-left">
            <p className="font-medium text-sm">{person.name}</p>
            <p className="text-xs text-muted-foreground">
              {owesYou ? "owes you" : "you owe"} • ≈ ₹{inrEquivalent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Amount & Expand Icon */}
        <div className="flex items-center gap-2">
          <p
            className={`text-lg font-bold ${
              owesYou
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {owesYou ? "+" : "-"}฿{amount.toLocaleString()}
          </p>
          {person.expenses.length > 0 && (
            isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )
          )}
        </div>
      </button>

      {/* Expanded Content - Expense Breakdown */}
      {isExpanded && person.expenses.length > 0 && (
        <div className="border-t border-dashed px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Unsettled expenses</p>

          <div className="space-y-1">
            {person.expenses.map((expense) => {
              const displayAmount = Math.abs(expense.amount);
              // For "owedByYou" cards: positive = increases debt, negative = reduces debt
              // For "owedToYou" cards: all amounts are positive (they owe you)
              const isReducingDebt = !owesYou && expense.amount < 0;
              return (
                <button
                  key={expense.id}
                  onClick={() => onExpenseClick(expense.id)}
                  className="w-full flex items-center justify-between py-2.5 px-3 bg-background/50 hover:bg-background rounded-lg transition-colors group"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{expense.title}</p>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {expense.date} • Paid by {expense.paidBy}
                      {isReducingDebt && " • reduces debt"}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ml-3 ${
                      isReducingDebt
                        ? "text-green-600 dark:text-green-400"
                        : owesYou
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isReducingDebt ? "+" : owesYou ? "+" : "-"}฿{displayAmount.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Action Button */}
          <Button
            size="sm"
            variant={owesYou ? "default" : "destructive"}
            onClick={(e) => {
              e.stopPropagation();
              onSettle();
            }}
            className="w-full h-10 text-sm gap-1.5"
          >
            {owesYou ? (
              <>
                <ArrowDownLeft className="w-4 h-4" />
                Mark as Received
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                Pay {person.name}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Action Button when not expanded */}
      {!isExpanded && (
        <div className="px-4 pb-4">
          <Button
            size="sm"
            variant={owesYou ? "default" : "destructive"}
            onClick={onSettle}
            className="w-full h-10 text-sm gap-1.5"
          >
            {owesYou ? (
              <>
                <ArrowDownLeft className="w-4 h-4" />
                Mark as Received
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                Pay {person.name}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
