"use server";

import { onboardingSchema, pinLoginSchema } from "@krudex/core/schemas";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPlatformAdmin } from "@/lib/admin/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSession, OUTLET_COOKIE, roleHome } from "./dal";
import { findMemberByPin, pinUserEmail } from "./staff-users";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function values(form: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
}

/** Only same-site relative paths, so `?next=` can never redirect off the app. */
function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

const credentials = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72),
});

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const kept = values(form, ["email"]);
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: kept };

  const limit = rateLimit(`signup:${clientIp(await headers())}`, 10, 60 * 60_000);
  if (!limit.ok) return { error: "Too many sign-up attempts. Try again later.", values: kept };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) return { error: error.message, values: kept };
  if (!data.session) return { error: "Check your inbox to confirm your email, then log in.", values: kept };
  redirect("/onboarding");
}

export async function logIn(_: FormState, form: FormData): Promise<FormState> {
  const kept = values(form, ["email"]);
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: kept };

  const ip = clientIp(await headers());
  const limit = rateLimit(`login:${ip}:${parsed.data.email}`, 8, 15 * 60_000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.`, values: kept };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email or password is incorrect.", values: kept };

  const session = await getSession();
  // Platform operators usually have no outlet; send them to /admin, not "create a business".
  const fallback =
    session.status === "ok" ? roleHome[session.role] : (await getPlatformAdmin()) ? "/admin" : "/onboarding";
  redirect(safeNext(form.get("next"), fallback));
}

/** PIN sign-in for kitchen and floor devices (Flow §5–6). Rate limited per device and outlet. */
export async function pinLogIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = pinLoginSchema.safeParse({ outletId: form.get("outletId"), pin: form.get("pin") });
  if (!parsed.success) return { error: "Enter your 4 to 6 digit PIN." };

  const ip = clientIp(await headers());
  const limit = rateLimit(`pin:${ip}:${parsed.data.outletId}`, 5, 5 * 60_000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };

  const member = await findMemberByPin(parsed.data.outletId, parsed.data.pin);
  if (!member) return { error: "That PIN didn’t match. Try again or ask your manager." };

  // Mint a one-time sign-in for the member's user and redeem it server-side, which sets the
  // normal Supabase session cookies. RLS then applies to the PIN user like anyone else.
  const admin = createAdminClient();
  const { data: user } = await admin.auth.admin.getUserById(member.userId);
  const email = user.user?.email ?? pinUserEmail(member.memberId);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.hashed_token) return { error: "Couldn’t sign you in. Try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (error) return { error: "Couldn’t sign you in. Try again." };

  (await cookies()).set(OUTLET_COOKIE, parsed.data.outletId, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  const home = member.role === "kitchen" ? `/kds/${parsed.data.outletId}` : roleHome[member.role];
  redirect(safeNext(form.get("next"), home));
}

export async function completeOnboarding(_: FormState, form: FormData): Promise<FormState> {
  const keys = ["businessName", "slug", "gstin", "outletName", "mode", "displayName"];
  const kept = values(form, keys);
  const parsed = onboardingSchema.safeParse(kept);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: kept };

  const session = await getSession();
  if (session.status === "signed-out") redirect("/login");
  if (session.status === "ok") redirect("/app");

  const supabase = await createClient();
  const { data: outletId, error } = await supabase.rpc("onboard_tenant", {
    p_tenant_name: parsed.data.businessName,
    p_slug: parsed.data.slug,
    p_outlet_name: parsed.data.outletName,
    p_mode: parsed.data.mode,
    p_display_name: parsed.data.displayName,
  });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "That web address is taken. Try another." }, values: kept };
    return { error: "Couldn’t create your business. Try again.", values: kept };
  }
  if (parsed.data.gstin) {
    const { data: tenant } = await supabase.from("outlets").select("tenant_id").eq("id", outletId).single();
    if (tenant) await supabase.from("tenants").update({ gstin: parsed.data.gstin }).eq("id", tenant.tenant_id);
  }
  (await cookies()).set(OUTLET_COOKIE, outletId, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function switchOutlet(form: FormData) {
  const id = z.uuid().safeParse(form.get("outletId"));
  const session = await getSession();
  if (!id.success || session.status !== "ok" || !session.outlets.some((o) => o.id === id.data)) return;
  (await cookies()).set(OUTLET_COOKIE, id.data, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}
