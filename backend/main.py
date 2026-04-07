"""Render-compatible Gunicorn entrypoint.

Supports: gunicorn backend.main:app
"""

import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from app import app  # noqa: E402

# Optional WSGI alias used by some platforms/conventions.
application = app
