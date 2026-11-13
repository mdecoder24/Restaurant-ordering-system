import "server-only";
import QRCode from "qrcode";
import { clientEnv } from "@/lib/env";

/** QR encodes https://<domain>/t/<qr_token> (Architecture §11). */
export function guestUrl(qrToken: string) {
  return `${clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/t/${qrToken}`;
}

/** SVG markup for on-screen previews. Error correction M survives scuffed table tents. */
export async function qrSvg(qrToken: string) {
  return QRCode.toString(guestUrl(qrToken), { type: "svg", errorCorrectionLevel: "M", margin: 1 });
}

export async function qrPng(qrToken: string, width = 1024) {
  return QRCode.toBuffer(guestUrl(qrToken), { errorCorrectionLevel: "M", margin: 2, width });
}
