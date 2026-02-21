# Decibel Reader

A browser-based audio monitor that displays live decibel levels and records when a configurable threshold is exceeded.

## Tech Stack

- **Backend**: Bun (HTTP server)
- **Frontend**: React, Tailwind CSS v4 (via bun-plugin-tailwind)
- **Audio**: Browser Web Audio API + MediaRecorder (no system dependencies)

## Requirements

- **Browser**: Modern browser with microphone support (Chrome, Firefox, Safari, Edge)
- **HTTPS or localhost**: Microphone access requires a secure context (localhost works for development)

## Project Setup

```bash
bun install
```

## Development

Run the Bun server (serves API and client with hot reload):

```bash
bun run dev
```

- **Server**: http://localhost:3000 (API + React app)

## Production

Build and start the server:

```bash
bun run build
bun run start
```

The build bundles the server and client. The server runs on port 3000.

## Configuration

- **Threshold (dB)**: Record when sound exceeds this level. Values are dBFS (decibels relative to full scale); consumer USB mics are not calibrated for dB SPL, so thresholds are device-dependent.
- **Record Duration**: How long to record when the threshold is exceeded (5, 10, 15, or 30 seconds).

Config is persisted in `config.json` and can be changed via the web UI.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Get current config |
| `/api/config` | POST | Update config |
| `/api/recordings` | GET | List recordings metadata |
| `/api/recordings/:id` | GET | Download a recording (WebM/WAV) |
| `/api/recordings` | POST | Upload recording (multipart: audio, peakDb, durationSeconds) |
