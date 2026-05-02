import os
import sys
import pymysql

# Ensure backend config can be imported from the local workspace
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'backend'))
import config as cfg

print('Connecting to MySQL at', cfg.MYSQL_HOST, 'port', cfg.MYSQL_PORT, 'db', cfg.MYSQL_DB)
conn = pymysql.connect(host=cfg.MYSQL_HOST, user=cfg.MYSQL_USER, password=cfg.MYSQL_PASSWORD, db=cfg.MYSQL_DB, port=cfg.MYSQL_PORT, charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)
cur = conn.cursor()
sql = "UPDATE events SET banner_image=%s WHERE banner_image IS NULL OR banner_image=''"
params = ('events/test_event_banner.png',)
cur.execute(sql, params)
conn.commit()
print('Rows affected:', cur.rowcount)
cur.close()
conn.close()
