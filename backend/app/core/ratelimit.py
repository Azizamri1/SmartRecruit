from __future__ import annotations
import time
from typing import Dict, Tuple

# key -> (window_end_epoch, count)
_BUCKETS: Dict[str, Tuple[float, int]] = {}

def allow(key: str, limit: int, window_sec: int) -> bool:
    now = time.time()
    wnd, cnt = _BUCKETS.get(key, (0.0, 0))
    if now > wnd:
        # new window
        _BUCKETS[key] = (now + window_sec, 1)
        return True
    if cnt < limit:
        _BUCKETS[key] = (wnd, cnt + 1)
        return True
    return False

def remaining(key: str, limit: int, window_sec: int) -> int:
    wnd, cnt = _BUCKETS.get(key, (0.0, 0))
    return max(0, limit - cnt)
