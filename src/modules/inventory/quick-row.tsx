"use client";

import { useState, useTransition } from "react";
import { ColorSwatch } from "@/components/color-swatch";
import { quickMovementAction } from "./actions";

type Props = {
  id: string;
  name: string;
  color?: string | null;
  quantity: string;
  unit: string;
  step: string;
  isLow: boolean;
  canReceive: boolean;
  canIssue: boolean;
};

const TAP = "min-h-12 min-w-12 rounded-xl px-3 text-base font-semibold disabled:opacity-50";

export function QuickRow({ id, name, color, quantity, unit, step, isLow, canReceive, canIssue }: Props) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function move(type: "RECEIVE" | "ISSUE") {
    start(async () => {
      const result = await quickMovementAction(id, type);
      setMessage({ ok: result.ok, text: result.message ?? "" });
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3" aria-busy={pending}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium"><ColorSwatch color={color} />{name}</div>
        <div className={`text-sm tabular-nums ${isLow ? "font-semibold text-amber-700" : "text-slate-600"}`}>
          {Number(quantity)} {unit}
          {isLow && " · מתחת למינימום"}
        </div>
        {message && (
          <div role="status" className={`text-xs ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</div>
        )}
      </div>
      <div className="flex gap-2">
        {canIssue && (
          <button type="button" disabled={pending} onClick={() => move("ISSUE")} className={`${TAP} bg-slate-100 text-slate-900 hover:bg-slate-200`} aria-label={`השתמשתי ב-${Number(step)} ${unit} של ${name}`}>
            −{Number(step)}
          </button>
        )}
        {canReceive && (
          <button type="button" disabled={pending} onClick={() => move("RECEIVE")} className={`${TAP} bg-blue-600 text-white hover:bg-blue-700`} aria-label={`קיבלתי ${Number(step)} ${unit} של ${name}`}>
            +{Number(step)}
          </button>
        )}
      </div>
    </li>
  );
}
