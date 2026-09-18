# Weather Station V2

Dashboard monitoring stasiun cuaca **realtime** dengan API ingest, penyimpanan
time-series **InfluxDB 2.7**, dan agent contoh untuk **Raspberry Pi**.

```
┌──────────────┐   POST /api/weather   ┌──────────────┐   Flux    ┌───────────┐
│  Raspberry   │ ────────────────────▶ │  Next.js 15  │ ────────▶ │ InfluxDB  │
│  Pi / Agent  │   X-API-KEY header    │  Web + API   │ ◀──────── │   2.7     │
└──────────────┘                       └──────┬───────┘           └───────────┘
                                              │
                                        Browser dashboard
```

## Fitur

- **API ingest** `POST /api/weather` dengan autentikasi `X-API-KEY` (kompatibel
  dengan contoh `curl`).
- **Dashboard modern** (dark, glassmorphism): kartu data terbaru per device/site,
  grafik historis per metrik, tabel riwayat + filter, indikator online/offline.
- **Admin** (dilindungi password): registry device (label, lokasi, aktif) dan
  informasi API key.
- **Agent Raspberry Pi** (Python): mode simulasi atau sensor asli DHT22/BMP280.
- **Docker Compose** untuk seluruh stack.

## Struktur

```
.
├── docker-compose.yml
├── .env.example
├── web/         # Next.js 15 (App Router, TypeScript, Tailwind, Recharts)
└── agent/       # Python agent untuk Raspberry Pi
```

## Quick start (Docker)

```bash
cp .env.example .env
# edit .env: ganti password, token, dan WEATHER_API_KEY

docker compose up -d --build
```

- Dashboard: http://localhost:3000
- Admin: http://localhost:3000/admin (login dengan `ADMIN_PASSWORD`)
- InfluxDB UI: http://localhost:8086

Uji dengan agent simulator bawaan:

```bash
docker compose --profile agent up -d --build
```

### Test kirim data (curl)

```bash
source .env

curl -X POST http://localhost:3000/api/weather \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $WEATHER_API_KEY" \
  -d "{\"ts\":$(date +%s)000,\"device\":\"REMOTE-STATION-01\",\"site\":\"RemoteTestSite\",\"wind_direction\":135,\"wind_speed\":8.5,\"rainfall\":1.2,\"temperature\":26.3,\"pressure\":1015.5,\"humidity\":72}" \
  | jq ..
```

## API

| Method | Endpoint | Auth | Keterangan |
| ------ | -------- | ---- | ---------- |
| `POST` | `/api/weather` | `X-API-KEY` | Simpan satu bacaan |
| `GET` | `/api/weather?device=&site=&range=&limit=` | - | Riwayat (raw, terbaru dulu) |
| `GET` | `/api/stats?device=&site=&range=` | - | Time series teragregasi + min/max/avg |
| `GET` | `/api/devices` | - | Daftar device + status |
| `POST` | `/api/devices` | Cookie admin | Tambah registry device |
| `PUT` | `/api/devices` | Cookie admin | Ubah registry device |
| `DELETE` | `/api/devices?device=` | Cookie admin | Hapus registry device |
| `POST` | `/api/auth` | - | Login admin (`{ "password": "..." }`) |
| `DELETE` | `/api/auth` | - | Logout admin |

`range` yang didukung: `1h`, `6h`, `24h`, `7d`, `30d`, `90d` (default `24h`).

### Skema payload

```json
{
  "ts": 1726656000000,
  "device": "REMOTE-STATION-01",
  "site": "RemoteTestSite",
  "wind_direction": 135,
  "wind_speed": 8.5,
  "rainfall": 1.2,
  "temperature": 26.3,
  "pressure": 1015.5,
  "humidity": 72
}
```

`ts` opsional (epoch **milidetik**); jika kosong memakai waktu server.

## Development lokal (tanpa Docker untuk web)

```bash
# jalankan InfluxDB saja
docker compose up -d influxdb

cd web
cp ../.env.example .env.local
# ubah INFLUX_URL menjadi http://localhost:8086
npm install
npm run dev
```

## Raspberry Pi

Lihat [`agent/README.md`](agent/README.md).

```bash
cd agent
pip install -r requirements.txt
API_URL="http://<server-ip>:3000/api/weather" \
API_KEY="my-super-secret-api-key" \
DEVICE="REMOTE-STATION-01" \
SITE="RemoteTestSite" \
python weather_station.py
```

Untuk sensor asli (DHT22 + BMP280): `pip install -r requirements-sensors.txt`
lalu jalankan dengan `--sensor`.

## Environment variables

| Variable | Default | Keterangan |
| -------- | ------- | ---------- |
| `INFLUXDB_USERNAME` | `admin` | User admin InfluxDB |
| `INFLUXDB_PASSWORD` | `change-me-please` | Password InfluxDB |
| `INFLUXDB_ORG` | `weather` | Organisasi InfluxDB |
| `INFLUXDB_BUCKET` | `weather` | Bucket penyimpanan |
| `INFLUXDB_TOKEN` | - | Token admin InfluxDB |
| `INFLUX_URL` | `http://influxdb:8086` | URL InfluxDB untuk web |
| `WEATHER_API_KEY` | - | API key header `X-API-KEY` |
| `ADMIN_PASSWORD` | `admin123` | Password halaman admin |
| `NEXT_PUBLIC_POLL_INTERVAL` | `10000` | Interval polling dashboard (ms, build-time) |
| `ONLINE_THRESHOLD_MS` | `300000` | Batas device dianggap online (ms) |

## Data model di InfluxDB

- Measurement `weather`: tags `device`, `site`; fields `wind_direction`,
  `wind_speed`, `rainfall`, `temperature`, `pressure`, `humidity`.
- Measurement `device_registry`: metadata device (label, lokasi, aktif) untuk
  halaman admin.

## Keamanan

- Ganti semua secret default di `.env` sebelum deploy.
- Gunakan HTTPS (reverse proxy) di produksi.
- API key dan cookie admin dikirim sebagai header/cookie; jangan expose `.env`.
