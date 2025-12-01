"use client";

import { useRouter } from "next/navigation";
import { History } from "lucide-react";

type Expense = {
  id: string;
  title: string;
  totalAmount: number;
  yourShare: number;
  paidBy: string;
  date: string;
};

type ExpenseTimelineProps = {
  expenses: Expense[];
};

export function ExpenseTimeline({ expenses }: ExpenseTimelineProps) {
  const router = useRouter();

  if (expenses.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-sm">No expenses yet</p>
        <p className="text-xs mt-1">Add your first expense to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-muted-foreground">Recent Expenses</h2>
        <button
          onClick={() => router.push("/history")}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <History className="w-3.5 h-3.5" />
          Show Timeline
        </button>
      </div>
      {expenses.map((expense) => (
        <button
          key={expense.id}
          onClick={() => router.push(`/expense/${expense.id}`)}
          className="w-full bg-card border rounded-xl p-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-medium text-sm">{expense.title}</h3>
            <span className="text-sm font-semibold">฿{expense.totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Your share: ฿{expense.yourShare.toLocaleString()}</span>
            <span>Paid by {expense.paidBy}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{expense.date}</p>
        </button>
      ))}
    </div>
  );
}
