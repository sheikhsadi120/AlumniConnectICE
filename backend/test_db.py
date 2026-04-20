#!/usr/bin/env python3
"""Quick database connection test"""
import pymysql
import config

try:
    print('[Test] Attempting database connection...')
    conn = pymysql.connect(
        host=config.MYSQL_HOST,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        port=config.MYSQL_PORT,
        database=config.MYSQL_DB,
        charset='utf8mb4',
        connect_timeout=5,
        autocommit=True
    )
    print('[Test] ✓ Connection successful')
    
    cur = conn.cursor(pymysql.cursors.DictCursor)
    cur.execute('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=%s', (config.MYSQL_DB,))
    tables = cur.fetchall()
    print(f'[Test] Found {len(tables)} tables:')
    for t in tables:
        print(f'       - {t["TABLE_NAME"]}')
    
    # Check alumni table specifically
    try:
        cur.execute('SELECT COUNT(*) as count FROM alumni')
        result = cur.fetchone()
        print(f'[Test] Alumni table has {result["count"]} rows')
    except Exception as e:
        print(f'[Test] Alumni table check failed: {e}')
    
    cur.close()
    conn.close()
except Exception as e:
    print(f'[Test] ✗ Error: {e}')
    import traceback
    traceback.print_exc()
