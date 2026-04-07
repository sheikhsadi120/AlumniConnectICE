"""Compatibility Gunicorn entrypoint.

This allows `gunicorn backend.main:app` to work even when Render Root Directory is `backend`.
"""

import os
import sys

PARENT_DIR = os.path.dirname(os.path.dirname(__file__))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from app import app  # noqa: E402

application = app
