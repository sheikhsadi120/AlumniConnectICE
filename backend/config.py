import os
from urllib.parse import urlparse, unquote


def _load_dotenv_file(path):
	if not os.path.exists(path):
		return

	with open(path, 'r', encoding='utf-8') as f:
		for raw_line in f:
			line = raw_line.strip()
			if not line or line.startswith('#') or '=' not in line:
				continue

			key, value = line.split('=', 1)
			key = key.strip()
			value = value.strip()

			# Remove matching single or double quotes from values.
			if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
				value = value[1:-1]

			os.environ.setdefault(key, value)


_ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
_BACKEND_DIR = os.path.dirname(__file__)

# Load local env files if present (without overriding already-exported env vars).
for _dotenv_path in (
	os.path.join(_ROOT_DIR, '.env'),
	os.path.join(_ROOT_DIR, '.env.local'),
	os.path.join(_BACKEND_DIR, '.env'),
	os.path.join(_BACKEND_DIR, '.env.local'),
):
	_load_dotenv_file(_dotenv_path)


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


def _parse_mysql_url(url):
	if not url:
		return {}
	parsed = urlparse(url)
	if parsed.scheme not in {'mysql', 'mysql+pymysql'}:
		return {}
	return {
		'host': parsed.hostname,
		'port': parsed.port,
		'user': unquote(parsed.username) if parsed.username else None,
		'password': unquote(parsed.password) if parsed.password else None,
		'database': parsed.path.lstrip('/') if parsed.path else None,
	}


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

# SMTP email configuration
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = _as_int(os.getenv('SMTP_PORT'), 587)
SMTP_USE_TLS = _as_bool(os.getenv('SMTP_USE_TLS'), True)
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = (os.getenv('SMTP_PASSWORD', '') or '').replace(' ', '')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL') or SMTP_USERNAME
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'AlumniConnect Admin')

# MySQL configuration
MYSQL_URL = os.getenv('MYSQL_URL') or os.getenv('DATABASE_URL')

MYSQL_HOST = os.getenv('MYSQL_HOST') or os.getenv('MYSQLHOST') or '127.0.0.1'
MYSQL_USER = os.getenv('MYSQL_USER') or os.getenv('MYSQLUSER') or 'root'
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD') or os.getenv('MYSQLPASSWORD') or ''
MYSQL_DB = os.getenv('MYSQL_DB') or os.getenv('MYSQLDATABASE') or 'alumniconnect'
MYSQL_PORT = _as_int(os.getenv('MYSQL_PORT') or os.getenv('MYSQLPORT'), 3307)

_parsed_mysql = _parse_mysql_url(MYSQL_URL)
if _parsed_mysql:
	MYSQL_HOST = _parsed_mysql.get('host') or MYSQL_HOST
	MYSQL_USER = _parsed_mysql.get('user') or MYSQL_USER
	MYSQL_PASSWORD = _parsed_mysql.get('password') if _parsed_mysql.get('password') is not None else MYSQL_PASSWORD
	MYSQL_DB = _parsed_mysql.get('database') or MYSQL_DB
	MYSQL_PORT = _parsed_mysql.get('port') or MYSQL_PORT

# Auto-create database/tables from schema.sql on startup
AUTO_INIT_DB = _as_bool(os.getenv('AUTO_INIT_DB'), True)
