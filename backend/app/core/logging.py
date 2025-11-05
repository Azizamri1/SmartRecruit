from __future__ import annotations
import json
import logging
import sys

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # attach extras
        for key, value in getattr(record, "__dict__", {}).items():
            if key in ("args", "msg", "levelno", "levelname", "name",
                       "created", "msecs", "relativeCreated", "exc_info",
                       "exc_text", "stack_info", "lineno", "pathname",
                       "filename", "module", "funcName", "thread",
                       "threadName", "processName", "process"):
                continue
            if key not in base:
                base[key] = value
        # add exception if any
        if record.exc_info:
            base["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(base, ensure_ascii=False)

def setup_logging(debug: bool = False):
    level = logging.DEBUG if debug else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    # Root
    root = logging.getLogger()
    root.handlers = []
    root.setLevel(level)
    root.addHandler(handler)

    # Our loggers
    for name in ("smartrecruit", "smartrecruit.access", "smartrecruit.audit",
                 "smartrecruit.email", "smartrecruit.security"):
        lg = logging.getLogger(name)
        lg.propagate = True
        lg.setLevel(level)

    # Quiet noisy libs if needed
    logging.getLogger("uvicorn.error").setLevel(level)
    logging.getLogger("uvicorn.access").handlers = []  # we emit our own access logs
