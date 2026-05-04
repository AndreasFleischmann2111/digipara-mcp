#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CreateElevatorSchema, createElevator } from "./tools/create_elevator.js";
import { GetSvgPreviewSchema, getSvgPreview } from "./tools/get_svg_preview.js";
import { zodToJsonSchema } from "zod-to-json-schema";

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
    },
    {
      name: "get_svg_preview",
      description:
        "Gibt eine SVG-Vorschau eines zuvor erstellten Aufzugs zurück. " +
        "Verfügbare Ansichten: top (Grundriss), section (Schacht Schnitt), front (Kabinenfront). " +
        "Benötigt die model_id aus einem vorherigen create_elevator Aufruf.",
      inputSchema: zodToJsonSchema(GetSvgPreviewSchema)
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "create_elevator": {
      const input = CreateElevatorSchema.parse(request.params.arguments);
      const result = await createElevator(input);
      return { content: [{ type: "text", text: result }] };
    }
    case "get_svg_preview": {
      const input = GetSvgPreviewSchema.parse(request.params.arguments);
      const result = await getSvgPreview(input);
      return { content: [{ type: "text", text: result }] };
    }
    default:
      throw new Error(`Unbekanntes Tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DigiPara MCP Server läuft ✓");
}

main().catch(console.error);
