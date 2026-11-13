import { NextResponse } from "next/server";
import { staffForApi } from "@/lib/auth/dal";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const types: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": {
    ext: "webp",
    magic: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
};

const fail = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

/** Menu image upload (Architecture §12: type and size checks; stored under tenant/outlet). */
export async function POST(request: Request) {
  const staff = await staffForApi(["owner", "manager"]);
  if (!staff) return fail(401, "unauthorized", "Sign in as an owner or manager.");
  if (!rateLimit(`upload:${staff.userId}`, 30, 60_000).ok) return fail(429, "rate_limited", "Too many uploads. Wait a minute.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "invalid_request", "Attach an image file.");
  if (file.size > MAX_BYTES) return fail(413, "too_large", "Images must be 5 MB or smaller.");
  const type = types[file.type];
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!type || !type.magic(bytes)) return fail(415, "unsupported_type", "Use a JPEG, PNG or WebP image.");

  const path = `${staff.outlet.tenantId}/${staff.outlet.id}/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await createAdminClient()
    .storage.from("menu-images")
    .upload(path, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return fail(500, "upload_failed", "Couldn’t upload the image. Try again.");
  return NextResponse.json({ data: { path } }, { status: 201 });
}
