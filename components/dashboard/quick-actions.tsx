"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="mb-6">
      <button
        onClick={() => router.push("/itinerary")}
        className="w-full flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium">Itinerary</p>
          <p className="text-[10px] text-muted-foreground">8-day plan</p>
        </div>
      </button>
    </div>
  );
}
