"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, Loader2, PiggyBank, Users, RefreshCw, LogOut } from "lucide-react";
import { loadPot, bulkLoadPot } from "@/app/actions/pot";
import { logout } from "@/app/actions/auth";

type User = {
  id: string;
  name: string;
  potBalance: number;
};

type AdminDashboardProps = {
  users: User[];
  totalPotBalance: number;
};

export function AdminDashboard({ users, totalPotBalance }: AdminDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAmount, setBulkAmount] = useState<number | "">("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleLoadPot = () => {
    if (!selectedUser || amount === "" || amount <= 0) return;

    setError(null);
    startTransition(async () => {
      const result = await loadPot(selectedUser.id, amount);
      if (result.success) {
        setSelectedUser(null);
        setAmount("");
        router.refresh();
      } else {
        setError(result.error || "Failed to load pot");
      }
    });
  };

  const handleBulkLoad = () => {
    if (bulkAmount === "" || bulkAmount <= 0) return;

    setBulkError(null);
    setBulkResult(null);
    startTransition(async () => {
      const result = await bulkLoadPot(bulkAmount);
      if (result.success) {
        setBulkResult(result.message || "Bulk load successful");
        setBulkAmount("");
        router.refresh();
      } else {
        setBulkError(result.error || "Failed to bulk load pots");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage group pots</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Total Pot Balance */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <PiggyBank className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Pot Balance</p>
            <p className="text-2xl font-bold text-amber-600">
              ฿{totalPotBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Button
          onClick={() => router.push("/expense/new?type=pot")}
          className="h-auto py-4 flex flex-col gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Add Pot Expense</span>
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowBulkModal(true)}
          className="h-auto py-4 flex flex-col gap-2"
        >
          <Users className="w-5 h-5" />
          <span className="text-xs">Bulk Load All</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/expenses")}
          className="h-auto py-4 flex flex-col gap-2"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-xs">View Expenses</span>
        </Button>
      </div>

      {/* User Pot List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">User Pots</h2>

        {users.map((user) => (
          <div
            key={user.id}
            className="bg-card border rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className={`text-sm ${user.potBalance > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  Pot: ฿{user.potBalance.toLocaleString()}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedUser(user)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Load
            </Button>
          </div>
        ))}
      </div>

      {/* Load Pot Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Load Pot</h2>
            <p className="text-sm text-muted-foreground">
              Loading pot for <span className="font-medium">{selectedUser.name}</span>
            </p>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Amount (THB)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                placeholder="0"
                min="0"
                className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                This will deduct ฿{amount || 0} from {selectedUser.name}'s wallet
                and add it to their pot.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedUser(null);
                  setAmount("");
                  setError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleLoadPot}
                disabled={isPending || amount === "" || amount <= 0}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Load Pot"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Load Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Bulk Load Pots</h2>
            <p className="text-sm text-muted-foreground">
              Load the same amount into all {users.length} users' pots
            </p>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Amount per person (THB)
              </label>
              <input
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value ? Number(e.target.value) : "")}
                placeholder="0"
                min="0"
                className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                This will deduct ฿{bulkAmount || 0} from each user's wallet
                and add it to their pot.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total: ฿{((bulkAmount || 0) * users.length).toLocaleString()} across {users.length} people
              </p>
            </div>

            {bulkError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-600">{bulkError}</p>
              </div>
            )}

            {bulkResult && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-xs text-green-600">{bulkResult}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAmount("");
                  setBulkError(null);
                  setBulkResult(null);
                }}
                disabled={isPending}
              >
                {bulkResult ? "Close" : "Cancel"}
              </Button>
              {!bulkResult && (
                <Button
                  className="flex-1"
                  onClick={handleBulkLoad}
                  disabled={isPending || bulkAmount === "" || bulkAmount <= 0}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Load All Pots"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
