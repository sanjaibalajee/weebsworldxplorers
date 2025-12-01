"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Minus, Plus } from "lucide-react";

type User = { id: string; name: string };

type Split = {
  userId: string;
  shares: number;
  customAmount?: number;
};

type SplitWidgetProps = {
  users: User[];
  splits: Split[];
  setSplits: React.Dispatch<React.SetStateAction<Split[]>>;
  selectedUserIds: Set<string>;
  setSelectedUserIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  totalAmount: number;
  totalShares: number;
};

type SplitMode = "equal" | "shares" | "amount";

export function SplitWidget({
  users,
  splits,
  setSplits,
  selectedUserIds,
  setSelectedUserIds,
  totalAmount,
  totalShares,
}: SplitWidgetProps) {
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const toggleAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  };

  const updateShares = (userId: string, shares: number) => {
    setSplits(
      splits.map((s) =>
        s.userId === userId ? { ...s, shares: Math.max(0.5, shares) } : s
      )
    );
  };

  const incrementShares = (userId: string) => {
    const current = getUserShares(userId);
    updateShares(userId, current + 0.5);
  };

  const decrementShares = (userId: string) => {
    const current = getUserShares(userId);
    if (current > 0.5) {
      updateShares(userId, current - 0.5);
    }
  };

  const updateCustomAmount = (userId: string, amount: number) => {
    setSplits(
      splits.map((s) =>
        s.userId === userId ? { ...s, customAmount: Math.max(0, amount) } : s
      )
    );
  };

  const getShareAmount = (userId: string) => {
    if (splitMode === "equal") {
      return selectedUserIds.size > 0 ? totalAmount / selectedUserIds.size : 0;
    } else if (splitMode === "shares") {
      const shares = getUserShares(userId);
      if (totalShares === 0 || totalAmount === 0) return 0;
      return (shares / totalShares) * totalAmount;
    } else {
      return splits.find((s) => s.userId === userId)?.customAmount || 0;
    }
  };

  const getUserShares = (userId: string) => {
    return splits.find((s) => s.userId === userId)?.shares || 1;
  };

  const getCustomAmount = (userId: string) => {
    return splits.find((s) => s.userId === userId)?.customAmount || 0;
  };

  const totalCustomAmount = splits
    .filter((s) => selectedUserIds.has(s.userId))
    .reduce((sum, s) => sum + (s.customAmount || 0), 0);

  const customAmountDifference = totalAmount - totalCustomAmount;

  const allSelected = selectedUserIds.size === users.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Split Between</h2>
        <Button
          variant={allSelected ? "default" : "outline"}
          size="sm"
          onClick={toggleAll}
          className="h-8 text-xs"
        >
          {allSelected ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              All Selected
            </>
          ) : (
            "Select All"
          )}
        </Button>
      </div>

      {/* Split Mode Tabs */}
      <div className="flex bg-muted rounded-lg p-1">
        <button
          onClick={() => setSplitMode("equal")}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            splitMode === "equal"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Equal Split
        </button>
        <button
          onClick={() => setSplitMode("shares")}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            splitMode === "shares"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Custom Shares
        </button>
        <button
          onClick={() => setSplitMode("amount")}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            splitMode === "amount"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Custom Amount
        </button>
      </div>

      <div className="space-y-2">
        {users.map((user) => {
          const isSelected = selectedUserIds.has(user.id);
          const shares = getUserShares(user.id);
          const amount = isSelected ? getShareAmount(user.id) : 0;

          return (
            <div
              key={user.id}
              className={`rounded-lg p-3 transition-colors ${
                isSelected
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted/30 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleUser(user.id)}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-sm font-medium ${!isSelected && "text-muted-foreground"}`}>
                    {user.name}
                  </span>
                </button>

                {isSelected && (
                  <div className="flex items-center gap-2">
                    {/* Equal Split - just show amount */}
                    {splitMode === "equal" && (
                      <span className="text-sm font-semibold">
                        ฿{amount.toFixed(0)}
                      </span>
                    )}

                    {/* Custom Shares - +/- controls */}
                    {splitMode === "shares" && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-muted rounded-lg">
                          <button
                            onClick={() => decrementShares(user.id)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-muted-foreground/20 rounded-l-lg transition-colors"
                            disabled={shares <= 0.5}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium">
                            {shares}x
                          </span>
                          <button
                            onClick={() => incrementShares(user.id)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-muted-foreground/20 rounded-r-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold w-16 text-right">
                          ฿{amount.toFixed(0)}
                        </span>
                      </div>
                    )}

                    {/* Custom Amount - input field */}
                    {splitMode === "amount" && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm">฿</span>
                        <input
                          type="number"
                          value={getCustomAmount(user.id) || ""}
                          onChange={(e) =>
                            updateCustomAmount(user.id, Number(e.target.value) || 0)
                          }
                          placeholder="0"
                          min="0"
                          className="w-20 h-8 px-2 text-sm rounded-md border bg-background text-right focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-3">
        {splitMode === "amount" ? (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedUserIds.size} people
              </span>
              <span className="font-medium">
                ฿{totalCustomAmount.toLocaleString()} / ฿{totalAmount.toLocaleString()}
              </span>
            </div>
            {customAmountDifference !== 0 && (
              <div className={`text-xs ${customAmountDifference > 0 ? "text-red-500" : "text-green-500"}`}>
                {customAmountDifference > 0
                  ? `฿${customAmountDifference.toLocaleString()} remaining to assign`
                  : `฿${Math.abs(customAmountDifference).toLocaleString()} over-assigned`}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedUserIds.size} people{splitMode === "shares" && `, ${totalShares} total shares`}
            </span>
            <span className="font-medium">฿{totalAmount.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
