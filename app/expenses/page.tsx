import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { getExpenses } from "@/app/actions/expenses";
import { ExpensesContent } from "@/components/expenses/expenses-content";

export default async function ExpensesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const expenses = await getExpenses();

  return <ExpensesContent expenses={expenses} currentUserId={user.id} />;
}
