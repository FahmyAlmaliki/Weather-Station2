#!/usr/bin/env python3
"""Weather Station V2 - Raspberry Pi agent.

Reads weather data (real sensors or simulation) and pushes it to the
Weather Station V2 API.

Usage:
    python weather_station.py                 # simulation, loop
    python weather_station.py --once          # send one reading and exit
    python weather_station.py --sensor        # try real sensors (DHT22/BMP280)

Environment variables:
    API_URL   full endpoint, e.g. http://192.168.1.10:3000/api/weather
    API_KEY   value for the X-API-KEY header
    DEVICE    device id, e.g. REMOTE-STATION-01
    SITE      site name, e.g. RemoteTestSite
    INTERVAL  seconds between readings (default 10)
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import signal
import sys
import time
from dataclasses import dataclass, asdict
from typing import Optional

import requests

LOG = logging.getLogger("weather-agent")

STOP = False


def _handle_signal(signum: int, _frame: object) -> None:
    global STOP
    LOG.info("Received signal %s, shutting down...", signum)
    STOP = True


@dataclass
class Reading:
    ts: int
    device: str
    site: str
    wind_direction: float
    wind_speed: float
    rainfall: float
    temperature: float
    pressure: float
    humidity: float


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


class Simulator:
    """Simple bounded random-walk so the dashboard shows live movement."""

    def __init__(self) -> None:
        self.temperature = 26.3
        self.humidity = 72.0
        self.pressure = 1015.0
        self.wind_speed = 6.0
        self.wind_direction = 135.0
        self.rainfall = 0.0

    def read(self) -> Reading:
        self.temperature = _clamp(self.temperature + random.uniform(-0.4, 0.4), -10, 50)
        self.humidity = _clamp(self.humidity + random.uniform(-1.5, 1.5), 10, 100)
        self.pressure = _clamp(self.pressure + random.uniform(-0.6, 0.6), 950, 1080)
        self.wind_speed = _clamp(self.wind_speed + random.uniform(-1.0, 1.0), 0, 40)
        self.wind_direction = (self.wind_direction + random.uniform(-25, 25)) % 360

        # Rain is occasional: 12% chance of a measurable amount.
        if random.random() < 0.12:
            self.rainfall = round(random.uniform(0.1, 2.5), 2)
        else:
            self.rainfall = 0.0

        return Reading(
            ts=int(time.time() * 1000),
            device=os.getenv("DEVICE", "REMOTE-STATION-01"),
            site=os.getenv("SITE", "RemoteTestSite"),
            wind_direction=round(self.wind_direction, 1),
            wind_speed=round(self.wind_speed, 2),
            rainfall=self.rainfall,
            temperature=round(self.temperature, 2),
            pressure=round(self.pressure, 2),
            humidity=round(self.humidity, 1),
        )


class SensorReader:
    """Best-effort reader for a DHT22 (temp/humidity) and BMP280 (pressure).

    Falls back to the simulator for any metric whose sensor is unavailable.
    Requires: adafruit-circuitpython-dht, adafruit-circuitpython-bmp280 and
    their board/busio dependencies (see requirements-sensors.txt).
    """

    def __init__(self, fallback: Simulator) -> None:
        self.fallback = fallback
        self.dht = None
        self.bmp = None

        try:
            import adafruit_dht
            import board

            self.dht = adafruit_dht.DHT22(getattr(board, "D4"))
            LOG.info("DHT22 detected on D4")
        except Exception as exc:  # noqa: BLE001
            LOG.warning("DHT22 unavailable (%s), using simulation for temp/humidity", exc)

        try:
            import adafruit_bmp280
            import board

            i2c = board.I2C()
            self.bmp = adafruit_bmp280.Adafruit_BMP280_I2C(i2c, address=0x76)
            self.bmp.sea_level_pressure = 1013.25
            LOG.info("BMP280 detected on I2C 0x76")
        except Exception as exc:  # noqa: BLE001
            LOG.warning("BMP280 unavailable (%s), using simulation for pressure", exc)

    def read(self) -> Reading:
        reading = self.fallback.read()

        if self.dht is not None:
            try:
                reading.temperature = round(float(self.dht.temperature), 2)
                reading.humidity = round(float(self.dht.humidity), 1)
            except Exception as exc:  # noqa: BLE001
                LOG.warning("DHT22 read failed (%s)", exc)

        if self.bmp is not None:
            try:
                reading.temperature = round(float(self.bmp.temperature), 2)
                reading.pressure = round(float(self.bmp.pressure), 2)
            except Exception as exc:  # noqa: BLE001
                LOG.warning("BMP280 read failed (%s)", exc)

        return reading


def send(reading: Reading, api_url: str, api_key: str, timeout: float = 10.0) -> bool:
    payload = asdict(reading)
    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": api_key,
    }
    try:
        response = requests.post(
            api_url, headers=headers, json=payload, timeout=timeout
        )
    except requests.RequestException as exc:
        LOG.error("Request failed: %s", exc)
        return False

    if response.status_code >= 400:
        LOG.error(
            "Server returned %s: %s", response.status_code, response.text[:300]
        )
        return False

    LOG.info(
        "Sent ts=%s temp=%.2f hum=%.1f press=%.2f wind=%.2f dir=%.0f rain=%.2f",
        reading.ts,
        reading.temperature,
        reading.humidity,
        reading.pressure,
        reading.wind_speed,
        reading.wind_direction,
        reading.rainfall,
    )
    return True


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Weather Station V2 Raspberry Pi agent")
    parser.add_argument("--once", action="store_true", help="send one reading and exit")
    parser.add_argument(
        "--sensor",
        action="store_true",
        help="try to read real sensors (DHT22/BMP280), fallback to simulation",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=float(os.getenv("INTERVAL", "10")),
        help="seconds between readings (default: INTERVAL env or 10)",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )

    api_url = os.getenv("API_URL", "http://localhost:3000/api/weather")
    api_key = os.getenv("API_KEY", "")
    if not api_key:
        LOG.error("API_KEY is not set")
        return 2

    simulator = Simulator()
    reader = SensorReader(simulator) if args.sensor else simulator

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    LOG.info("Sending to %s every %.1fs", api_url, args.interval)

    failures = 0
    while not STOP:
        reading = reader.read()
        if send(reading, api_url, api_key):
            failures = 0
        else:
            failures += 1

        if args.once:
            break

        delay = args.interval
        if failures:
            delay = min(args.interval * (2 ** min(failures, 5)), 300)
            LOG.info("Retrying in %.0fs (failure #%d)", delay, failures)

        slept = 0.0
        while slept < delay and not STOP:
            time.sleep(min(0.5, delay - slept))
            slept += 0.5

    return 0


if __name__ == "__main__":
    sys.exit(main())
