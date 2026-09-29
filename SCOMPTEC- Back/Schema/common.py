from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


class UTCModel(BaseModel):
    """MySQL stores naive UTC; the API always identifies that timezone."""

    @field_serializer("*", check_fields=False)
    def serialize_utc(self, value):
        if isinstance(value, datetime):
            return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        return value
