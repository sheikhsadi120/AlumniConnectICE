import pymysql
import config

conn = pymysql.connect(
    host=config.MYSQL_HOST, user=config.MYSQL_USER,
    password=config.MYSQL_PASSWORD, database=config.MYSQL_DB, port=config.MYSQL_PORT
)
cur = conn.cursor()

for sql in [
    # events columns
    "ALTER TABLE events ADD COLUMN fee DECIMAL(10,2) DEFAULT 0",
    "ALTER TABLE events ADD COLUMN payment_account VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE events ADD COLUMN audience VARCHAR(20) DEFAULT 'both'",
    # alumni columns
    "ALTER TABLE alumni ADD COLUMN user_type VARCHAR(20) DEFAULT 'alumni'",
    "ALTER TABLE alumni ADD COLUMN graduation_year VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE alumni ADD COLUMN upgrade_request VARCHAR(20) DEFAULT NULL",
    "ALTER TABLE alumni ADD COLUMN upgrade_document VARCHAR(255) DEFAULT NULL",
    # trainings columns
    "ALTER TABLE trainings ADD COLUMN fee DECIMAL(10,2) DEFAULT 0",
    "ALTER TABLE trainings ADD COLUMN payment_account VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE trainings ADD COLUMN created_by INT DEFAULT NULL",
]:
    try:
        cur.execute(sql)
    except Exception as e:
        if "Duplicate column" in str(e):
            print(f"Column already exists, skipping: {e}")
        else:
            raise

# event attendees form-submissions table
cur.execute("""CREATE TABLE IF NOT EXISTS event_attendees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    alumni_id INT DEFAULT NULL,
    name VARCHAR(100) NOT NULL,
    student_id VARCHAR(30),
    session VARCHAR(20),
    email VARCHAR(150),
    phone VARCHAR(20),
    transaction_id VARCHAR(100),
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
)""")

# training attendees form-submissions table
cur.execute("""CREATE TABLE IF NOT EXISTS training_attendees (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    training_id     INT NOT NULL,
    alumni_id       INT DEFAULT NULL,
    name            VARCHAR(100) NOT NULL,
    student_id      VARCHAR(30),
    email           VARCHAR(150),
    phone           VARCHAR(20),
    payment_method  VARCHAR(50),
    transaction_id  VARCHAR(100),
    registered_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
)""")

conn.commit()
cur.close()
conn.close()
print("Migration completed successfully.")
