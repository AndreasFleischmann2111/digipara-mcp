import { z } from "zod";
import { getElevator } from "../store/elevator_store.js";

export const GetSvgPreviewSchema = z.object({
  model_id: z
    .string()
    .describe("Die model_id des zuvor erstellten Aufzugs (z.B. LD-OTIS-123456)"),
  view_type: z
    .enum(["top", "section", "front"])
    .default("top")
    .describe("Ansichtstyp: top=Grundriss, section=Schnitt, front=Kabinenfront")
});

export type GetSvgPreviewInput = z.infer<typeof GetSvgPreviewSchema>;

function generateSvg(
  view_type: string,
  shaft_width: number,
  shaft_depth: number,
  pit_depth: number,
  overhead: number,
  manufacturer: string,
  load_kg: number
): string {
  const scale = 0.15; // mm → px
  const w = Math.round(shaft_width * scale);
  const d = Math.round(shaft_depth * scale);
  const pit = Math.round(pit_depth * scale);
  const oh = Math.round(overhead * scale);
  const padding = 60;

  if (view_type === "top") {
    // Grundriss: 2 Rechtecke in mm-Koordinaten
    // Äußeres Rechteck: 2200 x 2500, Ursprung (1,1)
    // Inneres Rechteck:  1800 x 2100, Ursprung (200,200)
    const S = 0.18; // Scale: mm → px
    const pad = 50; // Rand für Beschriftungen

    const outerX = 1, outerY = 1, outerW = 2200, outerH = 2500;
    const innerX = 200, innerY = 200, innerW = 1800, innerH = 2100;

    // SVG-Gesamtgröße
    const svgW = Math.round((outerX + outerW) * S) + pad * 2;
    const svgH = Math.round((outerY + outerH) * S) + pad * 2 + 30;

    // Hilfsfunktion: mm → px (mit Offset für Padding)
    const px = (mm: number) => Math.round(mm * S) + pad;
    const py = (mm: number) => Math.round(mm * S) + pad + 25; // +25 für Titel

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="100%" height="100%" fill="#f8f8f8"/>

  <!-- Titel -->
  <text x="${svgW / 2}" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#222">
    Schacht Grundriss – ${manufacturer.toUpperCase()} ${load_kg} kg
  </text>

  <!-- Äußeres Rechteck: 2200 x 2500 @ (1,1) -->
  <rect x="${px(outerX)}" y="${py(outerY)}"
        width="${Math.round(outerW * S)}" height="${Math.round(outerH * S)}"
        fill="#e8e8e8" stroke="#222" stroke-width="2.5"/>
  <text x="${px(outerX) + 5}" y="${py(outerY) + 14}"
        font-family="Arial" font-size="9" fill="#555">Schacht (${outerW} x ${outerH})</text>

  <!-- Inneres Rechteck: 1800 x 2100 @ (200,200) -->
  <rect x="${px(innerX)}" y="${py(innerY)}"
        width="${Math.round(innerW * S)}" height="${Math.round(innerH * S)}"
        fill="#d0e8ff" stroke="#0066cc" stroke-width="1.5"/>
  <text x="${px(innerX) + Math.round(innerW * S) / 2}" y="${py(innerY) + Math.round(innerH * S) / 2 + 4}"
        text-anchor="middle" font-family="Arial" font-size="10" fill="#0066cc">
    Kabine (${innerW} x ${innerH})
  </text>

  <!-- Bemaßung: Breite äußeres Rechteck -->
  <line x1="${px(outerX)}" y1="${py(outerY + outerH) + 18}"
        x2="${px(outerX + outerW)}" y2="${py(outerY + outerH) + 18}"
        stroke="#444" stroke-width="1"/>
  <line x1="${px(outerX)}" y1="${py(outerY + outerH) + 12}"
        x2="${px(outerX)}" y2="${py(outerY + outerH) + 24}"
        stroke="#444" stroke-width="1"/>
  <line x1="${px(outerX + outerW)}" y1="${py(outerY + outerH) + 12}"
        x2="${px(outerX + outerW)}" y2="${py(outerY + outerH) + 24}"
        stroke="#444" stroke-width="1"/>
  <text x="${px(outerX + outerW / 2)}" y="${py(outerY + outerH) + 34}"
        text-anchor="middle" font-family="Arial" font-size="10" fill="#333">${outerW} mm</text>

  <!-- Bemaßung: Höhe äußeres Rechteck -->
  <line x1="${px(outerX + outerW) + 18}" y1="${py(outerY)}"
        x2="${px(outerX + outerW) + 18}" y2="${py(outerY + outerH)}"
        stroke="#444" stroke-width="1"/>
  <line x1="${px(outerX + outerW) + 12}" y1="${py(outerY)}"
        x2="${px(outerX + outerW) + 24}" y2="${py(outerY)}"
        stroke="#444" stroke-width="1"/>
  <line x1="${px(outerX + outerW) + 12}" y1="${py(outerY + outerH)}"
        x2="${px(outerX + outerW) + 24}" y2="${py(outerY + outerH)}"
        stroke="#444" stroke-width="1"/>
  <text x="${px(outerX + outerW) + 34}" y="${py(outerY + outerH / 2) + 4}"
        text-anchor="middle" font-family="Arial" font-size="10" fill="#333"
        transform="rotate(90, ${px(outerX + outerW) + 34}, ${py(outerY + outerH / 2) + 4})">${outerH} mm</text>

  <!-- Koordinaten-Ursprung Hinweis -->
  <text x="${px(0)}" y="${py(0) - 4}" font-family="Arial" font-size="8" fill="#999">(0,0)</text>
  <circle cx="${px(0)}" cy="${py(0)}" r="2" fill="#999"/>
</svg>`;
  }

  if (view_type === "section") {
    // Schnitt: Schacht von der Seite mit Grube und Überfahrt
    const totalHeight = pit + d + oh;
    const totalW = w + padding * 2;
    const totalH = totalHeight + padding * 2;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="100%" height="100%" fill="#f8f8f8"/>

  <!-- Titel -->
  <text x="${totalW / 2}" y="20" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">
    Schacht Schnitt – ${manufacturer.toUpperCase()} ${load_kg} kg
  </text>

  <!-- Überfahrt -->
  <rect x="${padding}" y="${padding}" width="${w}" height="${oh}"
        fill="#fff3cd" stroke="#222" stroke-width="2" stroke-dasharray="6,3"/>
  <text x="${padding + w / 2}" y="${padding + oh / 2 + 4}"
        text-anchor="middle" font-family="Arial" font-size="9" fill="#856404">
    Überfahrt ${overhead} mm
  </text>

  <!-- Schacht (Fahrbahn) -->
  <rect x="${padding}" y="${padding + oh}" width="${w}" height="${d}"
        fill="#e8f4ff" stroke="#222" stroke-width="2"/>

  <!-- Kabine (vereinfacht) -->
  <rect x="${padding + 15}" y="${padding + oh + 20}" width="${w - 30}" height="${d - 40}"
        fill="#d0e8ff" stroke="#0066cc" stroke-width="1.5"/>
  <text x="${padding + w / 2}" y="${padding + oh + d / 2 + 4}"
        text-anchor="middle" font-family="Arial" font-size="10" fill="#0066cc">Kabine</text>

  <!-- Grube -->
  <rect x="${padding}" y="${padding + oh + d}" width="${w}" height="${pit}"
        fill="#f0f0f0" stroke="#222" stroke-width="2" stroke-dasharray="6,3"/>
  <text x="${padding + w / 2}" y="${padding + oh + d + pit / 2 + 4}"
        text-anchor="middle" font-family="Arial" font-size="9" fill="#666">
    Grube ${pit_depth} mm
  </text>

  <!-- Bemaßung Gesamthöhe -->
  <line x1="${padding + w + 20}" y1="${padding}" x2="${padding + w + 20}" y2="${padding + totalHeight}"
        stroke="#666" stroke-width="1"/>
  <text x="${padding + w + 35}" y="${padding + totalHeight / 2}"
        text-anchor="middle" font-family="Arial" font-size="9" fill="#444"
        transform="rotate(90, ${padding + w + 35}, ${padding + totalHeight / 2})">
    ${overhead + shaft_depth + pit_depth} mm
  </text>
</svg>`;
  }

  // front view
  const cabinH = d - 40;
  const totalW = w + padding * 2;
  const totalH = cabinH + padding * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="100%" height="100%" fill="#f8f8f8"/>

  <!-- Titel -->
  <text x="${totalW / 2}" y="20" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">
    Kabinenfront – ${manufacturer.toUpperCase()} ${load_kg} kg
  </text>

  <!-- Kabinenrahmen -->
  <rect x="${padding}" y="${padding}" width="${w}" height="${cabinH}"
        fill="#e8f4ff" stroke="#0066cc" stroke-width="2"/>

  <!-- Tür -->
  <rect x="${padding + w / 2 - 25}" y="${padding + cabinH - 70}" width="50" height="70"
        fill="#fff" stroke="#0066cc" stroke-width="1.5"/>
  <line x1="${padding + w / 2}" y1="${padding + cabinH - 70}"
        x2="${padding + w / 2}" y2="${padding + cabinH}"
        stroke="#0066cc" stroke-width="1"/>

  <!-- Bemaßung -->
  <line x1="${padding}" y1="${padding + cabinH + 20}" x2="${padding + w}" y2="${padding + cabinH + 20}"
        stroke="#666" stroke-width="1"/>
  <text x="${padding + w / 2}" y="${padding + cabinH + 35}"
        text-anchor="middle" font-family="Arial" font-size="10" fill="#444">${shaft_width} mm</text>
</svg>`;
}

export async function getSvgPreview(input: GetSvgPreviewInput): Promise<string> {
  const elevator = getElevator(input.model_id);

  if (!elevator) {
    return `❌ Kein Aufzug mit model_id "${input.model_id}" gefunden.\n\nBitte zuerst einen Aufzug mit create_elevator erstellen.`;
  }

  const viewLabels: Record<string, string> = {
    top: "Grundriss (Draufsicht)",
    section: "Schacht Schnitt",
    front: "Kabinenfront"
  };

  const svg = generateSvg(
    input.view_type,
    elevator.shaft_width_mm,
    elevator.shaft_depth_mm,
    elevator.pit_depth_mm,
    elevator.overhead_mm,
    elevator.manufacturer,
    elevator.load_kg
  );

  return `📐 SVG ${viewLabels[input.view_type]} – ${elevator.model_id}\n\n${svg}`;
}
