import { z } from "zod";
import { LabDocumentCategory } from "@/generated/prisma/enums";
import { optionalDate, optionalText, requiredText } from "@/lib/forms";

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

// File types staff are likely to receive: PDFs, scans/photos, Office files, plain text.
export const DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

// Every blob of an organization lives under its own prefix.
export function documentPrefix(organizationId: string) {
  return `documents/${organizationId}/`;
}

export const LabDocumentDetails = z.object({
  title: requiredText(150),
  category: z.enum(LabDocumentCategory, { error: "יש לבחור קטגוריה" }),
  documentDate: optionalDate,
  notes: optionalText(2000),
});
export type LabDocumentDetails = z.infer<typeof LabDocumentDetails>;

export const UploadedFile = z.object({
  fileName: requiredText(255),
  blobPathname: requiredText(500),
});
