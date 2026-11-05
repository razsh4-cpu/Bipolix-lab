// Parsing of Bambu Lab local MQTT reports (topic device/<serial>/report).
//
// Field names follow community documentation (ha-bambulab, bambulabs_api);
// Bambu does not publish an official schema. X2D reports have NOT been
// verified against a real printer yet, so every field is optional and the
// parser never throws on unknown shapes.
import type { FilamentSlot, NormalizedPrinterStatus } from "@/integrations/printer-status";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type PrintState = { [key: string]: Json };

function isObject(v: unknown): v is { [key: string]: Json } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Several models send only changed fields; merge each message into the last known state.
export function mergeReport(previous: PrintState, message: unknown): PrintState {
  if (!isObject(message) || !isObject(message.print)) return previous;
  return deepMerge(previous, message.print);
}

function deepMerge(target: PrintState, source: { [key: string]: Json }): PrintState {
  const out: PrintState = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const current = out[key];
    out[key] = isObject(value) && isObject(current) ? deepMerge(current, value) : value;
  }
  return out;
}

function num(v: Json | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
}

function int(v: Json | undefined, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const n = num(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r < min || r > max ? null : r;
}

function str(v: Json | undefined, max = 200): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
}

// Dual-nozzle models report temperatures packed into one integer:
// low 16 bits = current, high 16 bits = target (as decoded by ha-bambulab).
export function unpackTemp(value: Json | undefined): { current: number; target: number | null } | null {
  const n = num(value);
  if (n === null) return null;
  if (n > 0xffff) return { current: n & 0xffff, target: Math.floor(n / 0x10000) & 0xffff };
  return { current: n, target: null };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function nozzleTemps(p: PrintState): NormalizedPrinterStatus["nozzleTemps"] {
  const device = p.device;
  const info = isObject(device) && isObject(device.extruder) ? device.extruder.info : undefined;
  if (Array.isArray(info) && info.length > 0) {
    return info
      .map((entry, i) => {
        if (!isObject(entry)) return null;
        const t = unpackTemp(entry.temp);
        if (!t) return null;
        const index = int(entry.id, 0, 7) ?? i;
        return { index, current: round1(t.current), target: t.target };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, 8);
  }
  const current = num(p.nozzle_temper);
  if (current === null) return [];
  const target = num(p.nozzle_target_temper);
  return [{ index: 0, current: round1(current), target: target === null ? null : round1(target) }];
}

function chamberTemp(p: PrintState): number | null {
  const direct = num(p.chamber_temper);
  if (direct !== null) return round1(direct);
  const device = p.device;
  if (isObject(device) && isObject(device.ctc) && isObject(device.ctc.info)) {
    const t = unpackTemp(device.ctc.info.temp);
    if (t) return round1(t.current);
  }
  return null;
}

const hex4 = (n: number) => (n & 0xffff).toString(16).toUpperCase().padStart(4, "0");

// HMS entries are {attr, code}; Bambu shows them as AAAA_BBBB_CCCC_DDDD.
export function formatHmsCode(attr: number, code: number): string {
  return `${hex4(Math.floor(attr / 0x10000))}_${hex4(attr)}_${hex4(Math.floor(code / 0x10000))}_${hex4(code)}`;
}

function hmsAlerts(p: PrintState): NormalizedPrinterStatus["hmsAlerts"] {
  if (!Array.isArray(p.hms)) return [];
  const codes = new Set<string>();
  for (const entry of p.hms) {
    if (!isObject(entry)) continue;
    const attr = num(entry.attr);
    const code = num(entry.code);
    if (attr === null || code === null) continue;
    codes.add(formatHmsCode(attr, code));
  }
  return [...codes].slice(0, 50).map((code) => ({ code }));
}

function color(v: Json | undefined): string | null {
  return typeof v === "string" && /^[0-9A-Fa-f]{6,8}$/.test(v) ? `#${v.slice(0, 6).toUpperCase()}` : null;
}

// AMS trays are labelled like the printer screen: unit letter + slot number (A1…D4).
// tray_now "254"/"255" is the external spool / nothing loaded.
function filaments(p: PrintState): FilamentSlot[] {
  const out: FilamentSlot[] = [];
  const ams = isObject(p.ams) ? p.ams : null;
  const trayNow = ams ? str(ams.tray_now, 4) : null;
  const units = ams && Array.isArray(ams.ams) ? ams.ams : [];
  units.forEach((unit, u) => {
    if (!isObject(unit) || !Array.isArray(unit.tray)) return;
    const unitId = int(unit.id, 0, 127) ?? u;
    unit.tray.forEach((tray, t) => {
      if (!isObject(tray)) return;
      const trayId = int(tray.id, 0, 3) ?? t;
      const type = str(tray.tray_type, 40);
      if (!type) return;
      out.push({
        slot: `${String.fromCharCode(65 + (unitId % 26))}${trayId + 1}`,
        type,
        color: color(tray.tray_color),
        active: trayNow === String(unitId * 4 + trayId),
      });
    });
  });
  if (isObject(p.vt_tray)) {
    const type = str(p.vt_tray.tray_type, 40);
    if (type) out.push({ slot: "EXT", type, color: color(p.vt_tray.tray_color), active: trayNow === "254" });
  }
  return out.slice(0, 40);
}

export function normalizeBambuState(p: PrintState): NormalizedPrinterStatus {
  const bed = num(p.bed_temper);
  return {
    state: str(p.gcode_state, 40),
    jobName: str(p.subtask_name) ?? str(p.gcode_file),
    progressPercent: int(p.mc_percent, 0, 100),
    remainingMinutes: int(p.mc_remaining_time, 0, 100_000),
    layer: int(p.layer_num, 0, 1_000_000),
    totalLayers: int(p.total_layer_num, 0, 1_000_000),
    nozzleTemps: nozzleTemps(p),
    bedTemp: bed === null ? null : round1(bed),
    chamberTemp: chamberTemp(p),
    hmsAlerts: hmsAlerts(p),
    filaments: filaments(p),
  };
}

// Request for a full status snapshot. Use sparingly: it loads the printer.
export const PUSHALL_REQUEST = { pushing: { sequence_id: "0", command: "pushall" } };
