"use server";

import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function listGenerations() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((mod) => mod.headers()),
  });

  if (!session?.user) {
    return [];
  }

  const generations = await db
    .select()
    .from(generation)
    .where(eq(generation.userId, session.user.id))
    .orderBy(desc(generation.createdAt));

  return generations;
}

