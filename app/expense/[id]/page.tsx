import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { getExpense } from "@/app/actions/expenses";
import { ExpenseDetail } from "@/components/expense/expense-detail";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { id } = await params;
  const expense = await getExpense(id);

  if (!expense) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      <ExpenseDetail expense={expense} currentUserId={currentUser.id} />
    </div>
  );
}
