# DigiPara MCP Server – POC

Ein MCP (Model Context Protocol) Server, der parametrische Aufzugsmodelle via DigiPara/LDOOP erstellt. Dieser POC arbeitet mit einem Mock-Response, der die echte LDOOP-Datenstruktur abbildet.

> **Mock-Mode aktiv** – echter LDOOP Endpoint wird in v0.2 angebunden.

---

## Voraussetzungen

- Node.js >= 18
- npm >= 9

---

## Installation & Build

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. TypeScript kompilieren
npm run build

# 3. Server testen
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
# → Gibt "DigiPara MCP Server läuft ✓" + Tool-Liste aus
```

---

## Claude Desktop Integration

Öffne die Konfigurationsdatei:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Füge folgendes ein (absoluten Pfad anpassen):

```json
{
  "mcpServers": {
    "digipara": {
      "command": "node",
      "args": ["C:\\Pfad\\zu\\digipara-mcp\\dist\\index.js"]
    }
  }
}
```

Danach **Claude Desktop neu starten**. Im Eingabefeld erscheint ein 🔧 Symbol für den DigiPara MCP Server.

---

## Beispiel-Prompts

```
"Erstelle mir einen 1000 kg Otis Aufzug mit Durchladung für 8 Haltestellen"

"Konfiguriere einen Schindler Panorama-Aufzug, 630 kg, 5 Stops"

"Ich brauche einen maschinenraumlosen TKE Aufzug, 1600 kg, 20 Etagen"
```

---

## Entwicklung

```bash
# Dev-Modus (kein Build nötig)
npm run dev
```

---

## Projektstruktur

```
digipara-mcp/
├── src/
│   ├── index.ts                  # MCP Server Entry Point
│   ├── tools/
│   │   └── create_elevator.ts    # Tool-Implementierung
│   └── mock/
│       └── ldoop_mock.ts         # Simulierter LDOOP Response
├── dist/                         # Kompilierter Output (nach npm run build)
├── package.json
├── tsconfig.json
└── README.md
```
