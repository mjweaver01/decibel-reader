#!/usr/bin/env bash
# Generate a self-signed certificate for localhost development.
# Run once, then use https://localhost:3000 for a secure context (crypto.randomUUID, etc.)

set -e
CERTS_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "$CERTS_DIR"

# Optional: add LAN IP for HTTPS on network (e.g. 192.168.86.23)
# Usage: LAN_IP=192.168.86.23 ./scripts/generate-cert.sh
EXTRA_IPS="${LAN_IP:+"IP.2 = $LAN_IP"}"
if [ -n "$LAN_IP" ]; then
  SAN="subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1,IP:$LAN_IP"
else
  SAN="subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERTS_DIR/key.pem" \
  -out "$CERTS_DIR/cert.pem" \
  -subj "/CN=localhost" \
  -addext "$SAN"

echo "Created: $CERTS_DIR/cert.pem, $CERTS_DIR/key.pem"
echo ""
echo "Use https://localhost:3000 (you may need to accept the browser warning once)"
echo ""
echo "To include a LAN IP (e.g. for https://192.168.86.23:3000):"
echo "  LAN_IP=192.168.86.23 ./scripts/generate-cert.sh"
