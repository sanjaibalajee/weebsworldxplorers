import { redirect } from "next/navigation";
import { getCurrentUser, getUsers } from "@/app/actions/auth";
import { AddExpenseForm } from "@/components/expense/add-expense-form";

export default async function AddExpensePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const users = await getUsers();

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      <AddExpenseForm currentUser={currentUser} users={users} />
    </div>
  );
}
