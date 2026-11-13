import { ImageResponse } from "next/og";
import { printColors } from "@/lib/theme-colors";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for guests and staff who "Add to Home Screen". */
export default function AppleIcon() {
  const tile = { position: "absolute" as const, width: 38, height: 38, borderRadius: 11, background: "white" };
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: printColors.brand }}>
        <div style={{ ...tile, left: 34, top: 34 }} />
        <div style={{ ...tile, left: 108, top: 34 }} />
        <div style={{ ...tile, left: 34, top: 108 }} />
        <div style={{ position: "absolute", left: 110, top: 104, width: 12, height: 46, borderRadius: 6, background: "white" }} />
        <div style={{ position: "absolute", left: 116, top: 112, width: 34, height: 12, borderRadius: 6, background: "white", transform: "rotate(-40deg)" }} />
        <div style={{ position: "absolute", left: 118, top: 132, width: 34, height: 12, borderRadius: 6, background: "white", transform: "rotate(54deg)" }} />
      </div>
    ),
    size,
  );
}
