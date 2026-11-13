import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewEnabled } from "@/lib/env";
import { PreviewClient } from "./preview-client";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

/** Dev tool: every primitive in every state, light/dark, three densities. */
export default function PreviewPage() {
  if (!previewEnabled) notFound();
  return <PreviewClient />;
}
