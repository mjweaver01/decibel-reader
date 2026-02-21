import { join } from "path";
import {
  DEFAULT_CONFIG,
  type AppConfig,
  type WebSocketMessage,
} from "../shared/types.js";
import clientHtml from "../client/index.html";
import { startAudioCapture } from "./audio-capture.js";
import { getRecordings, getRecordingsDir, getIsRecording, startRecording } from "./recorder.js";

const CONFIG_FILE = join(import.meta.dir, "../../config.json");

let config: AppConfig = { ...DEFAULT_CONFIG };

async function loadConfig(): Promise<AppConfig> {
  try {
    const data = await Bun.file(CONFIG_FILE).json();
    config = { ...DEFAULT_CONFIG, ...data };
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
  return config;
}

async function saveConfig(): Promise<void> {
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

const wsClients = new Set<{ send: (data: string) => void }>();

function broadcast(msg: WebSocketMessage): void {
  const data = JSON.stringify(msg);
  for (const client of wsClients) {
    try {
      client.send(data);
    } catch {
      wsClients.delete(client);
    }
  }
}

async function handleThresholdExceeded(dB: number): Promise<void> {
  const meta = await startRecording(config, dB);
  if (meta) {
    broadcast({ type: "recording_started", payload: { filename: meta.filename } });
    broadcast({ type: "recording_finished", payload: meta });
  }
}

const server = Bun.serve({
  port: 3000,
  development: true,
  routes: {
    "/": clientHtml,
    "/api/config": {
      GET: () => Response.json(config),
      POST: async (req) => {
        const body = (await req.json()) as Partial<AppConfig>;
        if (typeof body.thresholdDb === "number") config.thresholdDb = body.thresholdDb;
        if (typeof body.recordDurationSeconds === "number")
          config.recordDurationSeconds = body.recordDurationSeconds;
        if (typeof body.captureIntervalMs === "number")
          config.captureIntervalMs = body.captureIntervalMs;
        await saveConfig();
        broadcast({ type: "config", payload: config });
        return Response.json(config);
      },
    },
    "/api/recordings": {
      GET: async () => Response.json(await getRecordings()),
    },
    "/api/recordings/:id": {
      GET: async (req) => {
        const id = decodeURIComponent(req.params.id).replace(/\.wav$/, "");
        const dir = getRecordingsDir();
        const filepath = join(dir, `${id}.wav`);
        try {
          const file = Bun.file(filepath);
          const exists = await file.exists();
          if (!exists) return new Response("Not found", { status: 404 });
          return new Response(file, {
            headers: {
              "Content-Type": "audio/wav",
              "Content-Disposition": `attachment; filename="${id}.wav"`,
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
    "/api/status": {
      GET: () =>
        Response.json({
          isRecording: getIsRecording(),
          config,
        }),
    },
  },
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      return upgraded ? undefined : new Response("WebSocket upgrade failed", { status: 400 });
    }
    return undefined;
  },
  websocket: {
    open(ws) {
      wsClients.add(ws);
      ws.send(JSON.stringify({ type: "config", payload: config }));
    },
    close(ws) {
      wsClients.delete(ws);
    },
    message(ws, data) {
      // No client messages required for now
    },
  },
});

// Load config and start audio capture
await loadConfig();

startAudioCapture({
  config: () => config,
  onDbSample: (dB, timestamp) => {
    broadcast({ type: "db_sample", payload: { dB, timestamp } });
  },
  onThresholdExceeded: (dB) => {
    void handleThresholdExceeded(dB);
  },
});

console.log(`Decibel Reader server running at http://localhost:${server.port}`);
