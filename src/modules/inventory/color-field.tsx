"use client";

import { useState } from "react";
import { COLOR_PATTERN, MATERIAL_COLOR_PRESETS, MORE_MATERIAL_COLORS, colorName } from "@/lib/colors";
import type { ActionState } from "@/lib/forms";

const SWATCH = "h-9 w-9 rounded-full ring-1 ring-inset ring-slate-400/70 outline-offset-2 aria-pressed:outline-3 aria-pressed:outline-blue-600";

export function ColorField({ state, defaultValue }: { state: ActionState; defaultValue?: string | null }) {
  const submitted = state.values?.color;
  const [color, setColor] = useState<string>(typeof submitted === "string" ? submitted : (defaultValue ?? ""));
  const isCustom = color !== "" && !MATERIAL_COLOR_PRESETS.some((c) => c.hex === color);
  const [showMore, setShowMore] = useState(isCustom);
  const errors = state.fieldErrors?.color;

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm font-medium">צבע</legend>
      <input type="hidden" name="color" value={color} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={color === ""}
          onClick={() => setColor("")}
          className="h-9 rounded-full border border-slate-300 px-3 text-sm aria-pressed:border-blue-600 aria-pressed:bg-blue-50"
        >
          ללא
        </button>
        {MATERIAL_COLOR_PRESETS.map((c) => (
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
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((x) => !x)}
          className="h-9 rounded-full border border-slate-300 px-3 text-sm aria-expanded:border-blue-600 aria-expanded:bg-blue-50"
        >
          {isCustom ? "צבע אחר (נבחר)" : "צבע אחר"}
        </button>
      </div>
      {showMore && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap gap-2">
            {MORE_MATERIAL_COLORS.map((c) => (
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
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <input
              type="color"
              value={COLOR_PATTERN.test(color) ? color : "#888888"}
              onChange={(e) => setColor(e.target.value.toLowerCase())}
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="בחירת כל צבע"
            />
            כל צבע אחר
          </label>
        </div>
      )}
      <p className="mt-1 text-xs text-slate-500">
        {color ? `נבחר: ${colorName(color)}` : "בלי צבע."}
      </p>
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-sm text-red-700">{e}</p>
      ))}
    </fieldset>
  );
}
