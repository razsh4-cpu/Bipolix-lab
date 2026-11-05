// Fixtures below are SYNTHETIC: hand-written from community-documented field
// names, not captured from a real X2D. Replace with real captures once available.
import { describe, expect, it } from "vitest";
import { formatHmsCode, mergeReport, normalizeBambuState, unpackTemp } from "@/integrations/bambu/report";
import { NormalizedPrinterStatus } from "@/integrations/printer-status";

describe("Bambu report parsing", () => {
  it("normalises a single-nozzle style report", () => {
    const state = mergeReport({}, {
      print: {
        gcode_state: "RUNNING", subtask_name: "bracket", mc_percent: 42, mc_remaining_time: 37,
        layer_num: 120, total_layer_num: 300, nozzle_temper: 219.6, nozzle_target_temper: 220,
        bed_temper: 55, chamber_temper: 31, hms: [],
      },
    });
    const s = normalizeBambuState(state);
    expect(s).toMatchObject({
      state: "RUNNING", jobName: "bracket", progressPercent: 42, remainingMinutes: 37, layer: 120, totalLayers: 300,
      nozzleTemps: [{ index: 0, current: 219.6, target: 220 }], bedTemp: 55, chamberTemp: 31, hmsAlerts: [],
    });
    expect(NormalizedPrinterStatus.safeParse(s).success).toBe(true);
  });

  it("merges partial updates into the previous state", () => {
    let state = mergeReport({}, { print: { gcode_state: "RUNNING", mc_percent: 10, device: { extruder: { info: [{ id: 0, temp: 200 }] } } } });
    state = mergeReport(state, { print: { mc_percent: 11 } });
    state = mergeReport(state, { info: { command: "get_version" } });
    const s = normalizeBambuState(state);
    expect(s.state).toBe("RUNNING");
    expect(s.progressPercent).toBe(11);
  });

  it("decodes packed dual-nozzle temperatures", () => {
    expect(unpackTemp(220 * 0x10000 + 215)).toEqual({ current: 215, target: 220 });
    expect(unpackTemp(25)).toEqual({ current: 25, target: null });
    const s = normalizeBambuState(mergeReport({}, {
      print: { device: { extruder: { info: [{ id: 0, temp: 220 * 0x10000 + 218 }, { id: 1, temp: 30 }] }, ctc: { info: { temp: 45 * 0x10000 + 40 } } } },
    }));
    expect(s.nozzleTemps).toEqual([{ index: 0, current: 218, target: 220 }, { index: 1, current: 30, target: null }]);
    expect(s.chamberTemp).toBe(40);
  });

  it("formats and de-duplicates HMS codes", () => {
    expect(formatHmsCode(0x03001100, 0x00020001)).toBe("0300_1100_0002_0001");
    const s = normalizeBambuState(mergeReport({}, { print: { hms: [{ attr: 0x03001100, code: 0x00020001 }, { attr: 0x03001100, code: 0x00020001 }, { bad: 1 }] } }));
    expect(s.hmsAlerts).toEqual([{ code: "0300_1100_0002_0001" }]);
  });

  it("reads AMS trays and the external spool", () => {
    const s = normalizeBambuState(mergeReport({}, {
      print: {
        ams: { tray_now: "1", ams: [{ id: "0", tray: [{ id: "0", tray_type: "PLA", tray_color: "FF0000FF" }, { id: "1", tray_type: "PETG", tray_color: "00FF00FF" }, { id: "2" }] }] },
        vt_tray: { tray_type: "TPU", tray_color: "000000FF" },
      },
    }));
    expect(s.filaments).toEqual([
      { slot: "A1", type: "PLA", color: "#FF0000", active: false },
      { slot: "A2", type: "PETG", color: "#00FF00", active: true },
      { slot: "EXT", type: "TPU", color: "#000000", active: false },
    ]);
  });

  it("never throws on unexpected shapes", () => {
    for (const junk of [null, 5, "x", { print: null }, { print: { mc_percent: "abc", device: { extruder: { info: "x" } } } }]) {
      const s = normalizeBambuState(mergeReport({}, junk));
      expect(NormalizedPrinterStatus.safeParse(s).success).toBe(true);
    }
    expect(normalizeBambuState(mergeReport({}, { print: { mc_percent: 250 } })).progressPercent).toBeNull();
  });
});
