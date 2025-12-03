"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, User, Filter, PiggyBank } from "lucide-react";
import { formatThaiDateKey } from "@/lib/date-utils";

type Expense = {
  id: string;
  title: string;
  totalAmount: number;
  date: string | null;
  type: "group" | "individual" | "pot";
  createdAt: string;
  paidBy: string;
  splitBetween: number;
  yourShare: number;
};

type ExpensesContentProps = {
  expenses: Expense[];
  currentUserId: string;
};

type FilterType = "all" | "mine" | "group" | "individual" | "pot";

export function ExpensesContent({ expenses, currentUserId }: ExpensesContentProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      switch (filter) {
        case "mine":
          // Show expenses where user has a share
          return expense.yourShare > 0;
        case "group":
          return expense.type === "group";
        case "individual":
          return expense.type === "individual";
        case "pot":
          return expense.type === "pot";
        default:
          return true;
      }
    });
  }, [expenses, filter]);

  // Group expenses by date
  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};

    filteredExpenses.forEach((expense) => {
      const dateKey = formatThaiDateKey(expense.createdAt);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(expense);
    });

    return groups;
  }, [filteredExpenses]);

  const filterButtons: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "mine", label: "My Expenses" },
    { value: "group", label: "Group" },
    { value: "pot", label: "Pot" },
    { value: "individual", label: "Personal" },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">All Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === btn.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-6">
        {Object.keys(groupedExpenses).length > 0 ? (
          Object.entries(groupedExpenses).map(([date, dayExpenses]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-3">
                {date}
              </p>
              <div className="space-y-2">
                {dayExpenses.map((expense) => (
                  <button
                    key={expense.id}
                    onClick={() => router.push(`/expense/${expense.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-accent/50 transition-colors text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        expense.type === "group"
                          ? "bg-blue-500/10"
                          : expense.type === "pot"
                          ? "bg-amber-500/10"
                          : "bg-purple-500/10"
                      }`}
                    >
                      {expense.type === "group" ? (
                        <Users className="w-5 h-5 text-blue-500" />
                      ) : expense.type === "pot" ? (
                        <PiggyBank className="w-5 h-5 text-amber-500" />
                      ) : (
                        <User className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {expense.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.paidBy} paid • {expense.type === "group" ? `${expense.splitBetween} people` : expense.type === "pot" ? `${expense.splitBetween} people (pot)` : "Personal"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        ฿{expense.totalAmount.toLocaleString()}
                      </p>
                      {expense.yourShare > 0 && expense.type === "group" && (
                        <p className="text-xs text-muted-foreground">
                          You: ฿{expense.yourShare.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No expenses found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
