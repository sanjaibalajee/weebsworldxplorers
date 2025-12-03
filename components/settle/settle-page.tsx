"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, Check, X, Loader2 } from "lucide-react";
import { BalanceCard } from "./balance-card";
import { SettleModal } from "./settle-modal";
import { createSettlement, confirmSettlement, rejectSettlement } from "@/app/actions/settlements";
import { formatThaiDate } from "@/lib/date-utils";

type Expense = {
  id: string;
  title: string;
  amount: number; // positive = they owe you, negative = you owe them
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

type PendingSettlement = {
  id: string;
  amount: number;
  amountInr: number | null;
  payerId: string | null;
  payerName: string;
  receiverId: string | null;
  receiverName: string;
  date: string;
};

type SettlePageProps = {
  balances: PersonBalance[];
  walletBalance: number;
  pendingSettlements: PendingSettlement[];
  outgoingPendingSettlements: PendingSettlement[];
};

type SettleModalData = {
  isOpen: boolean;
  type: "pay" | "receive";
  person: PersonBalance | null;
};

export function SettlePage({ balances, walletBalance, pendingSettlements = [], outgoingPendingSettlements = [] }: SettlePageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<SettleModalData>({
    isOpen: false,
    type: "pay",
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
  // Also filter out people who already have pending settlements (shown in "Awaiting Confirmation" section)
  const pendingReceiverIds = new Set(outgoingPendingSettlements.map(s => s.receiverId).filter(Boolean) as string[]);
  const pendingPayerIds = new Set(pendingSettlements.map(s => s.payerId).filter(Boolean) as string[]);

  const activeBalances = balances.filter((b) => {
    if (b.netAmount === 0) return false;
    // If I owe them (netAmount < 0) and there's already a pending settlement where I'm paying them
    if (b.netAmount < 0 && pendingReceiverIds.has(b.userId)) return false;
    // If they owe me (netAmount > 0) and there's already a pending settlement where they're paying me
    if (b.netAmount > 0 && pendingPayerIds.has(b.userId)) return false;
    return true;
  });

  const openModal = (person: PersonBalance) => {
    setModalData({
      isOpen: true,
      type: person.netAmount < 0 ? "pay" : "receive",
      person,
    });
  };

  const closeModal = () => {
    setModalData({ isOpen: false, type: "pay", person: null });
  };

  type ExpenseSettlement = {
    expenseId: string;
    amount: number;
  };

  const handleSettle = async (amount: number, method: "thb" | "inr", affectsWallet: boolean, expenses: ExpenseSettlement[]) => {
    if (!modalData.person) return;

    startTransition(async () => {
      // Create the settlement record with pending status
      // Wallet transactions happen on confirmation
      const result = await createSettlement({
        otherUserId: modalData.person!.userId,
        amountThb: amount,
        amountInr: method === "inr" ? Math.round(amount * 2.4) : undefined,
        type: modalData.type, // "pay" or "receive"
        affectsWallet,
        expenses, // Link to specific expenses
      });

      if (result.success) {
        closeModal();
        router.refresh();
      } else {
        console.error("Failed to create settlement:", result.error);
      }
    });
  };

  const handleConfirmSettlement = async (settlementId: string, affectsMyWallet: boolean) => {
    setProcessingId(settlementId);
    startTransition(async () => {
      const result = await confirmSettlement(settlementId, affectsMyWallet);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Failed to confirm settlement:", result.error);
      }
      setProcessingId(null);
    });
  };

  const handleRejectSettlement = async (settlementId: string) => {
    setProcessingId(settlementId);
    startTransition(async () => {
      const result = await rejectSettlement(settlementId);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Failed to reject settlement:", result.error);
      }
      setProcessingId(null);
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

        {/* Pending Settlements (awaiting your confirmation) */}
        {pendingSettlements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium">Awaiting Your Confirmation</p>
            </div>

            {pendingSettlements.map((settlement) => (
              <PendingSettlementCard
                key={settlement.id}
                settlement={settlement}
                onConfirm={handleConfirmSettlement}
                onReject={handleRejectSettlement}
                isProcessing={processingId === settlement.id}
              />
            ))}
          </div>
        )}

        {/* Outgoing Pending Settlements (you paid, waiting for their confirmation) */}
        {outgoingPendingSettlements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-medium">Awaiting Their Confirmation</p>
            </div>

            {outgoingPendingSettlements.map((settlement) => (
              <OutgoingPendingCard key={settlement.id} settlement={settlement} />
            ))}
          </div>
        )}

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
          ) : pendingSettlements.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm font-medium">All settled!</p>
              <p className="text-xs text-muted-foreground mt-1">
                No pending balances with anyone
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Settlement Modal */}
      {modalData.person && (
        <SettleModal
          isOpen={modalData.isOpen}
          onClose={closeModal}
          onConfirm={handleSettle}
          type={modalData.type}
          person={modalData.person}
          walletBalance={walletBalance}
        />
      )}
    </>
  );
}

// Pending Settlement Card Component
type PendingSettlementCardProps = {
  settlement: PendingSettlement;
  onConfirm: (settlementId: string, affectsMyWallet: boolean) => void;
  onReject: (settlementId: string) => void;
  isProcessing: boolean;
};

function PendingSettlementCard({
  settlement,
  onConfirm,
  onReject,
  isProcessing,
}: PendingSettlementCardProps) {
  const [addToWallet, setAddToWallet] = useState(true);

  const formattedDate = formatThaiDate(settlement.date, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-lg font-bold text-green-600 dark:text-green-400">
            {settlement.payerName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">
              {settlement.payerName} paid you
            </p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            +฿{settlement.amount.toLocaleString()}
          </p>
          {settlement.amountInr && (
            <p className="text-xs text-muted-foreground">
              ₹{settlement.amountInr.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Wallet Toggle */}
      <button
        onClick={() => setAddToWallet(!addToWallet)}
        className="w-full flex items-center justify-between p-2 bg-background/50 rounded-lg"
        disabled={isProcessing}
      >
        <span className="text-xs text-muted-foreground">Add to my wallet?</span>
        <div
          className={`w-8 h-5 rounded-full transition-colors flex items-center ${
            addToWallet ? "bg-green-500 justify-end" : "bg-muted justify-start"
          }`}
        >
          <div className="w-4 h-4 bg-white rounded-full mx-0.5 shadow-sm" />
        </div>
      </button>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 text-red-600 hover:text-red-600 hover:bg-red-500/10 border-red-200 dark:border-red-900"
          onClick={() => onReject(settlement.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <X className="w-4 h-4 mr-1" />
              Reject
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="flex-1 h-9 bg-green-600 hover:bg-green-700"
          onClick={() => onConfirm(settlement.id, addToWallet)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 mr-1" />
              Confirm
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Outgoing Pending Card Component (you paid, waiting for their confirmation)
type OutgoingPendingCardProps = {
  settlement: PendingSettlement;
};

function OutgoingPendingCard({ settlement }: OutgoingPendingCardProps) {
  const formattedDate = formatThaiDate(settlement.date, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-600 dark:text-blue-400">
            {settlement.receiverName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">
              Paid {settlement.receiverName}
            </p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            -฿{settlement.amount.toLocaleString()}
          </p>
          {settlement.amountInr && (
            <p className="text-xs text-muted-foreground">
              ₹{settlement.amountInr.toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Waiting for {settlement.receiverName} to confirm</span>
      </div>
    </div>
  );
}
