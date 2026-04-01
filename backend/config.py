import os


def _as_bool(value, default=False):
	if value is None:
		return default
	return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _as_int(value, default):
	try:
		return int(value)
	except (TypeError, ValueError):
		return default


def _as_list(value, default=''):
	raw = value if value is not None else default
	return [item.strip() for item in str(raw).split(',') if item.strip()]


# App runtime
DEBUG = _as_bool(os.getenv('DEBUG'), False)
PORT = _as_int(os.getenv('PORT'), 5000)
SECRET_KEY = os.getenv('SECRET_KEY', 'change-me-in-production')
PUBLIC_BASE_URL = (os.getenv('PUBLIC_BASE_URL') or '').rstrip('/')

# CORS
CORS_ORIGINS = _as_list(os.getenv('CORS_ORIGINS'), 'http://localhost:5173')

# Admin credentials
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin')

# MySQL configuration
MYSQL_HOST = os.getenv('MYSQL_HOST', '127.0.0.1')
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DB = os.getenv('MYSQL_DB', 'alumniconnect')
MYSQL_PORT = _as_int(os.getenv('MYSQL_PORT'), 3306)
