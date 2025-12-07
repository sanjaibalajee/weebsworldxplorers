"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { BalanceCard } from "./balance-card";
import { SettleModal } from "./settle-modal";
import { markAsReceived } from "@/app/actions/settlements";

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
  netAmount: number; // positive = they owe you, negative = you owe them
  expenses: Expense[];
};

type SettlePageProps = {
  balances: PersonBalance[];
  walletBalance: number;
};

type SettleModalData = {
  isOpen: boolean;
  person: PersonBalance | null;
};

export function SettlePage({ balances, walletBalance }: SettlePageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<SettleModalData>({
    isOpen: false,
    person: null,
  });

  // Calculate totals
  const { totalOwedToYou, totalOwedByYou } = useMemo(() => {
    let toYou = 0;
    let byYou = 0;
    balances.forEach((b) => {
      if (b.netAmount > 0) toYou += b.netAmount;
      else if (b.netAmount < 0) byYou += Math.abs(b.netAmount);
    });
    return { totalOwedToYou: toYou, totalOwedByYou: byYou };
  }, [balances]);

  // Filter out settled people (netAmount === 0)
  const activeBalances = balances.filter((b) => b.netAmount !== 0);

  const openModal = (person: PersonBalance) => {
    // Only open modal for people who owe you (netAmount > 0)
    if (person.netAmount > 0) {
      setModalData({
        isOpen: true,
        person,
      });
    }
  };

  const closeModal = () => {
    setModalData({ isOpen: false, person: null });
  };

  const handleMarkAsReceived = async (amount: number, addToMyWallet: boolean) => {
    if (!modalData.person) return;

    startTransition(async () => {
      const result = await markAsReceived({
        debtorUserId: modalData.person!.userId,
        amountThb: amount,
        addToMyWallet,
      });

      if (result.success) {
        closeModal();
        router.refresh();
      } else {
        console.error("Failed to mark as received:", result.error);
      }
    });
  };

  return (
    <>
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
            <h1 className="text-xl font-bold">Settle Up</h1>
            <p className="text-sm text-muted-foreground">
              Clear your balances
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Owed to You</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              +฿{totalOwedToYou.toLocaleString()}
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Owed by You</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              -฿{totalOwedByYou.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Balance List */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {activeBalances.length} {activeBalances.length === 1 ? "person" : "people"} to settle with
          </p>

          {activeBalances.length > 0 ? (
            activeBalances.map((person) => (
              <BalanceCard
                key={person.userId}
                person={person}
                isExpanded={expandedUserId === person.userId}
                onToggleExpand={() => setExpandedUserId(
                  expandedUserId === person.userId ? null : person.userId
                )}
                onSettle={() => openModal(person)}
                onExpenseClick={(expenseId) => router.push(`/expense/${expenseId}`)}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm font-medium">All settled!</p>
              <p className="text-xs text-muted-foreground mt-1">
                No pending balances with anyone
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Settlement Modal - Only for "Mark as Received" */}
      {modalData.person && (
        <SettleModal
          isOpen={modalData.isOpen}
          onClose={closeModal}
          onConfirm={handleMarkAsReceived}
          person={modalData.person}
          walletBalance={walletBalance}
        />
      )}
    </>
  );
}
