import { db } from "@/lib/db";
import { BridgeReport } from "@/integrations/printer-status";
import { ingestBridgeReport } from "@/modules/printers/service";

const MAX_BODY_BYTES = 64 * 1024;

// Receives printer status from a bridge running on the lab's local network.
// Auth: "Authorization: Bearer <bridge token>" created in Settings.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "payload too large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = BridgeReport.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid report" }, { status: 400 });

  const result = await ingestBridgeReport(db, token, parsed.data);
  if (!result) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(result);
}
