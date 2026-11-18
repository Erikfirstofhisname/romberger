# Romberger (Phase 1)

Capture a 30s Romberg balance test from an ESP32 + MPU6050. The **firmware builds a CSV** (`ax,ay,az,gx,gy,gz`) and **POSTs it to Spring**, which stores **one CSV per test** in Neon.

## Stack

- `firmware/romberg_capture` — ESP32 sketch (WiFi HTTP POST after each test)
- `web` — Next.js (list / download stored tests; optional Web Serial debug)
- `api` — Spring Boot + JPA → Neon Postgres

CSV columns: `ax,ay,az,gx,gy,gz`

## Run

### 1. API (Neon)

```bash
cd api
# credentials in gitignored .env — see .env.example
./run-neon.sh
```

API must be reachable on your LAN (default port `8080`).

### 2. Web (viewer)

```bash
cd web
npm run dev
```

Open **http://localhost:3000** and use **Refresh list** after a device upload.

### 3. Firmware config (required before flash)

Edit the top of [`firmware/romberg_capture/romberg_capture.ino`](firmware/romberg_capture/romberg_capture.ino):

```cpp
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char *API_BASE = "http://192.168.122.52:8080"; // your Mac LAN IP
```

Find your Mac LAN IP:

```bash
ipconfig getifaddr en0
```

Use that IP in `API_BASE` — **not** `localhost` (the ESP32 cannot reach your laptop that way). ESP32 and Mac must be on the same WiFi.

### 4. Device

1. Set WiFi + `API_BASE`, then flash the sketch
2. Open Serial Monitor @ 115200
3. Wait for `WiFi OK`
4. Send any character to start a 30s test
5. On success: double beep + `CSV uploaded…`; Spring/Neon gets a new row
6. In the web app, click **Refresh list** / **Download CSV**

## Manual API check

```bash
curl http://localhost:8080/api/tests
curl -O http://localhost:8080/api/tests/<id>/csv
```
