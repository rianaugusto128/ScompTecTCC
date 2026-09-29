"""Time-weighted utilization; a sample is valid only until the offline timeout."""
from datetime import timedelta

from Services.clock import OFFLINE_TIMEOUT_SECONDS, normalize_datetime
from Services.telemetry import derive_status
from Schema.telemetry import TelemetryCreate

STATES = ("OPERANDO", "PARADA", "ALARME", "EMERGENCIA", "MANUTENCAO", "DESLIGADA")


def calculate_utilization(readings, now, hours=24, timeout=OFFLINE_TIMEOUT_SECONDS):
    now = normalize_datetime(now)
    start = now - timedelta(hours=hours)
    buckets = [{
        "timestamp": (start + timedelta(hours=i)).isoformat() + "Z",
        "seconds": {state: 0.0 for state in STATES},
        "samples": 0,
        "duration_seconds": 3600,
    } for i in range(hours)]
    # The query orders ties by ingestion; the final sample at a timestamp wins.
    readings = sorted(readings, key=lambda reading: reading.timestamp)
    for index, reading in enumerate(readings):
        timestamp = normalize_datetime(reading.timestamp)
        if start <= timestamp <= now:
            bucket = min(hours - 1, int((timestamp - start).total_seconds() // 3600))
            buckets[bucket]["samples"] += 1
        end = min(now, timestamp + timedelta(seconds=timeout))
        if index + 1 < len(readings):
            end = min(end, normalize_datetime(readings[index + 1].timestamp))
        cursor = max(start, timestamp)
        if cursor >= end:
            continue
        state = derive_status(TelemetryCreate(
            machine_active=reading.machine_active,
            voltage_24v=reading.voltage_24v,
            digital_signals=reading.digital_signals or {},
        ))
        while cursor < end:
            bucket = int((cursor - start).total_seconds() // 3600)
            segment_end = min(end, start + timedelta(hours=bucket + 1))
            buckets[bucket]["seconds"][state] += (segment_end - cursor).total_seconds()
            cursor = segment_end
    return {"buckets": buckets, "as_of": now.isoformat() + "Z"}
