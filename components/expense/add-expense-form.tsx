"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, User, Check, Loader2, PiggyBank } from "lucide-react";
import { CashFlowWidget } from "./cash-flow-widget";
import { SplitWidget } from "./split-widget";
import { createExpense } from "@/app/actions/expenses";

type User = { id: string; name: string };

type UserWithPot = { id: string; name: string; potBalance: number };

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

type AddExpenseFormProps = {
  currentUser: User;
  users: User[];
  isAdmin?: boolean;
  usersWithPots?: UserWithPot[];
  initialType?: "pot";
};

type ExpenseType = "group" | "individual" | "pot" | null;

export function AddExpenseForm({
  currentUser,
  users,
  isAdmin = false,
  usersWithPots = [],
  initialType,
}: AddExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Expense type selection
  const [expenseType, setExpenseType] = useState<ExpenseType>(initialType || null);

  // Form state
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Cash flow state
  const [payers, setPayers] = useState<Payer[]>([
    {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      cashGiven: 0,
      changeTaken: 0,
    },
  ]);

  // Split state - for individual, only current user is selected
  const [splits, setSplits] = useState<Split[]>(
    users.map((u) => ({ userId: u.id, shares: 1 }))
  );
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(users.map((u) => u.id))
  );

  // Filter out admin from users for pot expenses
  const nonAdminUsers = users.filter((u) => u.name.toLowerCase() !== "admin");

  // When switching to individual, select only current user
  const handleTypeSelect = (type: ExpenseType) => {
    setExpenseType(type);
    if (type === "individual") {
      setSelectedUserIds(new Set([currentUser.id]));
    } else if (type === "pot") {
      // For pot expenses, select all non-admin users
      setSelectedUserIds(new Set(nonAdminUsers.map((u) => u.id)));
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  };

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
    const basicValid =
      expenseType !== null &&
      title.trim() !== "" &&
      totalAmount !== "" &&
      totalAmount > 0;

    if (expenseType === "individual") {
      // Individual expenses don't need cash flow validation
      return basicValid;
    }

    if (expenseType === "pot") {
      // Pot expenses just need basic validation + at least one person selected
      return basicValid && selectedUserIds.size > 0 && totalShares > 0;
    }

    // Group expenses need full validation
    return (
      basicValid &&
      cashDifference === 0 &&
      selectedUserIds.size > 0 &&
      totalShares > 0
    );
  }, [expenseType, title, totalAmount, cashDifference, selectedUserIds, totalShares]);

  const handleSubmit = async () => {
    if (!isValid || !expenseType || totalAmount === "") return;

    startTransition(async () => {
      // For individual expense, set current user as the only payer and split
      let finalPayers: { userId: string; cashGiven: number; changeTaken: number }[];
      let finalSplits: { userId: string; shares: number; owedAmount: number }[];

      if (expenseType === "individual") {
        finalPayers = [{ userId: currentUser.id, cashGiven: totalAmount, changeTaken: 0 }];
        finalSplits = [{ userId: currentUser.id, shares: 1, owedAmount: totalAmount }];
      } else if (expenseType === "pot") {
        // For pot expenses, admin is the payer (handled on server)
        finalPayers = [];
        finalSplits = splits
          .filter((s) => selectedUserIds.has(s.userId))
          .map((s) => {
            const shareAmount = (s.shares / totalShares) * totalAmount;
            return {
              userId: s.userId,
              shares: s.shares,
              owedAmount: Math.round(shareAmount * 100) / 100,
            };
          });
      } else {
        finalPayers = payers.map((p) => ({
          userId: p.userId,
          cashGiven: p.cashGiven,
          changeTaken: p.changeTaken,
        }));
        finalSplits = splits
          .filter((s) => selectedUserIds.has(s.userId))
          .map((s) => {
            const shareAmount = (s.shares / totalShares) * totalAmount;
            return {
              userId: s.userId,
              shares: s.shares,
              owedAmount: Math.round(shareAmount * 100) / 100,
            };
          });
      }

      const result = await createExpense({
        title,
        totalAmount,
        date,
        type: expenseType,
        payers: finalPayers,
        splits: finalSplits,
      });

      if (result.success) {
        router.push(isAdmin ? "/admin" : "/dashboard");
      } else {
        console.error("Failed to create expense:", result.error);
      }
    });
  };

  // Type selection screen
  if (expenseType === null) {
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
          <h1 className="text-xl font-bold">Add Expense</h1>
        </div>

        {/* Type Selection */}
        <div className="space-y-4 pt-8">
          <h2 className="text-center text-lg font-medium">What type of expense?</h2>
          <p className="text-center text-sm text-muted-foreground">
            Choose how this expense should be tracked
          </p>

          <div className={`grid gap-4 pt-4 ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              onClick={() => handleTypeSelect("group")}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-transparent bg-blue-500/5 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Group</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Split with others
                </p>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelect("individual")}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-transparent bg-purple-500/5 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                <User className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Individual</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Just for you
                </p>
              </div>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleTypeSelect("pot")}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-transparent bg-amber-500/5 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <PiggyBank className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Pot</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From group pot
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpenseType(null)}
          className="shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Add Expense</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {expenseType === "group" ? (
              <>
                <Users className="w-3.5 h-3.5" /> Group expense
              </>
            ) : expenseType === "pot" ? (
              <>
                <PiggyBank className="w-3.5 h-3.5" /> Pot expense
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
            placeholder={
              expenseType === "group"
                ? "e.g., Dinner at Som Tam Nua"
                : "e.g., Personal shopping"
            }
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

      {/* Cash Flow Widget - show for group only */}
      {expenseType === "group" && (
        <CashFlowWidget
          users={users}
          payers={payers}
          setPayers={setPayers}
          totalAmount={totalAmount === "" ? 0 : totalAmount}
          netCashPaid={netCashPaid}
          cashDifference={cashDifference}
        />
      )}

      {/* Individual - simple payment display */}
      {expenseType === "individual" && (
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

      {/* Pot - show pot balances and split */}
      {expenseType === "pot" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">From Group Pot</h2>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              This expense will be deducted from each person's pot balance.
              No owe relationships will be created.
            </p>
          </div>
        </div>
      )}

      {/* Split Widget - show for group and pot */}
      {(expenseType === "group" || expenseType === "pot") && (
        <SplitWidget
          users={expenseType === "pot" ? nonAdminUsers : users}
          splits={splits}
          setSplits={setSplits}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          totalAmount={totalAmount === "" ? 0 : totalAmount}
          totalShares={totalShares}
          showPotBalance={expenseType === "pot"}
          usersWithPots={usersWithPots}
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
            Save Expense
          </>
        ) : (
          "Complete all fields"
        )}
      </Button>
    </div>
  );
}
