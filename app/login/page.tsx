import { redirect } from "next/navigation";
import { getUsers, getCurrentUser } from "@/app/actions/auth";
import { LoginForm } from "@/components/login/login-form";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  const users = await getUsers();

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: "url('/login.jpg')" }}
    >
      <div className="w-full max-w-sm bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Weebs World Xplorers</h1>
          <p className="text-muted-foreground text-sm mt-1">Thailand Trip 2025</p>
        </div>

        <LoginForm users={users} />
      </div>
    </div>
  );
}
