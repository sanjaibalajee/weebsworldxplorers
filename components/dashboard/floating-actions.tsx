"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, HandCoins } from "lucide-react";

export function FloatingActions() {
  const router = useRouter();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
      <Button
        size="lg"
        className="rounded-full shadow-lg h-14 px-6 gap-2"
        onClick={() => router.push("/expense/new")}
      >
        <Plus className="w-5 h-5" />
        Add Expense
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="rounded-full shadow-lg h-14 px-6 gap-2 bg-background"
        onClick={() => router.push("/settle")}
      >
        <HandCoins className="w-5 h-5" />
        Settle
      </Button>
    </div>
  );
}
