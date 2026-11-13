import { clientEnv } from "@/lib/env";

/** Public CDN URL for a menu image path (bucket is public; paths are unguessable UUIDs). */
export function menuImageUrl(path: string | null | undefined): string | null {
  if (!path || !clientEnv.NEXT_PUBLIC_SUPABASE_URL) return null;
  return `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`;
}
