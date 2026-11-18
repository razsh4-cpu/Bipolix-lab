import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getOrgContext } from "@/lib/session";
import { can } from "@/lib/permissions";
import { DOCUMENT_CONTENT_TYPES, MAX_DOCUMENT_BYTES, documentPrefix } from "@/modules/documents/schema";

// Issues a short-lived token so the browser can upload a document straight
// to the private Blob store (avoids the 4.5 MB request limit of functions).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ctx = await getOrgContext();
        if (ctx.isGuest || !ctx.organization || !ctx.role || !can(ctx.role, "document.manage")) {
          throw new Error("unauthorized");
        }
        if (!pathname.startsWith(documentPrefix(ctx.organization.id)) || pathname.includes("..")) {
          throw new Error("bad pathname");
        }
        return {
          allowedContentTypes: DOCUMENT_CONTENT_TYPES,
          maximumSizeInBytes: MAX_DOCUMENT_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "upload failed" }, { status: 400 });
  }
}
