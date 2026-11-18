import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getOrgContext } from "@/lib/session";
import { getLabDocument } from "@/modules/documents/service";

// Streams a document from the private Blob store to signed-in members only.
export async function GET(request: Request, { params }: RouteContext<"/api/documents/[id]/file">) {
  const ctx = await getOrgContext();
  if (ctx.isGuest || !ctx.organization || !ctx.role || !can(ctx.role, "document.view")) {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const doc = await getLabDocument(db, ctx.organization.id, id);
  if (!doc) return new Response("Not found", { status: 404 });

  const blob = await get(doc.blobPathname, { access: "private" });
  if (!blob || blob.statusCode !== 200) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  const encoded = encodeURIComponent(doc.fileName);
  return new Response(blob.stream, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
