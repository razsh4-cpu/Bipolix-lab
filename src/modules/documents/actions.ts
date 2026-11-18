"use server";

import { del, head } from "@vercel/blob";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { DOCUMENT_CONTENT_TYPES, LabDocumentDetails, MAX_DOCUMENT_BYTES, UploadedFile, documentPrefix } from "./schema";
import { createLabDocument, deleteLabDocument } from "./service";

async function actor() {
  const ctx = await requirePermission("document.manage");
  if (ctx.isGuest) redirect("/login");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

// Called after the browser has uploaded the file straight to Blob storage.
export async function createLabDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const values = formToObject(formData);
  const file = UploadedFile.safeParse(values);
  if (!file.success || !file.data.blobPathname.startsWith(documentPrefix(who.organizationId))) {
    return { ok: false, message: "העלאת הקובץ נכשלה, נסו שוב" };
  }
  const discard = () => del(file.data.blobPathname).catch(() => undefined);

  const parsed = LabDocumentDetails.safeParse(values);
  if (!parsed.success) {
    await discard();
    return validationError(parsed.error, formData);
  }

  // Trust what storage reports, not what the browser sent.
  let stored;
  try {
    stored = await head(file.data.blobPathname);
  } catch {
    return { ok: false, message: "הקובץ לא נמצא באחסון, נסו להעלות שוב" };
  }
  if (stored.size > MAX_DOCUMENT_BYTES || !DOCUMENT_CONTENT_TYPES.includes(stored.contentType)) {
    await discard();
    return { ok: false, message: "סוג או גודל הקובץ אינו נתמך" };
  }

  try {
    await createLabDocument(db, who, parsed.data, {
      fileName: file.data.fileName,
      blobPathname: stored.pathname,
      contentType: stored.contentType,
      sizeBytes: stored.size,
    });
  } catch (error) {
    await discard();
    if (error instanceof DomainError) return { ok: false, message: error.message };
    throw error;
  }
  redirect("/documents");
}

export async function deleteLabDocumentAction(id: string): Promise<void> {
  const who = await actor();
  const pathname = await deleteLabDocument(db, who, id);
  // The record is gone either way; a leftover file is harmless.
  await del(pathname).catch(() => undefined);
  redirect("/documents");
}
