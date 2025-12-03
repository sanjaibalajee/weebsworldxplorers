"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, User, Check, Loader2 } from "lucide-react";
import { CashFlowWidget } from "./cash-flow-widget";
import { SplitWidget } from "./split-widget";
import { updateExpense } from "@/app/actions/expenses";

type User = { id: string; name: string };

type Payer = {
  id: string;
  userId: string;
  cashGiven: number;
  changeTaken: number;
};

type Split = {
  userId: string;
  shares: number;
};

type ExpenseData = {
  id: string;
  title: string;
  totalAmount: number;
  date: string | null;
  type: "group" | "individual" | "pot";
  payers: { userId: string; name: string; cashGiven: number; changeTaken: number }[];
  splits: { userId: string; name: string; shares: number; amount: number }[];
};

type EditExpenseFormProps = {
  expense: ExpenseData;
  currentUser: User;
  users: User[];
};

export function EditExpenseForm({ expense, currentUser, users }: EditExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state - initialized from expense
  const [title, setTitle] = useState(expense.title);
  const [totalAmount, setTotalAmount] = useState<number | "">(expense.totalAmount);
  const [date, setDate] = useState(expense.date || new Date().toISOString().split("T")[0]);

  // Cash flow state - initialized from expense payers
  const [payers, setPayers] = useState<Payer[]>(
    expense.payers.map((p) => ({
      id: crypto.randomUUID(),
      userId: p.userId,
      cashGiven: p.cashGiven,
      changeTaken: p.changeTaken,
    }))
  );

  // Split state - initialized from expense splits
  const [splits, setSplits] = useState<Split[]>(
    users.map((u) => {
      const existingSplit = expense.splits.find((s) => s.userId === u.id);
      return {
        userId: u.id,
        shares: existingSplit?.shares || 1,
      };
    })
  );
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(expense.splits.map((s) => s.userId))
  );

  const expenseType = expense.type;
  const isGroupExpense = expenseType === "group";

  // Calculations
  const netCashPaid = useMemo(() => {
    return payers.reduce((sum, p) => sum + (p.cashGiven - p.changeTaken), 0);
  }, [payers]);

  const cashDifference = useMemo(() => {
    if (totalAmount === "") return 0;
    return netCashPaid - totalAmount;
  }, [netCashPaid, totalAmount]);

  const totalShares = useMemo(() => {
    return splits
      .filter((s) => selectedUserIds.has(s.userId))
      .reduce((sum, s) => sum + s.shares, 0);
  }, [splits, selectedUserIds]);

  // Validation
  const isValid = useMemo(() => {
    return (
      title.trim() !== "" &&
      totalAmount !== "" &&
      totalAmount > 0 &&
      cashDifference === 0 &&
      selectedUserIds.size > 0 &&
      totalShares > 0
    );
  }, [title, totalAmount, cashDifference, selectedUserIds, totalShares]);

  const handleSubmit = async () => {
    if (!isValid || totalAmount === "") return;

    startTransition(async () => {
      const finalPayers = expenseType === "individual"
        ? [{ userId: currentUser.id, cashGiven: totalAmount, changeTaken: 0 }]
        : payers.map((p) => ({
            userId: p.userId,
            cashGiven: p.cashGiven,
            changeTaken: p.changeTaken,
          }));

      const finalSplits = expenseType === "individual"
        ? [{ userId: currentUser.id, shares: 1, owedAmount: totalAmount }]
        : splits
            .filter((s) => selectedUserIds.has(s.userId))
            .map((s) => {
              const shareAmount = (s.shares / totalShares) * totalAmount;
              return {
                userId: s.userId,
                shares: s.shares,
                owedAmount: Math.round(shareAmount * 100) / 100,
              };
            });

      const result = await updateExpense({
        id: expense.id,
        title,
        totalAmount,
        date,
        type: expenseType,
        payers: finalPayers,
        splits: finalSplits,
      });

      if (result.success) {
        router.push(`/expense/${expense.id}`);
        router.refresh();
      } else {
        console.error("Failed to update expense:", result.error);
      }
    });
  };

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
          <h1 className="text-xl font-bold">Edit Expense</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {isGroupExpense ? (
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

      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            Expense Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Dinner at Som Tam Nua"
            className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Total Amount (THB)
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value ? Number(e.target.value) : "")}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Cash Flow Widget - show for both but simpler for individual */}
      {isGroupExpense ? (
        <CashFlowWidget
          users={users}
          payers={payers}
          setPayers={setPayers}
          totalAmount={totalAmount === "" ? 0 : totalAmount}
          netCashPaid={netCashPaid}
          cashDifference={cashDifference}
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Payment</h2>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">You paid</p>
            <p className="text-2xl font-bold">
              ฿{totalAmount === "" ? "0" : totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Split Widget - only show for group */}
      {isGroupExpense && (
        <SplitWidget
          users={users}
          splits={splits}
          setSplits={setSplits}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          totalAmount={totalAmount === "" ? 0 : totalAmount}
          totalShares={totalShares}
        />
      )}

      {/* Save Button */}
      <Button
        className="w-full h-12 text-base"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving...
          </>
        ) : isValid ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            Save Changes
          </>
        ) : (
          "Complete all fields"
        )}
      </Button>
    </div>
  );
}
