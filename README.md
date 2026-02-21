# Decibel Reader

A Raspberry Pi audio monitor that streams live decibel levels and records when a configurable threshold is exceeded.

## Tech Stack

- **Backend**: Bun (HTTP server, WebSocket)
- **Frontend**: React, Tailwind CSS v4 (via bun-plugin-tailwind)
- **Audio**: `arecord` (ALSA) + `sox` for capture and dB calculation

## Raspberry Pi Setup

Install system dependencies:

```bash
sudo apt-get update
sudo apt-get install alsa-utils sox libsox-fmt-all
```

Ensure your user is in the `audio` group for microphone access:

```bash
sudo usermod -aG audio $USER
# Log out and back in for the change to take effect
```

## Project Setup

```bash
bun install
```

## Development

Run the Bun server (serves API, WebSocket, and client with hot reload):

```bash
bun run dev
```

- **Server**: http://localhost:3000 (API + WebSocket + React app)

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
| `/api/recordings/:id` | GET | Download a recording (WAV) |
| `/api/status` | GET | Server status (isRecording, config) |
| `/ws` | WebSocket | Live dB stream, config updates, recording events |
