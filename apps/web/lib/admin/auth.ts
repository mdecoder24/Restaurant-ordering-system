import "server-only";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Platform operator check (A-01): a row in platform_admins for the signed-in user. */
async function lookup() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, admin: null };
  const { data } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return { user, admin: data ? { userId: user.id, email: user.email ?? "" } : null };
}

export async function getPlatformAdmin() {
  return (await lookup()).admin;
}

/** Signed out: log in. Signed in without the role: 404, so the admin surface isn't advertised. */
export async function requirePlatformAdmin() {
  const { user, admin } = await lookup();
  if (!user) redirect("/login?next=/admin");
  if (!admin) notFound();
  return admin;
}
