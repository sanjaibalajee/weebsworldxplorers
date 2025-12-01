import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { getTransactionHistory } from "@/app/actions/history";
import { HistoryPage } from "@/components/history/history-page";

export default async function TransactionHistoryPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const history = await getTransactionHistory();

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      <HistoryPage
        groupTransactions={history.group}
        individualTransactions={history.individual}
      />
    </div>
  );
}
