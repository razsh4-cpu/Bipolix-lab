"use client";

import { upload } from "@vercel/blob/client";
import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, validationError, type ActionState } from "@/lib/forms";
import { LAB_DOCUMENT_CATEGORY_LABELS, options } from "@/lib/labels";
import { DOCUMENT_ACCEPT, LabDocumentDetails, MAX_DOCUMENT_BYTES, documentPrefix } from "./schema";

function formValues(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && v.trim() !== "") out[k] = v.trim();
  return out;
}

export function LabDocumentForm({
  organizationId,
  action,
}: {
  organizationId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData): Promise<ActionState> => {
    const file = formData.get("file");
    formData.delete("file");
    const details = LabDocumentDetails.safeParse(formValues(formData));
    if (!(file instanceof File) || file.size === 0) {
      return {
        ok: false,
        message: "יש לבחור קובץ",
        fieldErrors: { ...(details.success ? {} : validationError(details.error).fieldErrors), file: ["יש לבחור קובץ"] },
        values: formValues(formData),
      };
    }
    if (!details.success) return validationError(details.error, formData);
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { ok: false, message: "הקובץ גדול מ-50MB", values: formValues(formData) };
    }
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100) || "file";
      const blob = await upload(`${documentPrefix(organizationId)}${safeName}`, file, {
        access: "private",
        handleUploadUrl: "/api/documents/upload",
        contentType: file.type || undefined,
      });
      formData.set("fileName", file.name);
      formData.set("blobPathname", blob.pathname);
    } catch {
      return { ok: false, message: "העלאת הקובץ נכשלה. בדקו שסוג הקובץ נתמך ונסו שוב.", values: formValues(formData) };
    }
    return action(prev, formData);
  }, initialActionState);

  const fileError = state.fieldErrors?.file?.[0];
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div>
        <label htmlFor="file" className="mb-1 block text-sm font-medium">קובץ <span className="text-red-700">*</span></label>
        <input
          id="file"
          name="file"
          type="file"
          accept={DOCUMENT_ACCEPT}
          aria-invalid={Boolean(fileError)}
          className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm file:ml-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
        />
        <p className="mt-1 text-xs text-slate-500">PDF, תמונה, Word, Excel או PowerPoint, עד 50MB</p>
        {fileError && <p className="mt-1 text-sm text-red-700">{fileError}</p>}
      </div>
      <TextField name="title" label="שם המסמך" state={state} required hint="למשל: רשימת ציוד צפוי מהמשרד" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="category" label="קטגוריה" state={state} required defaultValue="AUTHORITIES" options={options(LAB_DOCUMENT_CATEGORY_LABELS)} />
        <TextField name="documentDate" label="תאריך המסמך" type="date" state={state} />
      </div>
      <TextAreaField name="notes" label="הערות" rows={3} state={state} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>{pending ? "מעלה…" : "העלאה"}</button>
    </form>
  );
}
