from __future__ import annotations

import uuid
from datetime import datetime
from email.utils import formatdate


def build_ics(
    title: str,
    dt_start_utc: datetime,
    dt_end_utc: datetime,
    organizer_email: str,
    organizer_name: str = "SmartRecruit",
    location: str | None = None,
    description: str | None = None,
) -> str:
    """
    Returns a minimal RFC5545 .ics string (UTC, REQUEST).
    """
    uid = f"{uuid.uuid4()}@smartrecruit"
    dtstamp = formatdate(usegmt=True)  # e.g., 'Tue, 07 Oct 2025 09:00:00 GMT'

    def _fmt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")  # UTC 'Z'

    lines = [
        "BEGIN:VCALENDAR",
        "PRODID:-//SmartRecruit//Interview//EN",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{_fmt(datetime.utcnow())}",
        f"DTSTART:{_fmt(dt_start_utc)}",
        f"DTEND:{_fmt(dt_end_utc)}",
        f"SUMMARY:{title}",
        f"ORGANIZER;CN={organizer_name}:mailto:{organizer_email}",
        f"LOCATION:{location or ''}",
        f"DESCRIPTION:{(description or '').replace('\\n','\\n')}",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
    ]
    return "\r\n".join(lines)
