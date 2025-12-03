"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Users,
  User,
  Calendar,
  Receipt,
  Banknote,
  PieChart,
  Edit,
  Trash2,
  Loader2,
  PiggyBank,
} from "lucide-react";
import { deleteExpense } from "@/app/actions/expenses";

type Payer = {
  userId: string;
  name: string;
  cashGiven: number;
  changeTaken: number;
};

type Split = {
  userId: string;
  name: string;
  shares: number;
  amount: number;
};

type Expense = {
  id: string;
  title: string;
  totalAmount: number;
  date: string | null;
  type: "group" | "individual" | "pot";
  payers: Payer[];
  splits: Split[];
  createdBy: string;
  createdAt: string;
};

type ExpenseDetailProps = {
  expense: Expense;
  currentUserId: string;
};

export function ExpenseDetail({ expense, currentUserId }: ExpenseDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      if (result.success) {
        router.push("/dashboard");
      } else {
        console.error("Failed to delete expense:", result.error);
      }
    });
  };

  const formattedDate = expense.date
    ? new Date(expense.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown date";

  const createdAtFormatted = new Date(expense.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const totalPaid = expense.payers.reduce(
    (sum, p) => sum + (p.cashGiven - p.changeTaken),
    0
  );

  const yourSplit = expense.splits.find((s) => s.userId === currentUserId);
  const yourShare = yourSplit?.amount || 0;

  const isGroupExpense = expense.type === "group";
  const isPotExpense = expense.type === "pot";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-xl font-bold">Expense Details</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {isPotExpense ? (
                <>
                  <PiggyBank className="w-3.5 h-3.5" /> Pot expense
                </>
              ) : isGroupExpense ? (
                <>
                  <Users className="w-3.5 h-3.5" /> Group expense
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5" /> Individual expense
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold">{expense.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isPotExpense ? "bg-amber-500/10" : isGroupExpense ? "bg-blue-500/10" : "bg-purple-500/10"
            }`}
          >
            {isPotExpense ? (
              <PiggyBank className="w-6 h-6 text-amber-500" />
            ) : (
              <Receipt
                className={`w-6 h-6 ${
                  isGroupExpense ? "text-blue-500" : "text-purple-500"
                }`}
              />
            )}
          </div>
        </div>

        {/* Amount Display */}
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
          <p className="text-3xl font-bold">฿{expense.totalAmount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ≈ ₹{Math.round(expense.totalAmount * 2.4).toLocaleString()}
          </p>
        </div>

        {/* Your Share */}
        {(isGroupExpense || isPotExpense) && (
          <div className="flex items-center justify-between py-3 border-t">
            <span className="text-sm text-muted-foreground">
              {isPotExpense ? "Deducted from your pot" : "Your share"}
            </span>
            <span className="text-lg font-bold text-primary">
              ฿{yourShare.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Who Paid Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Who Paid</h3>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          {expense.payers.map((payer, index) => {
            const netPaid = payer.cashGiven - payer.changeTaken;
            const isCurrentUser = payer.userId === currentUserId;

            return (
              <div
                key={payer.userId}
                className={`flex items-center justify-between p-3 ${
                  index > 0 ? "border-t" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCurrentUser
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {payer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {payer.name}
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground ml-1">(You)</span>
                      )}
                    </p>
                    {payer.changeTaken > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Gave ฿{payer.cashGiven.toLocaleString()}, took ฿
                        {payer.changeTaken.toLocaleString()} change
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ฿{netPaid.toLocaleString()}
                </p>
              </div>
            );
          })}

          {/* Total Paid Row */}
          {expense.payers.length > 1 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 border-t">
              <span className="text-xs text-muted-foreground">Total paid</span>
              <span className="text-sm font-bold">฿{totalPaid.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Split Breakdown Section */}
      {(isGroupExpense || isPotExpense) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Split Breakdown</h3>
            <span className="text-xs text-muted-foreground">
              ({expense.splits.length} people)
            </span>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden">
            {expense.splits.map((split, index) => {
              const isCurrentUser = split.userId === currentUserId;
              const payer = expense.payers.find((p) => p.userId === split.userId);
              const netPaid = payer ? payer.cashGiven - payer.changeTaken : 0;
              const balance = netPaid - split.amount;

              return (
                <div
                  key={split.userId}
                  className={`flex items-center justify-between p-3 ${
                    index > 0 ? "border-t" : ""
                  } ${isCurrentUser ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCurrentUser
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {split.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {split.name}
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground ml-1">(You)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {split.shares} share{split.shares !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">฿{split.amount.toLocaleString()}</p>
                    {balance !== 0 && (
                      <p
                        className={`text-[10px] ${
                          balance > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {balance > 0 ? "+" : ""}฿{balance.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meta Info */}
      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>
          Added by {expense.createdBy} on {createdAtFormatted}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-11 gap-2"
          onClick={() => router.push(`/expense/${expense.id}/edit`)}
        >
          <Edit className="w-4 h-4" />
          Edit
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11 gap-2 text-red-600 hover:text-red-600 hover:bg-red-500/10 border-red-200 dark:border-red-900"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
