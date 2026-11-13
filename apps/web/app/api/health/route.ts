/** Liveness probe for uptime monitors; no data, no auth. */
export function GET() {
  return Response.json({ data: { status: "ok" } });
}
