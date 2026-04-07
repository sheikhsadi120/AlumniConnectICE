"""Root Gunicorn entrypoint for Render.

Supports start commands like: gunicorn main:app
"""

from backend.main import app  # re-export Flask app

application = app
