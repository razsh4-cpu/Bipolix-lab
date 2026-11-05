import { z } from "zod";

// Vendor-neutral printer status, as sent by a bridge to POST /api/bridge/printer-status.
export const NozzleTemp = z.object({
  index: z.number().int().min(0).max(7),
  current: z.number().min(-50).max(600),
  target: z.number().min(0).max(600).nullable(),
});

export const HmsAlert = z.object({
  code: z.string().regex(/^[0-9A-F]{4}(_[0-9A-F]{4}){3}$/),
});

export const FilamentSlot = z.object({
  slot: z.string().max(10),
  type: z.string().max(40).nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/).nullable(),
  active: z.boolean(),
});

export const NormalizedPrinterStatus = z.object({
  state: z.string().max(40).nullable(),
  jobName: z.string().max(200).nullable(),
  progressPercent: z.number().int().min(0).max(100).nullable(),
  remainingMinutes: z.number().int().min(0).max(100_000).nullable(),
  layer: z.number().int().min(0).max(1_000_000).nullable(),
  totalLayers: z.number().int().min(0).max(1_000_000).nullable(),
  nozzleTemps: z.array(NozzleTemp).max(8),
  bedTemp: z.number().min(-50).max(300).nullable(),
  chamberTemp: z.number().min(-50).max(200).nullable(),
  hmsAlerts: z.array(HmsAlert).max(50),
  filaments: z.array(FilamentSlot).max(40).default([]),
});
export type NormalizedPrinterStatus = z.infer<typeof NormalizedPrinterStatus>;
export type FilamentSlot = z.infer<typeof FilamentSlot>;

export const BridgeReport = z.object({
  printers: z
    .array(
      z.object({
        serial: z.string().min(4).max(64).regex(/^[A-Za-z0-9]+$/),
        online: z.boolean(),
        reportedAt: z.iso.datetime(),
        status: NormalizedPrinterStatus.nullable(),
      }),
    )
    .min(1)
    .max(50),
});
export type BridgeReport = z.infer<typeof BridgeReport>;
