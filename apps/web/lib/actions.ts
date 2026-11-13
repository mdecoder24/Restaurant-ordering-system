import "server-only";
import type { z } from "zod";
import { staffForApi, type Role, type StaffContext } from "@/lib/auth/dal";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

export const invalid = (error: z.ZodError): ActionResult<never> => ({
  ok: false,
  error: "Check the highlighted fields.",
  fieldErrors: zodFieldErrors(error),
});

/** Resolves the signed-in staff member for a server action, or an error result. */
export async function actionStaff(roles: readonly Role[]): Promise<StaffContext | ActionResult<never>> {
  const staff = await staffForApi(roles);
  return staff ?? { ok: false, error: "You don’t have permission to do that." };
}

export function isResult(v: unknown): v is ActionResult<never> {
  return typeof v === "object" && v !== null && "ok" in v;
}
