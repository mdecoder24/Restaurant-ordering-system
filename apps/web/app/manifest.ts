import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { themeColors } from "@/lib/theme-colors";

/** PWA manifest: staff can install the dashboard and KDS; guests can add the menu. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.fullName,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/app",
    display: "standalone",
    background_color: themeColors.light,
    theme_color: themeColors.light,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
