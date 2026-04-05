import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
import { WebSocketServer, WebSocket } from "ws";
import type { CouncilPhase, MemberState, DecisionRecord, SandboxEvent } from "./types.js";
import { createDefaultMembers } from "./members.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function findOpenPort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.on("error", () => {
      // Port in use, try next
      resolve(findOpenPort(startPort + 1));
    });
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
  });
}

export class CouncilState {
  phase: CouncilPhase = "idle";
  members: MemberState[] = createDefaultMembers();
  history: DecisionRecord[] = [];
  decisionCounter = 0;

  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private browserOpened = false;
  private sandboxUrl = "";

  /**
   * Start a single HTTP server that:
   * 1. Serves the static sandbox UI (from sandbox/out/)
   * 2. Handles WebSocket upgrades for real-time events
   * 3. Finds an open port automatically if preferred port is taken
   */
  async startServer(preferredPort: number = 3099): Promise<void> {
    // Find an open port
    const port = await findOpenPort(preferredPort);
    if (port !== preferredPort) {
      console.error(`[council] Port ${preferredPort} in use, using ${port}`);
    }

    // Resolve the static sandbox build directory
    const candidates = [
      join(__dirname, "../sandbox-ui"),
      join(__dirname, "../../sandbox/out"),
    ];
    const sandboxDir = candidates.find((d) => existsSync(join(d, "index.html"))) ?? candidates[0];
    const hasSandbox = existsSync(join(sandboxDir, "index.html"));

    // Create HTTP server for static files
    const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (!hasSandbox) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<html><body style="background:#1a1a2e;color:#fff;font-family:monospace;padding:40px">
          <h1>The Council</h1>
          <p>Sandbox not built. Run: <code>cd sandbox && npm run build</code></p>
        </body></html>`);
        return;
      }

      let filePath = resolve(sandboxDir, (req.url === "/" ? "index.html" : req.url!).replace(/^\//, ""));
      if (!filePath.startsWith(resolve(sandboxDir))) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (!extname(filePath) && !existsSync(filePath)) {
        filePath += ".html";
      }

      if (!existsSync(filePath)) {
        filePath = join(sandboxDir, "index.html");
      }

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        const mime = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    // Attach WebSocket server to the HTTP server
    this.wss = new WebSocketServer({ server: httpServer });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      console.error(`[council] Sandbox client connected (${this.clients.size} total)`);

      ws.send(
        JSON.stringify({
          event: "state_sync",
          phase: this.phase,
          members: this.members.map((m) => ({
            id: m.id,
            name: m.definition.name,
            color: m.definition.color,
            archetype: m.definition.archetype,
            accessory: m.definition.accessory,
            generation: m.generation,
            lineage: m.lineage,
            stats: m.stats,
          })),
          historyCount: this.history.length,
        }),
      );

      ws.on("close", () => {
        this.clients.delete(ws);
        console.error(`[council] Sandbox client disconnected (${this.clients.size} total)`);
      });
    });

    // Now listen — port is guaranteed free
    httpServer.listen(port, () => {
      this.sandboxUrl = `http://localhost:${port}`;
      console.error(`[council] Server running at ${this.sandboxUrl}`);
    });
  }

  openBrowser(): void {
    if (this.browserOpened || !this.sandboxUrl) return;
    this.browserOpened = true;

    const cmd =
      process.platform === "darwin"
        ? `open "${this.sandboxUrl}"`
        : process.platform === "win32"
          ? `start "" "${this.sandboxUrl}"`
          : `xdg-open "${this.sandboxUrl}"`;

    exec(cmd, (err) => {
      if (err) {
        console.error(`[council] Could not open browser: ${err.message}`);
      } else {
        console.error(`[council] Opened sandbox in browser`);
      }
    });
  }

  getSandboxUrl(): string {
    return this.sandboxUrl;
  }

  broadcast(event: SandboxEvent): void {
    const data = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  setPhase(phase: CouncilPhase): void {
    this.phase = phase;
    this.broadcast({ event: "phase_change", phase });
  }

  replaceMember(deadId: string, newMember: MemberState): void {
    const idx = this.members.findIndex((m) => m.id === deadId);
    if (idx !== -1) {
      this.members[idx] = newMember;
    }
  }

  recordDecision(record: DecisionRecord): void {
    this.history.push(record);
    this.decisionCounter++;
  }

  nextDecisionId(): string {
    return `decision-${String(this.decisionCounter + 1).padStart(3, "0")}`;
  }

}
