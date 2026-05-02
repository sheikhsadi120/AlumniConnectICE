"""
Success Stories Migration Script
Run: python migrate_success_stories.py
"""

import pymysql
import config
import time
import random

def _mysql_connect_kwargs(include_database=True, dict_cursor=False, autocommit=False):
    """Build connection kwargs for pymysql."""
    kwargs = {
        'host': config.MYSQL_HOST,
        'user': config.MYSQL_USER,
        'password': config.MYSQL_PASSWORD,
        'charset': 'utf8mb4',
        'cursorclass': pymysql.cursors.DictCursor if dict_cursor else pymysql.cursors.Cursor,
        'use_unicode': True,
        'autocommit': autocommit,
    }
    
    if include_database:
        kwargs['database'] = config.MYSQL_DB
    
    if config.MYSQL_PORT:
        kwargs['port'] = config.MYSQL_PORT
    
    if config.MYSQL_SSL_MODE:
        ssl_kwargs = {'ssl_mode': config.MYSQL_SSL_MODE}
        if config.MYSQL_SSL_CA:
            ssl_kwargs['ca'] = config.MYSQL_SSL_CA
        kwargs['ssl'] = ssl_kwargs
    
    return kwargs

def _connect_mysql_with_retry(include_database=False, dict_cursor=False, autocommit=False):
    attempts = max(0, int(config.DB_CONNECT_RETRIES)) + 1
    last_error = None

    for attempt in range(1, attempts + 1):
        try:
            return pymysql.connect(
                **_mysql_connect_kwargs(
                    include_database=include_database,
                    dict_cursor=dict_cursor,
                    autocommit=autocommit,
                )
            )
        except pymysql.err.OperationalError as e:
            last_error = e
            if attempt >= attempts:
                raise

            backoff = config.DB_RETRY_BASE_DELAY * (2 ** (attempt - 1))
            sleep_seconds = min(config.DB_RETRY_MAX_DELAY, max(0.1, backoff))
            sleep_seconds += random.uniform(0, min(0.25, sleep_seconds * 0.2))
            code = e.args[0] if e.args else '?'
            print(f"[DB CONNECT] transient error {code}; retry {attempt}/{attempts - 1} in {sleep_seconds:.2f}s")
            time.sleep(sleep_seconds)

    raise last_error

def migrate():
    try:
        conn = _connect_mysql_with_retry(include_database=True, dict_cursor=True, autocommit=True)
        
        with conn.cursor() as cur:
            # Create success_stories table
            sql = """
            CREATE TABLE IF NOT EXISTS success_stories (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                alumni_id       INT NOT NULL,
                title           VARCHAR(255),
                story           TEXT NOT NULL,
                current_position VARCHAR(255),
                batch           VARCHAR(50),
                department      VARCHAR(50) DEFAULT 'ICE',
                image_url       VARCHAR(500) DEFAULT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE,
                INDEX idx_success_created (created_at DESC),
                INDEX idx_success_alumni (alumni_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            
            cur.execute(sql)
            
            print("✓ Success stories table created successfully!")
            
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            conn.close()
        except:
            pass

if __name__ == '__main__':
    migrate()
