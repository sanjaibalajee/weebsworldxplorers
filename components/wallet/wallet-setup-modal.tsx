"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2 } from "lucide-react";
import { createTopup } from "@/app/actions/wallet";

type WalletSetupModalProps = {
  isOpen: boolean;
  onComplete: () => void;
  userName: string;
};

export function WalletSetupModal({ isOpen, onComplete, userName }: WalletSetupModalProps) {
  const [isPending, startTransition] = useTransition();
  const [amountThb, setAmountThb] = useState<number | "">("");
  const [exchangeRate, setExchangeRate] = useState<number | "">(2.4);

  const inrEquivalent = amountThb && exchangeRate
    ? Math.round(Number(amountThb) * Number(exchangeRate))
    : 0;

  const isValid = amountThb !== "" && amountThb > 0 && exchangeRate !== "" && exchangeRate > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    startTransition(async () => {
      const result = await createTopup({
        amountThb: Number(amountThb),
        exchangeRate: Number(exchangeRate),
        source: "Initial setup",
      });

      if (result.success) {
        onComplete();
      } else {
        console.error("Failed to create topup:", result.error);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background rounded-2xl p-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 mx-auto mb-4 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-xl font-bold">Welcome, {userName}!</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Let&apos;s set up your Thai Baht wallet to track your spending
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              How much THB are you starting with?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ฿
              </span>
              <input
                type="number"
                value={amountThb}
                onChange={(e) => setAmountThb(e.target.value ? Number(e.target.value) : "")}
                placeholder="5000"
                min="0"
                className="w-full h-12 pl-8 pr-4 rounded-lg border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Average exchange rate (INR per THB)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                ₹/฿
              </span>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value ? Number(e.target.value) : "")}
                placeholder="2.4"
                min="0"
                step="0.01"
                className="w-full h-12 pl-12 pr-4 rounded-lg border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This is used to show INR equivalents
            </p>
          </div>

          {/* Calculation Preview */}
          {amountThb && exchangeRate && (
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">That&apos;s approximately</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                ₹{inrEquivalent.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          className="w-full h-12 text-base mt-6 gap-2"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Start Tracking
            </>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          You can add more top-ups later as you exchange money
        </p>
      </div>
    </div>
  );
}
