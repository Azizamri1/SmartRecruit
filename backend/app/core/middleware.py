from __future__ import annotations
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger("smartrecruit")
_req_logger = logging.getLogger("smartrecruit.access")

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        # Accept inbound X-Request-ID, check existing state, or generate one
        rid = request.headers.get("X-Request-ID") or getattr(request.state, "request_id", None) or str(uuid.uuid4())
        request.state.request_id = rid

        try:
            response: Response = await call_next(request)
        except Exception as e:
            # Ensure we can correlate errors
            logger.exception("Unhandled error", extra={
                "request_id": rid,
                "path": request.url.path,
                "method": request.method,
            })
            raise

        # Echo back for client correlation
        response.headers["X-Request-ID"] = rid
        return response


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        method = request.method
        path = request.url.path
        ip = request.client.host if request.client else "unknown"

        # Ensure we always have a request_id (resilient approach)
        rid = getattr(request.state, "request_id", None)
        if not rid:
            rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
            request.state.request_id = rid  # Set it so downstream sees it

        try:
            response: Response = await call_next(request)
            status = response.status_code
            dur_ms = int((time.time() - start) * 1000)
            _req_logger.info(
                "access",
                extra={"request_id": rid, "ip": ip, "method": method, "path": path,
                       "status_code": status, "duration_ms": dur_ms}
            )
            response.headers["X-Request-ID"] = rid  # Echo back for clients
            return response
        except Exception as e:
            dur_ms = int((time.time() - start) * 1000)
            _req_logger.exception(
                "access_error",
                extra={"request_id": rid, "ip": ip, "method": method, "path": path,
                       "duration_ms": dur_ms}
            )
            raise
