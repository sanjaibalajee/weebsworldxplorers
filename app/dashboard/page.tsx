import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-md mx-auto">
      <DashboardHeader user={user} />

      <div className="text-center text-muted-foreground py-12">
        Dashboard coming soon...
      </div>
    </div>
  );
}
