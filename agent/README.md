# Weather Station V2 - Raspberry Pi Agent

Program contoh untuk mengirim data stasiun cuaca ke API Weather Station V2.

## Menjalankan di Raspberry Pi (langsung)

```bash
cd agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export API_URL="http://192.168.1.10:3000/api/weather"
export API_KEY="my-super-secret-api-key"
export DEVICE="REMOTE-STATION-01"
export SITE="RemoteTestSite"
export INTERVAL=10

python weather_station.py            # loop simulasi
python weather_station.py --once     # kirim sekali lalu keluar
```

## Dengan sensor asli (DHT22 + BMP280)

```bash
pip install -r requirements-sensors.txt
python weather_station.py --sensor
```

Wiring default:

| Sensor | Pin |
| ------ | --- |
| DHT22 data | GPIO4 (D4) |
| BMP280 | I2C, alamat `0x76` (SDA/SCL) |

Jika sensor tidak terdeteksi, agent otomatis kembali ke mode simulasi.

## Menjalankan lewat Docker

```bash
docker build -t weather-agent ./agent

docker run --rm \
  -e API_URL="http://<server-ip>:3000/api/weather" \
  -e API_KEY="my-super-secret-api-key" \
  -e DEVICE="REMOTE-STATION-01" \
  -e SITE="RemoteTestSite" \
  weather-agent
```

Atau lewat `docker compose --profile agent up` dari root project (mode simulasi).

## Environment variables

| Variable | Default | Keterangan |
| -------- | ------- | ---------- |
| `API_URL` | `http://localhost:3000/api/weather` | Endpoint ingest |
| `API_KEY` | - | Nilai header `X-API-KEY` (wajib) |
| `DEVICE` | `REMOTE-STATION-01` | ID device |
| `SITE` | `RemoteTestSite` | Nama site |
| `INTERVAL` | `10` | Detik antar pengiriman |
| `LOG_LEVEL` | `INFO` | Level logging |
