"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, Wallet } from "lucide-react";

type PersonBalance = {
  userId: string;
  name: string;
  netAmount: number;
};

type SettleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, addToMyWallet: boolean) => void;
  person: PersonBalance;
  walletBalance?: number;
};

export function SettleModal({ isOpen, onClose, onConfirm, person, walletBalance = 0 }: SettleModalProps) {
  // Always use the exact owed amount - no partial payments to avoid mismatches
  const amount = Math.abs(person.netAmount);
  const inrEquivalent = Math.round(amount * 2.4);

  const [addToMyWallet, setAddToMyWallet] = useState(true);

  const handleConfirm = () => {
    // Always settle the exact amount owed
    onConfirm(amount, addToMyWallet);
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
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold bg-green-500/20 text-green-600 dark:text-green-400">
            {person.name.charAt(0)}
          </div>
          <h2 className="text-lg font-bold">
            Received from {person.name}?
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            They owe you ฿{amount.toLocaleString()} (≈ ₹{inrEquivalent.toLocaleString()})
          </p>
        </div>

        {/* Amount Section - Fixed amount, no editing */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Amount to settle</p>
          <div className="rounded-xl p-4 text-center bg-green-500/10">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ฿{amount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ ₹{inrEquivalent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Wallet Toggle */}
        <div className="mb-4 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <button
            onClick={() => setAddToMyWallet(!addToMyWallet)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Add to my wallet?</span>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                addToMyWallet ? "bg-purple-500 justify-end" : "bg-muted justify-start"
              }`}
            >
              <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow-sm" />
            </div>
          </button>
          <p className="text-[10px] text-muted-foreground mt-2">
            {addToMyWallet
              ? `Your wallet: ฿${walletBalance.toLocaleString()} → ฿${(walletBalance + amount).toLocaleString()}`
              : "Cash received outside wallet tracking"}
          </p>
        </div>

        {/* Info about debtor's wallet */}
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            ฿{amount.toLocaleString()} will be deducted from {person.name}'s wallet
          </p>
        </div>

        {/* Confirm Button */}
        <Button
          className="w-full h-12 text-base gap-2"
          onClick={handleConfirm}
        >
          <Check className="w-5 h-5" />
          Confirm Received
        </Button>
      </div>
    </div>
  );
}
