export interface ElevatorModel {
  model_id: string;
  manufacturer: string;
  load_kg: number;
  stops: number;
  special_features: string[];
  shaft_width_mm: number;
  shaft_depth_mm: number;
  pit_depth_mm: number;
  overhead_mm: number;
  views: DrawingView[];
  created_at: string;
  status: "success" | "error";
}

export interface DrawingView {
  name: string;
  type: "front" | "side" | "top" | "section";
  dwg_block_name: string;
}

export function mockLdoopResponse(
  manufacturer: string,
  load_kg: number,
  stops: number,
  special_features: string[]
): ElevatorModel {
  const isPassthrough = special_features.includes("durchladung");

  return {
    model_id: `LD-${manufacturer.toUpperCase()}-${Date.now()}`,
    manufacturer,
    load_kg,
    stops,
    special_features,
    shaft_width_mm: load_kg <= 630 ? 1600 : load_kg <= 1000 ? 1900 : 2200,
    shaft_depth_mm: isPassthrough ? 2400 : 2000,
    pit_depth_mm: 1200,
    overhead_mm: 3500,
    views: [
      {
        name: "Schacht Grundriss",
        type: "top",
        dwg_block_name: `${manufacturer}_shaft_plan_${load_kg}kg`
      },
      {
        name: "Schacht Schnitt",
        type: "section",
        dwg_block_name: `${manufacturer}_shaft_section_${load_kg}kg`
      },
      {
        name: "Kabinenfront",
        type: "front",
        dwg_block_name: `${manufacturer}_car_front_${load_kg}kg`
      }
    ],
    created_at: new Date().toISOString(),
    status: "success"
  };
}
