#!/usr/bin/env node
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CreateElevatorSchema, createElevator } from "./tools/create_elevator.js";
import { GetSvgPreviewSchema, getSvgPreview } from "./tools/get_svg_preview.js";
import { zodToJsonSchema } from "zod-to-json-schema";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// ── MCP Server Setup ──────────────────────────────────────────────────────────

function createMcpServer(): Server {
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
        inputSchema: zodToJsonSchema(CreateElevatorSchema),
      },
      {
        name: "get_svg_preview",
        description:
          "Gibt eine SVG-Zeichnung eines Aufzugs zurück. " +
          "WICHTIG: Immer dieses Tool verwenden wenn der Nutzer einen Grundriss, Plan View, SVG, " +
          "Schnitt, Kabinenfront oder eine Zeichnung sehen möchte. " +
          "NIEMALS SVGs selbst generieren – immer dieses Tool aufrufen. " +
          "Verfügbare view_type Werte: top=Grundriss/Plan View, section=Schacht Schnitt, front=Kabinenfront. " +
          "Benötigt die model_id aus einem vorherigen create_elevator Aufruf.",
        inputSchema: zodToJsonSchema(GetSvgPreviewSchema),
      },
    ],
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

  return server;
}

// ── Express HTTP Server ───────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Session-Store: eine MCP-Server-Instanz pro SSE-Verbindung
const transports = new Map<string, SSEServerTransport>();

// Health Check für App Runner
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "digipara-mcp", version: "0.1.0" });
});

// SSE-Verbindung: Claude Web verbindet sich hier
app.get("/sse", async (_req, res) => {
  console.log("Neue SSE-Verbindung");

  const transport = new SSEServerTransport("/messages", res);
  const server = createMcpServer();

  transports.set(transport.sessionId, transport);

  transport.onclose = () => {
    console.log(`SSE-Verbindung getrennt: ${transport.sessionId}`);
    transports.delete(transport.sessionId);
  };

  await server.connect(transport);
});

// POST-Endpunkt: Claude Web sendet Tool-Aufrufe hier
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: `Session nicht gefunden: ${sessionId}` });
    return;
  }

  await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`DigiPara MCP HTTP Server läuft auf Port ${PORT} ✓`);
  console.log(`  Health:   http://localhost:${PORT}/health`);
  console.log(`  SSE:      http://localhost:${PORT}/sse`);
  console.log(`  Messages: http://localhost:${PORT}/messages`);
});
