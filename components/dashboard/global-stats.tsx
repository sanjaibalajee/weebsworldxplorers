type GlobalStatsProps = {
  totalGroupSpend: number;
  totalPersonalSpend: number;
};

export function GlobalStats({ totalGroupSpend, totalPersonalSpend }: GlobalStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Group Total</p>
        <p className="text-xl font-bold">฿{totalGroupSpend.toLocaleString()}</p>
      </div>
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Your Spend</p>
        <p className="text-xl font-bold">฿{totalPersonalSpend.toLocaleString()}</p>
      </div>
    </div>
  );
}
