import { z } from "zod";
import { mockLdoopResponse } from "../mock/ldoop_mock.js";
import { saveElevator } from "../store/elevator_store.js";

// v0.2 TODOs:
// - Echter LDOOP HTTP Call statt Mock: await fetch("https://ldoop.digipara.com/api/create", { ... })
// - Multi-Tenant Auth (API Key pro Hersteller: Otis, Schindler, TKE)
// - Weiteres Tool: get_manufacturers() – listet verfügbare Hersteller/Kataloge
// - Weiteres Tool: get_component_options(component_type) – verfügbare Optionen je Komponente
// - SVG Preview direkt im MCP Response zurückgeben (type: "image")

export const CreateElevatorSchema = z.object({
  manufacturer: z
    .enum(["otis", "schindler", "tke", "kone", "generic"])
    .describe("Aufzugshersteller"),
  load_kg: z
    .number()
    .min(200)
    .max(5000)
    .describe("Traglast in Kilogramm (z.B. 630, 1000, 1600)"),
  stops: z
    .number()
    .int()
    .min(2)
    .max(50)
    .describe("Anzahl der Haltestellen"),
  special_features: z
    .array(z.enum(["durchladung", "panorama", "maschinen_raumlos", "hydraulik"]))
    .optional()
    .default([])
    .describe("Sonderausstattungen")
});

export type CreateElevatorInput = z.infer<typeof CreateElevatorSchema>;

export async function createElevator(input: CreateElevatorInput): Promise<string> {
  const result = mockLdoopResponse(
    input.manufacturer,
    input.load_kg,
    input.stops,
    input.special_features ?? []
  );

  // Im Store speichern für nachfolgende Tool-Calls (z.B. get_svg_preview)
  saveElevator(result);

  const summary = `
✅ Aufzugsmodell erstellt: ${result.model_id}

📐 Schachtmaße:
   Breite:    ${result.shaft_width_mm} mm
   Tiefe:     ${result.shaft_depth_mm} mm
   Grube:     ${result.pit_depth_mm} mm
   Überfahrt: ${result.overhead_mm} mm

🏗️ Konfiguration:
   Hersteller:  ${result.manufacturer.toUpperCase()}
   Traglast:    ${result.load_kg} kg
   Haltestellen: ${result.stops}
   Sondermerkmale: ${result.special_features.join(", ") || "keine"}

📄 Verfügbare Ansichten (${result.views.length}):
${result.views.map(v => `   • ${v.name} → Block: ${v.dwg_block_name}`).join("\n")}

🔗 Nächste Schritte:
   - SVG Grundriss: get_svg_preview(model_id: "${result.model_id}", view_type: "top")
   - DWG Export: digipara.com/export/${result.model_id}
   - BIM/IFC:    digipara.com/bim/${result.model_id}
`.trim();

  return summary;
}
