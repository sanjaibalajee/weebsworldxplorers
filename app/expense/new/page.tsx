import { redirect } from "next/navigation";
import { getCurrentUser, getUsers } from "@/app/actions/auth";
import { getAllUsersWithPots } from "@/app/actions/pot";
import { AddExpenseForm } from "@/components/expense/add-expense-form";

export default async function AddExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const params = await searchParams;
  const users = await getUsers();
  const isAdmin = currentUser.name.toLowerCase() === "admin";

  // Get pot balances if admin
  let usersWithPots: { id: string; name: string; potBalance: number }[] = [];
  if (isAdmin) {
    const potResult = await getAllUsersWithPots();
    if (potResult.success && potResult.users) {
      usersWithPots = potResult.users;
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-8 max-w-md mx-auto">
      <AddExpenseForm
        currentUser={currentUser}
        users={users}
        isAdmin={isAdmin}
        usersWithPots={usersWithPots}
        initialType={params.type === "pot" ? "pot" : undefined}
      />
    </div>
  );
}
