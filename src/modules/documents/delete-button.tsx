"use client";

import { useState, useTransition } from "react";
import { deleteLabDocumentAction } from "./actions";

// Two taps (no browser confirm dialog): "מחיקה" then "בטוח? למחוק".
export function DeleteDocumentButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) {
    return <button type="button" onClick={() => setArmed(true)} className="text-sm text-red-700 underline">מחיקה</button>;
  }
  return (
    <span className="flex items-center gap-2 text-sm">
      <button type="button" disabled={pending} onClick={() => start(() => deleteLabDocumentAction(id))} className="rounded bg-red-700 px-2 py-0.5 text-white">
        {pending ? "מוחק…" : "בטוח? למחוק"}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="text-slate-600 underline">ביטול</button>
    </span>
  );
}
