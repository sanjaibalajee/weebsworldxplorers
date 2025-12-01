import { db } from "@/app/db/drizzle";
import { users } from "@/app/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const allUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(users.name);

  return NextResponse.json({ users: allUsers });
}
