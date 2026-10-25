"use client";

import type { ActionState } from "@/lib/forms";

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 aria-[invalid=true]:border-red-500";

type BaseProps = {
  name: string;
  label: string;
  state: ActionState;
  required?: boolean;
  hint?: string;
};

function FieldShell({ name, label, state, required, hint, children }: BaseProps & { children: React.ReactNode }) {
  const errors = state.fieldErrors?.[name];
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && !errors && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} id={`${name}-error`} className="mt-1 text-sm text-red-700">
          {e}
        </p>
      ))}
    </div>
  );
}

export function TextField(
  props: BaseProps & { defaultValue?: string | number; type?: string; dir?: "ltr" | "rtl"; inputMode?: "decimal" | "numeric"; step?: string; min?: string; list?: string },
) {
  const invalid = Boolean(props.state.fieldErrors?.[props.name]);
  return (
    <FieldShell {...props}>
      <input
        id={props.name}
        name={props.name}
        type={props.type ?? "text"}
        dir={props.dir}
        inputMode={props.inputMode}
        step={props.step}
        min={props.min}
        list={props.list}
        defaultValue={props.defaultValue}
        required={props.required}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${props.name}-error` : undefined}
        className={INPUT}
      />
    </FieldShell>
  );
}

export function TextAreaField(props: BaseProps & { defaultValue?: string; rows?: number }) {
  const invalid = Boolean(props.state.fieldErrors?.[props.name]);
  return (
    <FieldShell {...props}>
      <textarea
        id={props.name}
        name={props.name}
        rows={props.rows ?? 3}
        defaultValue={props.defaultValue}
        required={props.required}
        aria-invalid={invalid}
        className={INPUT}
      />
    </FieldShell>
  );
}

export function SelectField(
  props: BaseProps & { defaultValue?: string; options: { value: string; label: string }[]; placeholder?: string },
) {
  const invalid = Boolean(props.state.fieldErrors?.[props.name]);
  return (
    <FieldShell {...props}>
      <select
        id={props.name}
        name={props.name}
        defaultValue={props.defaultValue ?? ""}
        required={props.required}
        aria-invalid={invalid}
        className={INPUT}
      >
        {props.placeholder !== undefined && <option value="">{props.placeholder}</option>}
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
      {state.message}
    </p>
  );
}
