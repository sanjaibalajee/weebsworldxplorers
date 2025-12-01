import { redirect } from "next/navigation";
import { getCurrentUser, getUsers } from "@/app/actions/auth";
import { getExpense } from "@/app/actions/expenses";
import { EditExpenseForm } from "@/components/expense/edit-expense-form";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { id } = await params;
  const [expense, users] = await Promise.all([
    getExpense(id),
    getUsers(),
  ]);

  if (!expense) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      <EditExpenseForm
        expense={expense}
        currentUser={currentUser}
        users={users}
      />
    </div>
  );
}
