from datetime import datetime, timezone
import os

OFFLINE_TIMEOUT_SECONDS = int(os.getenv("DEVICE_OFFLINE_TIMEOUT_SECONDS", "90"))
if OFFLINE_TIMEOUT_SECONDS < 10:
    raise ValueError("DEVICE_OFFLINE_TIMEOUT_SECONDS deve ser pelo menos 10")


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def normalize_datetime(value):
    if value is None:
        return utcnow()
    return value.astimezone(timezone.utc).replace(tzinfo=None, microsecond=0) if value.tzinfo else value.replace(microsecond=0)


def is_online(last_seen):
    return bool(last_seen and 0 <= (utcnow() - normalize_datetime(last_seen)).total_seconds() <= OFFLINE_TIMEOUT_SECONDS)
