import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
