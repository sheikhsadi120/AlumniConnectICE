#!/usr/bin/env python3
"""
Clean database script - drops and recreates alumniconnect database from schema.sql
Run: python clean_db.py
"""
import pymysql
import config
import os

def clean_database():
    try:
        # Connect to MySQL (without specifying database)
        print('[Clean] Connecting to MySQL...')
        conn = pymysql.connect(
            host=config.MYSQL_HOST,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            port=config.MYSQL_PORT,
            charset='utf8mb4',
            connect_timeout=5
        )
        cur = conn.cursor()
        
        # Drop existing database
        print(f'[Clean] Dropping database "{config.MYSQL_DB}" if it exists...')
        cur.execute(f'DROP DATABASE IF EXISTS {config.MYSQL_DB}')
        print('[Clean] ✓ Database dropped')
        
        # Read schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        print(f'[Clean] Reading schema from {schema_path}...')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # Execute schema to recreate database and tables
        print('[Clean] Recreating database and tables...')
        for statement in schema_sql.split(';'):
            statement = statement.strip()
            if statement:
                cur.execute(statement)
        
        conn.commit()
        print('[Clean] ✓ Database recreated with clean schema')
        
        # Verify
        cur.execute(f'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema="{config.MYSQL_DB}"')
        table_count = cur.fetchone()[0]
        print(f'[Clean] ✓ Database now has {table_count} tables')
        
        cur.close()
        conn.close()
        print('[Clean] ✓ Database cleanup completed successfully')
        return True
        
    except Exception as e:
        print(f'[Clean] ✗ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = clean_database()
    exit(0 if success else 1)
