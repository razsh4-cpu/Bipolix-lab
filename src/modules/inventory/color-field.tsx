"use client";

import { useState } from "react";
import { COLOR_PATTERN, MATERIAL_COLOR_PRESETS, MORE_MATERIAL_COLORS, colorName } from "@/lib/colors";
import type { ActionState } from "@/lib/forms";

const PALETTE = [...MATERIAL_COLOR_PRESETS, ...MORE_MATERIAL_COLORS];
const SWATCH =
  "aspect-square w-full max-w-11 rounded-full ring-1 ring-inset ring-slate-400/70 outline-offset-2 aria-pressed:outline-3 aria-pressed:outline-blue-600";
const CHIP = "h-9 rounded-full border border-slate-300 bg-white px-3 text-sm";

// The whole palette is shown at once, so most spools are one tap away.
// "hidden" keeps the choice while the field is out of view and leaves it out of the submit.
export function ColorField({ state, defaultValue, hidden = false }: { state: ActionState; defaultValue?: string | null; hidden?: boolean }) {
  const submitted = state.values?.color;
  const [color, setColor] = useState<string>(typeof submitted === "string" ? submitted : (defaultValue ?? ""));
  const isCustom = color !== "" && !PALETTE.some((c) => c.hex === color);
  const errors = state.fieldErrors?.color;

  return (
    <fieldset className="sm:col-span-2" hidden={hidden} disabled={hidden}>
      <legend className="text-sm font-medium">צבע</legend>
      <input type="hidden" name="color" value={color} />
      <div className="mt-2 grid grid-cols-7 justify-items-center gap-2 sm:grid-cols-14">
        {PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            aria-pressed={color === c.hex}
            aria-label={c.name}
            title={c.name}
            onClick={() => setColor(c.hex)}
            className={SWATCH}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={color === ""}
          onClick={() => setColor("")}
          className={`${CHIP} aria-pressed:border-blue-600 aria-pressed:bg-blue-50`}
        >
          ללא צבע
        </button>
        <label className={`${CHIP} flex cursor-pointer items-center gap-2 ${isCustom ? "border-blue-600 bg-blue-50" : ""}`}>
          <input
            type="color"
            value={COLOR_PATTERN.test(color) ? color : "#888888"}
            onChange={(e) => setColor(e.target.value.toLowerCase())}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            aria-label="בחירת כל צבע"
          />
          צבע אחר
        </label>
      </div>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        {color ? (
          <>
            <span className="inline-block h-4 w-4 rounded-full ring-1 ring-inset ring-slate-400/70" style={{ backgroundColor: color }} />
            נבחר: {colorName(color)}
          </>
        ) : (
          "בלי צבע"
        )}
      </p>
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-sm text-red-700">{e}</p>
      ))}
    </fieldset>
  );
}
