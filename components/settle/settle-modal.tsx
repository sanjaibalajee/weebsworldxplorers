"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Banknote, IndianRupee, Check, Wallet } from "lucide-react";

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
  netAmount: number;
  expenses: Expense[];
};

type ExpenseSettlement = {
  expenseId: string;
  amount: number;
};

type SettleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: "thb" | "inr", affectsWallet: boolean, expenses: ExpenseSettlement[]) => void;
  type: "pay" | "receive";
  person: PersonBalance;
  walletBalance?: number;
};

const EXCHANGE_RATE = 2.4; // 1 THB ≈ 2.4 INR

export function SettleModal({ isOpen, onClose, onConfirm, type, person, walletBalance = 0 }: SettleModalProps) {
  const amount = Math.abs(person.netAmount);
  const inrEquivalent = Math.round(amount * EXCHANGE_RATE);

  const [paymentMethod, setPaymentMethod] = useState<"thb" | "inr">("thb");
  const [settleAmount, setSettleAmount] = useState(amount);
  const [inrAmount, setInrAmount] = useState(inrEquivalent);
  const [isPartial, setIsPartial] = useState(false);
  const [affectsWallet, setAffectsWallet] = useState(true); // Default to yes

  const isPay = type === "pay";

  const handleAmountChange = (value: number, currency: "thb" | "inr") => {
    if (currency === "thb") {
      setSettleAmount(value);
      setInrAmount(Math.round(value * EXCHANGE_RATE));
    } else {
      setInrAmount(value);
      setSettleAmount(Math.round(value / EXCHANGE_RATE));
    }
  };

  const handleConfirm = () => {
    // Calculate which expenses are being settled based on the amount
    // Start from newest expenses and work backwards
    let remainingAmount = settleAmount;
    const expensesToSettle: ExpenseSettlement[] = [];

    // Sort by date descending (newest first)
    const sortedExpenses = [...person.expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const expense of sortedExpenses) {
      if (remainingAmount <= 0) break;

      const expenseAmount = Math.abs(expense.amount);
      if (expenseAmount <= remainingAmount) {
        expensesToSettle.push({
          expenseId: expense.id,
          amount: expenseAmount,
        });
        remainingAmount -= expenseAmount;
      } else {
        // Partial settlement of this expense
        expensesToSettle.push({
          expenseId: expense.id,
          amount: remainingAmount,
        });
        remainingAmount = 0;
      }
    }

    onConfirm(settleAmount, paymentMethod, affectsWallet, expensesToSettle);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold ${
              isPay
                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                : "bg-green-500/20 text-green-600 dark:text-green-400"
            }`}
          >
            {person.name.charAt(0)}
          </div>
          <h2 className="text-lg font-bold">
            {isPay ? `Pay ${person.name}?` : `Received from ${person.name}?`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isPay
              ? `You owe ฿${amount.toLocaleString()}`
              : `They owe you ฿${amount.toLocaleString()}`}
          </p>
        </div>

        {/* Payment Method Toggle */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {isPay ? "How are you paying?" : "How did you receive?"}
          </p>
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setPaymentMethod("thb")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                paymentMethod === "thb"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Banknote className="w-4 h-4" />
              Thai Baht
            </button>
            <button
              onClick={() => setPaymentMethod("inr")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                paymentMethod === "inr"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <IndianRupee className="w-4 h-4" />
              Indian Rupee
            </button>
          </div>
        </div>

        {/* Amount Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Amount</p>
            <button
              onClick={() => {
                setIsPartial(!isPartial);
                if (!isPartial) {
                  // Switching to partial - keep current amount
                } else {
                  // Switching to full - reset to full amount
                  setSettleAmount(amount);
                  setInrAmount(inrEquivalent);
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              {isPartial ? "Settle full amount" : "Settle partial amount"}
            </button>
          </div>

          {isPartial ? (
            <div className="space-y-3">
              {paymentMethod === "thb" ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ฿
                  </span>
                  <input
                    type="number"
                    value={settleAmount || ""}
                    onChange={(e) =>
                      handleAmountChange(Number(e.target.value) || 0, "thb")
                    }
                    max={amount}
                    className="w-full h-12 pl-8 pr-4 text-lg font-semibold rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={inrAmount || ""}
                    onChange={(e) =>
                      handleAmountChange(Number(e.target.value) || 0, "inr")
                    }
                    max={inrEquivalent}
                    className="w-full h-12 pl-8 pr-4 text-lg font-semibold rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {paymentMethod === "thb"
                  ? `≈ ₹${inrAmount.toLocaleString()}`
                  : `≈ ฿${settleAmount.toLocaleString()}`}
              </p>
            </div>
          ) : (
            <div
              className={`rounded-xl p-4 text-center ${
                isPay ? "bg-red-500/10" : "bg-green-500/10"
              }`}
            >
              <p
                className={`text-3xl font-bold ${
                  isPay
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {paymentMethod === "thb"
                  ? `฿${amount.toLocaleString()}`
                  : `₹${inrEquivalent.toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {paymentMethod === "thb"
                  ? `≈ ₹${inrEquivalent.toLocaleString()}`
                  : `≈ ฿${amount.toLocaleString()}`}
              </p>
            </div>
          )}
        </div>

        {/* Remaining Amount (if partial) */}
        {isPartial && settleAmount < amount && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining after this</span>
              <span className="font-medium">
                ฿{(amount - settleAmount).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Wallet Toggle */}
        <div className="mb-4 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <button
            onClick={() => setAffectsWallet(!affectsWallet)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">
                {isPay ? "Deduct from wallet?" : "Add to wallet balance?"}
              </span>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                affectsWallet ? "bg-purple-500 justify-end" : "bg-muted justify-start"
              }`}
            >
              <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow-sm" />
            </div>
          </button>
          {affectsWallet && (
            <p className="text-[10px] text-muted-foreground mt-2">
              {isPay
                ? `Your wallet: ฿${walletBalance.toLocaleString()} → ฿${Math.max(0, walletBalance - settleAmount).toLocaleString()}`
                : `Your wallet: ฿${walletBalance.toLocaleString()} → ฿${(walletBalance + settleAmount).toLocaleString()}`}
            </p>
          )}
          {!affectsWallet && (
            <p className="text-[10px] text-muted-foreground mt-2">
              {isPay
                ? "Payment won't be tracked in your wallet"
                : "Cash received outside wallet tracking"}
            </p>
          )}
        </div>

        {/* Confirm Button */}
        <Button
          className="w-full h-12 text-base gap-2"
          variant={isPay ? "destructive" : "default"}
          onClick={handleConfirm}
          disabled={settleAmount <= 0}
        >
          <Check className="w-5 h-5" />
          {isPay ? `Confirm Payment` : `Confirm Received`}
        </Button>

        {/* Helper Text */}
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          {isPay
            ? "The other person will need to confirm before balances update"
            : "This will immediately update your balances"}
        </p>
      </div>
    </div>
  );
}
