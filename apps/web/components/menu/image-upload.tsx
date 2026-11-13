"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { menuImageUrl } from "@/lib/menu/image-url";

const SIZE = 1200;

/** Centre-crops to a square and re-encodes as WebP in the browser before upload. */
async function cropToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  if (side < 600) throw new Error("Use an image at least 600 × 600 px.");
  const canvas = document.createElement("canvas");
  const out = Math.min(SIZE, side);
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can’t process images.");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn’t process the image."))), "image/webp", 0.85),
  );
}

export function ImageUpload({ value, onChange }: { value: string | null; onChange: (path: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = menuImageUrl(value);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToSquare(file);
      const body = new FormData();
      body.append("file", new File([blob], "item.webp", { type: "image/webp" }));
      const res = await fetch("/api/menu/images", { method: "POST", body });
      const json = (await res.json()) as { data?: { path: string }; error?: { message: string } };
      if (!res.ok || !json.data) throw new Error(json.error?.message ?? "Upload failed.");
      onChange(json.data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={url ? "Replace image" : "Upload image"}
        className={cn(
          "press relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-md border-2 border-dashed",
          "transition-[border-color,background-color] duration-[var(--motion-fast)] ease-out",
          url ? "border-transparent" : "border-border-strong bg-surface-2 hover-fine:border-primary hover-fine:bg-primary-soft",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of a user upload
          <img src={url} alt="" className="swap-in size-full object-cover" />
        ) : (
          <ImagePlus className="size-7 text-muted" aria-hidden />
        )}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-surface/70 backdrop-blur-[2px]">
            <Spinner label="Uploading" />
          </span>
        ) : null}
      </button>
      <div className="flex min-w-0 flex-col gap-2 text-small text-muted">
        <p>Square, at least 600 × 600 px. We crop to the centre.</p>
        {error ? <p className="text-danger" role="alert">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
            {url ? "Replace" : "Upload"}
          </Button>
          {url ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} disabled={busy}>
              <Trash2 aria-hidden /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
