#!/usr/bin/env python3
from app.main import app

print("Available routes:")
print("=" * 50)

for r in app.routes:
    try:
        methods = list(r.methods) if hasattr(r, "methods") else ["N/A"]
        path = r.path
        print(f"{methods} {path}")
    except Exception as e:
        print(f"Error processing route: {e}")

print("\nDone!")
