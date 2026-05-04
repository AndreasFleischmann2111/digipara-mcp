# DigiPara MCP Server – Setup Instructions for Claude Code

## Ziel
Erstelle einen funktionierenden MCP Server (`digipara-mcp`), der in Claude Desktop eingebunden werden kann.
Der Server soll einen einzigen Tool-Call `create_elevator` anbieten, der einen simulierten LDOOP-Aufruf durchführt und ein Ergebnis zurückgibt.

Dies ist ein POC – kein echter LDOOP-Endpoint wird benötigt. Der Server soll mit einem Mock-Response arbeiten, der aber die echte Datenstruktur bereits abbildet.

---

## Projektstruktur die du erstellen sollst

```
digipara-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # MCP Server Entry Point
│   ├── tools/
│   │   └── create_elevator.ts   # Tool-Implementierung
│   └── mock/
│       └── ldoop_mock.ts        # Simulierter LDOOP Response
└── README.md             # Installations- und Testanleitung
```

---

## Schritt 1 – Projekt initialisieren

```bash
mkdir digipara-mcp && cd digipara-mcp
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
```

---

## Schritt 2 – tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

---

## Schritt 3 – package.json scripts

Füge folgende scripts und type-Einträge in package.json ein:

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "bin": {
    "digipara-mcp": "./dist/index.js"
  }
}
```

---

## Schritt 4 – Mock LDOOP Response (`src/mock/ldoop_mock.ts`)

Dieser Mock simuliert was LDOOP später zurückgeben wird.
Erstelle die Datei mit folgendem Inhalt:

```typescript
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
  svg_preview_url: string;
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
        dwg_block_name: `${manufacturer}_shaft_plan_${load_kg}kg`,
        svg_preview_url: `https://api.digipara.com/preview/${manufacturer}/plan`
      },
      {
        name: "Schacht Schnitt",
        type: "section",
        dwg_block_name: `${manufacturer}_shaft_section_${load_kg}kg`,
        svg_preview_url: `https://api.digipara.com/preview/${manufacturer}/section`
      },
      {
        name: "Kabinenfront",
        type: "front",
        dwg_block_name: `${manufacturer}_car_front_${load_kg}kg`,
        svg_preview_url: `https://api.digipara.com/preview/${manufacturer}/front`
      }
    ],
    created_at: new Date().toISOString(),
    status: "success"
  };
}
```

---

## Schritt 5 – Tool Implementierung (`src/tools/create_elevator.ts`)

```typescript
import { z } from "zod";
import { mockLdoopResponse } from "../mock/ldoop_mock.js";

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
  // Hier später: echter LDOOP API Call
  // const response = await fetch("https://ldoop.digipara.com/api/create", { ... })
  
  const result = mockLdoopResponse(
    input.manufacturer,
    input.load_kg,
    input.stops,
    input.special_features ?? []
  );

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
   - DWG Export: digipara.com/export/${result.model_id}
   - BIM/IFC:    digipara.com/bim/${result.model_id}
`.trim();

  return summary;
}
```

---

## Schritt 6 – MCP Server Entry Point (`src/index.ts`)

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CreateElevatorSchema, createElevator } from "./tools/create_elevator.js";
import { zodToJsonSchema } from "zod-to-json-schema";

// zod-to-json-schema auch installieren:
// npm install zod-to-json-schema

const server = new Server(
  { name: "digipara-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_elevator",
      description:
        "Erstellt ein parametrisches Aufzugsmodell via DigiPara/LDOOP. " +
        "Gibt Schachtmaße, Konfiguration und verfügbare CAD-Ansichten zurück. " +
        "Nutze dieses Tool wenn jemand einen Aufzug konfigurieren oder planen möchte.",
      inputSchema: zodToJsonSchema(CreateElevatorSchema)
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "create_elevator") {
    throw new Error(`Unbekanntes Tool: ${request.params.name}`);
  }

  const input = CreateElevatorSchema.parse(request.params.arguments);
  const result = await createElevator(input);

  return {
    content: [{ type: "text", text: result }]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DigiPara MCP Server läuft ✓");
}

main().catch(console.error);
```

---

## Schritt 7 – Build & Test

```bash
# Bauen
npm run build

# Testen ob der Server startet (sollte "DigiPara MCP Server läuft ✓" ausgeben)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

---

## Schritt 8 – Claude Desktop einbinden

Öffne die Claude Desktop Konfigurationsdatei:

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

Füge folgendes ein (Pfad anpassen!):

```json
{
  "mcpServers": {
    "digipara": {
      "command": "node",
      "args": ["/ABSOLUTER/PFAD/ZU/digipara-mcp/dist/index.js"]
    }
  }
}
```

Danach **Claude Desktop neu starten**.

---

## Schritt 9 – Testen in Claude Desktop

Sobald Claude Desktop neu gestartet ist, sollte im Eingabefeld ein 🔧 Symbol erscheinen das den DigiPara MCP Server anzeigt.

Teste mit diesen Prompts:

```
"Erstelle mir einen 1000 kg Otis Aufzug mit Durchladung für 8 Haltestellen"

"Konfiguriere einen Schindler Panorama-Aufzug, 630 kg, 5 Stops"

"Ich brauche einen maschinenraumlosen TKE Aufzug, 1600 kg, 20 Etagen"
```

---

## Schritt 10 – README.md erstellen

Erstelle eine README.md mit:
- Kurzbeschreibung: "DigiPara MCP Server – POC"
- Voraussetzungen: Node.js >= 18, npm
- Installation & Build Steps (aus Schritt 1–7)
- Claude Desktop Integration (aus Schritt 8)
- Beispiel-Prompts (aus Schritt 9)
- Hinweis: "Mock-Mode aktiv – echter LDOOP Endpoint wird in v0.2 angebunden"

---

## Nächste Ausbaustufe (noch NICHT implementieren)

Folgendes ist für v0.2 geplant – jetzt nur als Kommentar in `create_elevator.ts` festhalten:

- Echter LDOOP HTTP Call statt Mock
- Multi-Tenant Auth (API Key pro Hersteller: Otis, Schindler, TKE)
- Weiteres Tool: `get_manufacturers()` – listet verfügbare Hersteller/Kataloge
- Weiteres Tool: `get_component_options(component_type)` – verfügbare Optionen je Komponente
- SVG Preview direkt im MCP Response zurückgeben (type: "image")
