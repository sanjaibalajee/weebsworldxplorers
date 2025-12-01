"use client";

import { Button } from "@/components/ui/button";
import { Plus, Trash2, AlertCircle, Check } from "lucide-react";

type User = { id: string; name: string };

type Payer = {
  id: string;
  userId: string;
  cashGiven: number;
  changeTaken: number;
};

type CashFlowWidgetProps = {
  users: User[];
  payers: Payer[];
  setPayers: React.Dispatch<React.SetStateAction<Payer[]>>;
  totalAmount: number;
  netCashPaid: number;
  cashDifference: number;
};

export function CashFlowWidget({
  users,
  payers,
  setPayers,
  totalAmount,
  netCashPaid,
  cashDifference,
}: CashFlowWidgetProps) {
  const addPayer = () => {
    const usedUserIds = new Set(payers.map((p) => p.userId));
    const availableUser = users.find((u) => !usedUserIds.has(u.id));

    if (availableUser) {
      setPayers([
        ...payers,
        {
          id: crypto.randomUUID(),
          userId: availableUser.id,
          cashGiven: 0,
          changeTaken: 0,
        },
      ]);
    }
  };

  const removePayer = (id: string) => {
    if (payers.length > 1) {
      setPayers(payers.filter((p) => p.id !== id));
    }
  };

  const updatePayer = (id: string, field: keyof Payer, value: string | number) => {
    setPayers(
      payers.map((p) =>
        p.id === id
          ? { ...p, [field]: typeof value === "string" ? value : Number(value) }
          : p
      )
    );
  };

  const getUserName = (userId: string) => {
    return users.find((u) => u.id === userId)?.name || "Unknown";
  };

  const usedUserIds = new Set(payers.map((p) => p.userId));
  const canAddMore = users.length > payers.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Who Paid Cash?</h2>
        {canAddMore && (
          <Button variant="ghost" size="sm" onClick={addPayer} className="h-8 text-xs">
            <Plus className="w-4 h-4 mr-1" />
            Add Payer
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {payers.map((payer, index) => (
          <div
            key={payer.id}
            className="bg-muted/50 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <select
                value={payer.userId}
                onChange={(e) => updatePayer(payer.id, "userId", e.target.value)}
                className="h-9 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {users.map((u) => (
                  <option
                    key={u.id}
                    value={u.id}
                    disabled={usedUserIds.has(u.id) && u.id !== payer.userId}
                  >
                    {u.name}
                  </option>
                ))}
              </select>
              {payers.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePayer(payer.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  Cash Given (฿)
                </label>
                <input
                  type="number"
                  value={payer.cashGiven || ""}
                  onChange={(e) =>
                    updatePayer(payer.id, "cashGiven", Number(e.target.value) || 0)
                  }
                  placeholder="0"
                  min="0"
                  className="w-full h-9 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  Change Taken (฿)
                </label>
                <input
                  type="number"
                  value={payer.changeTaken || ""}
                  onChange={(e) =>
                    updatePayer(payer.id, "changeTaken", Number(e.target.value) || 0)
                  }
                  placeholder="0"
                  min="0"
                  className="w-full h-9 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Net: ฿{(payer.cashGiven - payer.changeTaken).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Validation Summary */}
      <div
        className={`rounded-lg p-3 flex items-center gap-2 ${
          cashDifference === 0
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}
      >
        {cashDifference === 0 ? (
          <>
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">
              Cash matches bill: ฿{netCashPaid.toLocaleString()}
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {cashDifference > 0
                ? `Overpaid by ฿${cashDifference.toLocaleString()}`
                : `Missing ฿${Math.abs(cashDifference).toLocaleString()}`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
