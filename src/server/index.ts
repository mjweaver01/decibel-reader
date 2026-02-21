import { join } from "path";
import { DEFAULT_CONFIG, type AppConfig } from "../shared/types.js";
import clientHtml from "../client/index.html";
import { getRecordings, getRecordingsDir, saveRecordingFromUpload } from "./recorder.js";

const CONFIG_FILE = join(import.meta.dir, "../../config.json");

let config: AppConfig = { ...DEFAULT_CONFIG };

async function loadConfig(): Promise<AppConfig> {
  try {
    const data = (await Bun.file(CONFIG_FILE).json()) as Partial<AppConfig>;
    config = {
      ...DEFAULT_CONFIG,
      ...data,
      soundTypes: Array.isArray(data?.soundTypes) ? data.soundTypes : DEFAULT_CONFIG.soundTypes,
      classificationMinScore:
        typeof data?.classificationMinScore === "number"
          ? data.classificationMinScore
          : DEFAULT_CONFIG.classificationMinScore,
    };
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
  return config;
}

async function saveConfig(): Promise<void> {
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
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
        if (Array.isArray(body.soundTypes)) config.soundTypes = body.soundTypes;
        if (typeof body.classificationMinScore === "number")
          config.classificationMinScore = body.classificationMinScore;
        if (body.deviceId !== undefined) config.deviceId = body.deviceId || undefined;
        await saveConfig();
        return Response.json(config);
      },
    },
    "/api/recordings": {
      GET: async () => Response.json(await getRecordings()),
      POST: async (req) => {
        const formData = await req.formData();
        const audio = formData.get("audio");
        const peakDb = parseFloat(String(formData.get("peakDb") || "0"));
        const durationSeconds = parseFloat(String(formData.get("durationSeconds") || "0.5"));

        if (!audio || !(audio instanceof Blob)) {
          return new Response("Missing audio file", { status: 400 });
        }

        const meta = await saveRecordingFromUpload(audio, peakDb, durationSeconds);
        return Response.json(meta);
      },
    },
    "/api/recordings/:id": {
      GET: async (req) => {
        const id = decodeURIComponent(req.params.id).replace(/\.(webm|wav)$/, "");
        const dir = getRecordingsDir();
        // Try both .webm and .wav
        for (const ext of ["webm", "wav"]) {
          const filepath = join(dir, `${id}.${ext}`);
          try {
            const file = Bun.file(filepath);
            const exists = await file.exists();
            if (exists) {
              return new Response(file, {
                headers: {
                  "Content-Type": ext === "webm" ? "audio/webm" : "audio/wav",
                  "Content-Disposition": `attachment; filename="${id}.${ext}"`,
                },
              });
            }
          } catch {
            // try next
          }
        }
        return new Response("Not found", { status: 404 });
      },
    },
  },
});

await loadConfig();

console.log(`Decibel Reader server running at http://localhost:${server.port}`);
