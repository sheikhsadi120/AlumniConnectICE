"""
AlumniConnect – Flask REST API
Run: python app.py
Endpoints all prefixed /api/
"""

from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import pymysql
import pymysql.cursors
from pymysql import err as pymysql_err
import config
import os
import uuid
from datetime import date
from openpyxl import load_workbook

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
ALLOWED_EXISTING_LIST_EXTENSIONS = {'xlsx', 'xls'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB limit
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS}}, supports_credentials=True)


def init_db_tables_from_schema():
    """Ensure DB and tables exist by executing schema.sql (safe with IF NOT EXISTS/INSERT IGNORE)."""
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    if not os.path.exists(schema_path):
        return

    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    # Drop comment lines first so statements after comments are not skipped.
    filtered_lines = []
    for line in schema_sql.splitlines():
        stripped = line.strip()
        if stripped.startswith('--'):
            continue
        filtered_lines.append(line)

    # schema.sql contains local CREATE DATABASE/USE lines; those are handled explicitly here.
    statements = []
    filtered_sql = '\n'.join(filtered_lines)
    for chunk in filtered_sql.split(';'):
        stmt = chunk.strip()
        if not stmt:
            continue
        upper = stmt.upper()
        if upper.startswith('CREATE DATABASE') or upper.startswith('USE '):
            continue
        statements.append(stmt)

    bootstrap_conn = pymysql.connect(
        host=config.MYSQL_HOST,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        port=config.MYSQL_PORT,
        charset='utf8mb4',
        autocommit=True,
    )

    try:
        cur = bootstrap_conn.cursor()
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{config.MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cur.execute(f"USE `{config.MYSQL_DB}`")
        for stmt in statements:
            cur.execute(stmt)
        cur.close()
    finally:
        bootstrap_conn.close()


def ensure_db_migrations():
    """Apply small safe migrations for already-existing databases."""
    conn = pymysql.connect(
        host=config.MYSQL_HOST,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DB,
        port=config.MYSQL_PORT,
        charset='utf8mb4',
        autocommit=True,
    )
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=%s AND TABLE_NAME='alumni' AND COLUMN_NAME='current_job_start_date'
            LIMIT 1
            """,
            (config.MYSQL_DB,),
        )
        if not cur.fetchone():
            cur.execute("ALTER TABLE alumni ADD COLUMN current_job_start_date DATE DEFAULT NULL")

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS past_job_experiences (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                alumni_id   INT NOT NULL,
                company     VARCHAR(150) DEFAULT NULL,
                designation VARCHAR(150) DEFAULT NULL,
                start_date  DATE DEFAULT NULL,
                end_date    DATE DEFAULT NULL,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
            )
            """
        )

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS email_logs (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                subject         VARCHAR(255) NOT NULL,
                recipient_count INT NOT NULL DEFAULT 0,
                sent_count      INT NOT NULL DEFAULT 0,
                failed_count    INT NOT NULL DEFAULT 0,
                status          VARCHAR(20) NOT NULL,
                error_message   TEXT DEFAULT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS existing_lists (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                title           VARCHAR(255) NOT NULL,
                file_name       VARCHAR(255) NOT NULL,
                stored_path     VARCHAR(500) NOT NULL,
                uploaded_by     VARCHAR(100) DEFAULT 'admin',
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # Add is_manually_added column if it doesn't exist
        cur.execute(
            """
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA=%s AND TABLE_NAME='alumni' AND COLUMN_NAME='is_manually_added'
            LIMIT 1
            """,
            (config.MYSQL_DB,),
        )
        if not cur.fetchone():
            cur.execute("ALTER TABLE alumni ADD COLUMN is_manually_added TINYINT DEFAULT 0")

        cur.close()
    finally:
        conn.close()


if config.AUTO_INIT_DB:
    try:
        init_db_tables_from_schema()
    except Exception as e:
        # Keep startup resilient; API endpoints will return DB errors if connectivity is still wrong.
        print(f"[DB INIT] Skipped due to error: {e}")

try:
    ensure_db_migrations()
except Exception as e:
    print(f"[DB MIGRATION] Skipped due to error: {e}")


def build_upload_url(filename):
    if not filename:
        return None
    base_url = config.PUBLIC_BASE_URL or request.host_url.rstrip('/')
    return f"{base_url}/uploads/{filename}"


def fetch_past_jobs(conn, alumni_id):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, company, designation, start_date, end_date, created_at
        FROM past_job_experiences
        WHERE alumni_id=%s
        ORDER BY COALESCE(end_date, '9999-12-31') DESC, id DESC
        """,
        (alumni_id,),
    )
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('start_date'):
            r['start_date'] = str(r['start_date'])
        if r.get('end_date'):
            r['end_date'] = str(r['end_date'])
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])
    return rows


def insert_email_log(conn, subject, recipient_count, sent_count, failed_count, status, error_message=None):
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO email_logs (subject, recipient_count, sent_count, failed_count, status, error_message)
        VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (
            (subject or '')[:255],
            int(recipient_count or 0),
            int(sent_count or 0),
            int(failed_count or 0),
            (status or 'failed')[:20],
            (str(error_message)[:1000] if error_message else None),
        ),
    )

    # Keep only latest 10 logs.
    cur.execute(
        """
        DELETE FROM email_logs
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT id
                FROM email_logs
                ORDER BY created_at DESC, id DESC
                LIMIT 10
            ) AS keep_rows
        )
        """
    )
    conn.commit()
    cur.close()


def fetch_email_logs(conn, limit=10):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, subject, recipient_count, sent_count, failed_count, status, error_message, created_at
        FROM email_logs
        ORDER BY created_at DESC, id DESC
        LIMIT %s
        """,
        (int(limit),),
    )
    rows = cur.fetchall()
    cur.close()
    for row in rows:
        if row.get('created_at'):
            row['created_at'] = str(row['created_at'])
    return rows


def smtp_configured():
        return bool(config.SMTP_HOST and config.SMTP_PORT and config.SMTP_USERNAME and config.SMTP_PASSWORD and config.SMTP_FROM_EMAIL)


def _build_email_html(subject, preheader, message, cta_text='Open AlumniConnect'):
        escaped_subject = str(subject or '')
        escaped_preheader = str(preheader or '')
        escaped_body = str(message or '').replace('\n', '<br>')
        escaped_cta = str(cta_text or 'Open AlumniConnect')
        base_url = config.PUBLIC_BASE_URL or 'http://localhost:5173'
        return f"""
        <html>
            <body style=\"margin:0;padding:0;background:#f7f2ff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#2d0a50;\">
                <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px 10px;\">
                    <tr>
                        <td align=\"center\">
                            <table role=\"presentation\" width=\"640\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ecdffb;\">
                                <tr>
                                    <td style=\"padding:20px 26px;background:linear-gradient(135deg,#4f1c78,#a4508b);color:white;\">
                                        <div style=\"font-size:12px;letter-spacing:1px;opacity:0.8;font-weight:700;\">ALUMNICONNECT</div>
                                        <div style=\"font-size:24px;line-height:1.3;font-weight:700;margin-top:8px;\">{escaped_subject}</div>
                                        <div style=\"font-size:13px;line-height:1.6;opacity:0.9;margin-top:8px;\">{escaped_preheader}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style=\"padding:26px;color:#4a3764;font-size:15px;line-height:1.7;\">{escaped_body}</td>
                                </tr>
                                <tr>
                                    <td style=\"padding:0 26px 26px;\">
                                        <a href=\"{base_url}\" style=\"display:inline-block;padding:11px 18px;background:linear-gradient(135deg,#5f2c82,#a4508b);color:#fff;text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;\">{escaped_cta}</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
        """


def send_email(to_emails, subject, message, preheader='', cta_text='Open AlumniConnect'):
        recipients = [e.strip() for e in (to_emails or []) if str(e).strip()]
        if not recipients:
                return {'sent': 0, 'failed': 0, 'errors': []}

        if not smtp_configured():
                raise RuntimeError('SMTP is not configured. Set SMTP_* in backend/.env.')

        html_content = _build_email_html(subject, preheader, message, cta_text)
        plain_content = f"{subject}\n\n{preheader}\n\n{message}\n"

        sent_count = 0
        failed_count = 0
        errors = []

        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as server:
                if config.SMTP_USE_TLS:
                        server.starttls()
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)

                for email in recipients:
                        msg = MIMEMultipart('alternative')
                        msg['Subject'] = subject
                        msg['From'] = f"{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>"
                        msg['To'] = email
                        msg.attach(MIMEText(plain_content, 'plain', 'utf-8'))
                        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
                        try:
                                server.sendmail(config.SMTP_FROM_EMAIL, [email], msg.as_string())
                                sent_count += 1
                        except Exception as ex:
                                failed_count += 1
                                errors.append({'email': email, 'error': str(ex)})

        return {'sent': sent_count, 'failed': failed_count, 'errors': errors}

# ─── Global JSON error handlers ───────────────────────
@app.errorhandler(Exception)
def handle_exception(e):
    """Return JSON for all unhandled exceptions instead of HTML."""
    if isinstance(e, pymysql_err.OperationalError):
        code = e.args[0] if e.args else None
        if code == 1045:
            return jsonify({
                'success': False,
                'message': 'Database authentication failed. Set MYSQL_USER and MYSQL_PASSWORD in backend/.env, then restart backend.'
            }), 503

    if config.DEBUG:
        import traceback
        return jsonify({'success': False, 'message': str(e), 'trace': traceback.format_exc()[-500:]}), 500
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'message': 'Not found'}), 404

# ─── DB connection helper ──────────────────────────────
def get_db():
    """Return a per-request cached DB connection (auto-closed at request teardown)."""
    if 'db' not in g:
        g.db = pymysql.connect(
            host=config.MYSQL_HOST,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            database=config.MYSQL_DB,
            port=config.MYSQL_PORT,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
        )
    return g.db

@app.teardown_appcontext
def close_db(error):
    """Close the DB connection at the end of every request."""
    db = g.pop('db', None)
    if db is not None:
        try:
            db.close()
        except Exception:
            pass


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ═══════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════

@app.route('/api/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    if data.get('username') == config.ADMIN_USERNAME and data.get('password') == config.ADMIN_PASSWORD:
        return jsonify({'success': True, 'message': 'Admin login successful'})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@app.route('/api/alumni-login', methods=['POST'])
def alumni_login():
    data  = request.get_json()
    email = data.get('email', '').strip()
    pwd   = data.get('password', '')

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM alumni WHERE email = %s", (email,))
    alumni = cur.fetchone()
    cur.close()

    if not alumni:
        return jsonify({'success': False, 'message': 'Email not found'}), 404

    if alumni['status'] == 'pending':
        return jsonify({'success': False, 'message': 'Your registration is pending approval'}), 403

    if alumni['status'] == 'rejected':
        return jsonify({'success': False, 'message': 'Your registration was rejected'}), 403

    if not check_password_hash(alumni['password'], pwd):
        return jsonify({'success': False, 'message': 'Incorrect password'}), 401

    # Block students from logging in as alumni
    if (alumni.get('user_type') or 'alumni') == 'student':
        return jsonify({'success': False, 'message': 'This account is a student account. Please use the Student Login page.'}), 403

    past_jobs = fetch_past_jobs(conn, alumni['id'])

    return jsonify({
        'success': True,
        'alumni': {
            'id':          alumni['id'],
            'name':        alumni['name'],
            'email':       alumni['email'],
            'phone':       alumni['phone'],
            'department':  alumni['department'],
            'student_id':  alumni['student_id'],
            'session':     alumni['session'],
            'company':     alumni['company'],
            'designation': alumni['designation'],
            'current_job_start_date': str(alumni['current_job_start_date']) if alumni.get('current_job_start_date') else '',
            'past_jobs':          past_jobs,
            'status':             alumni['status'],
            'photo_url':          build_upload_url(alumni.get('photo')),
            'bio':                alumni.get('bio', ''),
            'research_interests': alumni.get('research_interests', ''),
            'extracurricular':    alumni.get('extracurricular', ''),
            'linkedin':           alumni.get('linkedin', ''),
            'github':             alumni.get('github', ''),
            'twitter':            alumni.get('twitter', ''),
            'website':            alumni.get('website', ''),
            'user_type':          alumni.get('user_type', 'alumni'),
            'upgrade_request':    alumni.get('upgrade_request'),
        }
    })


@app.route('/api/student-login', methods=['POST'])
def student_login():
    data  = request.get_json()
    email = data.get('email', '').strip()
    pwd   = data.get('password', '')

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM alumni WHERE email = %s", (email,))
    person = cur.fetchone()
    cur.close()

    if not person:
        return jsonify({'success': False, 'message': 'You are not registered yet. Please register as a student first.'}), 404

    # Upgraded alumni should not log in here
    if (person.get('user_type') or 'alumni') != 'student':
        if person.get('upgrade_request') == 'approved' or (person.get('user_type') or 'alumni') == 'alumni':
            return jsonify({'success': False, 'message': 'You have been upgraded to Alumni. Please use the Alumni Login page.'}), 403
        return jsonify({'success': False, 'message': 'You are not registered yet. Please register as a student first.'}), 403

    if person['status'] == 'pending':
        return jsonify({'success': False, 'message': 'Your registration is pending admin approval.'}), 403

    if person['status'] == 'rejected':
        return jsonify({'success': False, 'message': 'Your registration was rejected by the admin.'}), 403

    if not check_password_hash(person['password'], pwd):
        return jsonify({'success': False, 'message': 'Incorrect password.'}), 401

    return jsonify({
        'success': True,
        'alumni': {
            'id':             person['id'],
            'name':           person['name'],
            'email':          person['email'],
            'phone':          person['phone'],
            'department':     person['department'],
            'student_id':     person['student_id'],
            'session':        person['session'],
            'company':        person.get('company', ''),
            'designation':    person.get('designation', ''),
            'current_job_start_date': str(person['current_job_start_date']) if person.get('current_job_start_date') else '',
            'past_jobs':       fetch_past_jobs(conn, person['id']),
            'graduation_year':person.get('graduation_year', ''),
            'status':         person['status'],
            'user_type':      person.get('user_type', 'student'),
            'upgrade_request':person.get('upgrade_request'),
            'photo_url':      build_upload_url(person.get('photo')),
            'bio':            person.get('bio', ''),
        }
    })


# ═══════════════════════════════════════════════════════
#  ALUMNI REGISTRATION + MANAGEMENT
# ═══════════════════════════════════════════════════════

@app.route('/api/register', methods=['POST'])
def register():
    # Accept both multipart/form-data (with file) and JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
        photo_file = request.files.get('photo')
    else:
        data = request.get_json() or {}
        photo_file = None

    required = ['name', 'email', 'password']
    for f in required:
        if not data.get(f):
            return jsonify({'success': False, 'message': f'{f} is required'}), 400

    # Save profile photo if provided
    photo_filename = None
    if photo_file and photo_file.filename:
        ext = photo_file.filename.rsplit('.', 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            safe_name = secure_filename(photo_file.filename)
            import uuid
            photo_filename = f"{uuid.uuid4().hex}_{safe_name}"
            photo_file.save(os.path.join(UPLOAD_FOLDER, photo_filename))

    # Save ID card photo if provided
    idcard_file = request.files.get('idcard') if (request.content_type and 'multipart/form-data' in request.content_type) else None
    idcard_filename = None
    if idcard_file and idcard_file.filename:
        ext = idcard_file.filename.rsplit('.', 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            safe_name = secure_filename(idcard_file.filename)
            import uuid
            idcard_filename = f"{uuid.uuid4().hex}_{safe_name}"
            idcard_file.save(os.path.join(UPLOAD_FOLDER, idcard_filename))

    hashed = generate_password_hash(data['password'])
    user_type = data.get('user_type', 'alumni')
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO alumni (name, email, phone, department, student_id, session,
                                  graduation_year, company, designation, password, photo, id_photo, status, user_type)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending',%s)""",
            (data.get('name'), data.get('email'), data.get('phone'),
             data.get('department', 'ICE'), data.get('student_id'),
             data.get('session'), data.get('graduation_year'),
             data.get('company'), data.get('designation'),
             hashed, photo_filename, idcard_filename, user_type)
        )
        conn.commit()
        new_id = cur.lastrowid
    except Exception as e:
        conn.rollback()
        if 'Duplicate entry' in str(e):
            return jsonify({'success': False, 'message': 'Email already registered'}), 409
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'success': True, 'id': new_id, 'message': 'Registration submitted. Waiting for admin approval.'}), 201


@app.route('/api/pending', methods=['GET'])
def get_pending():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id,name,email,phone,department,student_id,session,graduation_year,company,designation,photo,id_photo,status,user_type,created_at FROM alumni WHERE status='pending' ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        r['photo_url'] = build_upload_url(r.get('photo'))
        r['id_photo_url'] = build_upload_url(r.get('id_photo'))
    return jsonify(rows)


@app.route('/api/alumni', methods=['GET'])
def get_alumni():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id,name,email,phone,department,student_id,session,graduation_year,company,designation,current_job_start_date,photo,bio,research_interests,extracurricular,linkedin,github,twitter,website,status,created_at FROM alumni WHERE status='approved' AND (user_type IS NULL OR user_type='alumni') AND (is_manually_added IS NULL OR is_manually_added=0) ORDER BY name")
    rows = cur.fetchall()

    cur.execute(
        """
        SELECT alumni_id, id, company, designation, start_date, end_date, created_at
        FROM past_job_experiences
        ORDER BY COALESCE(end_date, '9999-12-31') DESC, id DESC
        """
    )
    past_rows = cur.fetchall()
    cur.close()

    past_jobs_by_alumni = {}
    for p in past_rows:
        p_item = {
            'id': p.get('id'),
            'company': p.get('company'),
            'designation': p.get('designation'),
            'start_date': str(p['start_date']) if p.get('start_date') else None,
            'end_date': str(p['end_date']) if p.get('end_date') else None,
            'created_at': str(p['created_at']) if p.get('created_at') else None,
        }
        past_jobs_by_alumni.setdefault(p['alumni_id'], []).append(p_item)

    for r in rows:
        r['photo_url'] = build_upload_url(r.get('photo'))
        if r.get('current_job_start_date'):
            r['current_job_start_date'] = str(r['current_job_start_date'])
        r['past_jobs'] = past_jobs_by_alumni.get(r['id'], [])
    return jsonify(rows)


@app.route('/api/students', methods=['GET'])
def get_students():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id,name,email,phone,department,student_id,session,photo,status,created_at FROM alumni WHERE status='approved' AND user_type='student' ORDER BY name")
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        r['photo_url'] = build_upload_url(r.get('photo'))
    return jsonify(rows)


@app.route('/api/alumni/<int:aid>', methods=['PUT'])
def update_alumni(aid):
    data = request.get_json() or {}
    fields = ['name','phone','company','designation','current_job_start_date','session','bio','research_interests','extracurricular','linkedin','github','twitter','website']
    update_fields = [f for f in fields if f in data]
    has_past_jobs = 'past_jobs' in data

    if not update_fields and not has_past_jobs:
        return jsonify({'success': False, 'message': 'No fields to update'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT company, designation, current_job_start_date FROM alumni WHERE id=%s", (aid,))
        existing = cur.fetchone()
        if not existing:
            return jsonify({'success': False, 'message': 'Alumni not found'}), 404

        prev_company = (existing.get('company') or '').strip()
        prev_designation = (existing.get('designation') or '').strip()
        prev_start = existing.get('current_job_start_date')

        next_company = (data['company'] if 'company' in data else existing.get('company') or '').strip()
        next_designation = (data['designation'] if 'designation' in data else existing.get('designation') or '').strip()
        next_start = data['current_job_start_date'] if 'current_job_start_date' in data else existing.get('current_job_start_date')

        current_job_changed = (next_company != prev_company) or (next_designation != prev_designation)

        if update_fields:
            sets = ', '.join(f"{f}=%s" for f in update_fields)
            vals = [data[f] for f in update_fields]
            vals.append(aid)
            cur.execute(f"UPDATE alumni SET {sets} WHERE id=%s", vals)

        if has_past_jobs:
            provided = data.get('past_jobs') or []
            if not isinstance(provided, list):
                return jsonify({'success': False, 'message': 'past_jobs must be a list'}), 400

            cur.execute("DELETE FROM past_job_experiences WHERE alumni_id=%s", (aid,))
            for item in provided:
                if not isinstance(item, dict):
                    continue
                company = (item.get('company') or '').strip()
                designation = (item.get('designation') or '').strip()
                start_date = item.get('start_date') or None
                end_date = item.get('end_date') or None
                if not company and not designation:
                    continue
                cur.execute(
                    "INSERT INTO past_job_experiences (alumni_id, company, designation, start_date, end_date) VALUES (%s,%s,%s,%s,%s)",
                    (aid, company or None, designation or None, start_date, end_date),
                )
        elif current_job_changed and (prev_company or prev_designation):
            auto_end = next_start or date.today().isoformat()
            cur.execute(
                """
                SELECT id
                FROM past_job_experiences
                WHERE alumni_id=%s
                  AND COALESCE(company,'')=%s
                  AND COALESCE(designation,'')=%s
                  AND COALESCE(start_date,'1000-01-01') = COALESCE(%s,'1000-01-01')
                  AND COALESCE(end_date,'1000-01-01') = COALESCE(%s,'1000-01-01')
                LIMIT 1
                """,
                (aid, prev_company, prev_designation, prev_start, auto_end),
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO past_job_experiences (alumni_id, company, designation, start_date, end_date) VALUES (%s,%s,%s,%s,%s)",
                    (aid, prev_company or None, prev_designation or None, prev_start, auto_end),
                )

        conn.commit()
        return jsonify({'success': True, 'past_jobs': fetch_past_jobs(conn, aid)})
    except Exception as ex:
        conn.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500
    finally:
        cur.close()


@app.route('/api/alumni/<int:aid>', methods=['DELETE'])
def delete_alumni(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM alumni WHERE id=%s", (aid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/approve/<int:aid>', methods=['POST'])
def approve(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name, email, user_type FROM alumni WHERE id=%s", (aid,))
    person = cur.fetchone()
    cur.execute("UPDATE alumni SET status='approved' WHERE id=%s", (aid,))
    conn.commit()
    cur.close()

    warning = None
    if person and person.get('email'):
        try:
            role_label = 'student' if (person.get('user_type') == 'student') else 'alumni'
            send_email(
                [person['email']],
                'Your AlumniConnect registration has been approved',
                f"Hi {person.get('name') or 'there'},\n\nYour {role_label} registration has been approved by admin. You can now login and use your dashboard.",
                'Congratulations. Your account is now active.',
                'Login to AlumniConnect'
            )
        except Exception as ex:
            warning = str(ex)

    return jsonify({'success': True, 'email_warning': warning})


@app.route('/api/reject/<int:aid>', methods=['POST'])
def reject(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE alumni SET status='rejected' WHERE id=%s", (aid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/request-upgrade/<int:aid>', methods=['POST'])
def request_upgrade(aid):
    content_type = (request.content_type or '').lower()
    is_multipart = ('multipart/form-data' in content_type) or bool(request.files)
    data = request.form if is_multipart else (request.get_json(silent=True) or {})
    document_file = request.files.get('document') if is_multipart else None

    conn = get_db()
    cur = conn.cursor()

    document_filename = None
    if document_file and document_file.filename:
        ext = document_file.filename.rsplit('.', 1)[-1].lower()
        if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            cur.close()
            return jsonify({'success': False, 'message': 'Invalid file type. Upload JPG, JPEG, PNG, or WEBP image only.'}), 400
        safe_name = secure_filename(document_file.filename)
        document_filename = f"{uuid.uuid4().hex}_{safe_name}"
        document_file.save(os.path.join(UPLOAD_FOLDER, document_filename))

    # Optionally update graduation details provided at request time
    updates = []
    vals = []
    for field in ['graduation_year', 'company', 'designation']:
        if data.get(field):
            updates.append(f"{field}=%s")
            vals.append(data[field])
    if document_filename:
        updates.append("upgrade_document=%s")
        vals.append(document_filename)
    updates.append("upgrade_request='pending'")
    vals.append(aid)
    cur.execute(f"UPDATE alumni SET {', '.join(updates)} WHERE id=%s", vals)
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/upgrade-requests', methods=['GET'])
def get_upgrade_requests():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT id,name,email,phone,department,student_id,session,graduation_year,
                company,designation,photo,id_photo,upgrade_document,status,user_type,upgrade_request,created_at
           FROM alumni WHERE upgrade_request='pending' ORDER BY created_at DESC"""
    )
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        r['photo_url'] = build_upload_url(r.get('photo'))
        r['id_photo_url'] = build_upload_url(r.get('id_photo'))
        r['upgrade_document_url'] = build_upload_url(r.get('upgrade_document'))
    return jsonify(rows)


@app.route('/api/approve-upgrade/<int:aid>', methods=['POST'])
def approve_upgrade(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name, email FROM alumni WHERE id=%s", (aid,))
    person = cur.fetchone()
    cur.execute("UPDATE alumni SET user_type='alumni', upgrade_request='approved' WHERE id=%s", (aid,))
    conn.commit()
    cur.close()

    warning = None
    if person and person.get('email'):
        try:
            send_email(
                [person['email']],
                'Your Alumni upgrade request has been approved',
                f"Hi {person.get('name') or 'there'},\n\nGreat news. Your account has been upgraded to Alumni status. Please login from the Alumni Login page.",
                'Your membership tier has been upgraded.',
                'Open Alumni Dashboard'
            )
        except Exception as ex:
            warning = str(ex)

    return jsonify({'success': True, 'email_warning': warning})


@app.route('/api/reject-upgrade/<int:aid>', methods=['POST'])
def reject_upgrade(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE alumni SET upgrade_request='rejected' WHERE id=%s", (aid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


# ═══════════════════════════════════════════════════════
#  EVENTS
# ═══════════════════════════════════════════════════════

@app.route('/api/events', methods=['GET'])
def get_events():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM events ORDER BY date DESC")
    rows = cur.fetchall()
    cur.close()
    # stringify dates
    for r in rows:
        if r.get('date'):
            r['date'] = str(r['date'])
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])
    return jsonify(rows)


@app.route('/api/events', methods=['POST'])
def add_event():
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO events (title, date, location, description, fee, payment_account, audience) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (data.get('title'), data.get('date'), data.get('location'), data.get('description'),
         data.get('fee', 0) or 0, data.get('payment_account'), data.get('audience', 'both'))
    )
    conn.commit()
    new_id = cur.lastrowid

    audience = data.get('audience', 'both')
    if audience == 'students':
        cur.execute("SELECT email FROM alumni WHERE status='approved' AND user_type='student' AND email IS NOT NULL AND email <> ''")
    elif audience == 'alumni':
        cur.execute("SELECT email FROM alumni WHERE status='approved' AND (user_type IS NULL OR user_type='alumni') AND email IS NOT NULL AND email <> ''")
    else:
        cur.execute("SELECT email FROM alumni WHERE status='approved' AND email IS NOT NULL AND email <> ''")
    event_recipients = [r['email'] for r in cur.fetchall()]

    cur.close()

    warning = None
    try:
        send_email(
            event_recipients,
            f"New Event Notice: {data.get('title', 'AlumniConnect Event')}",
            f"A new event has been published.\n\nTitle: {data.get('title', '')}\nDate: {data.get('date', '')}\nLocation: {data.get('location', '')}\n\n{data.get('description', '')}",
            'A new event has been announced for your community.',
            'View Event Details'
        )
    except Exception as ex:
        warning = str(ex)

    return jsonify({'success': True, 'id': new_id, 'email_warning': warning}), 201


@app.route('/api/email/send', methods=['POST'])
def send_bulk_email_endpoint():
    data = request.get_json() or {}
    recipients = data.get('recipient_emails') or []
    subject = (data.get('subject') or '').strip()
    message = (data.get('message') or '').strip()
    preheader = (data.get('preheader') or '').strip()
    cta_text = (data.get('cta_text') or '').strip() or 'Open AlumniConnect'

    if not subject:
        return jsonify({'success': False, 'message': 'Subject is required'}), 400
    if not message:
        return jsonify({'success': False, 'message': 'Message is required'}), 400
    if not recipients:
        return jsonify({'success': False, 'message': 'No recipients selected'}), 400

    conn = get_db()
    try:
        result = send_email(recipients, subject, message, preheader, cta_text)
        sent = int(result.get('sent', 0))
        failed = int(result.get('failed', 0))
        status = 'success' if failed == 0 else ('partial' if sent > 0 else 'failed')
        insert_email_log(conn, subject, len(recipients), sent, failed, status, None)
        return jsonify({'success': True, **result})
    except Exception as ex:
        insert_email_log(conn, subject, len(recipients), 0, len(recipients), 'failed', str(ex))
        return jsonify({'success': False, 'message': str(ex)}), 500


@app.route('/api/email/logs', methods=['GET'])
def get_email_logs():
    conn = get_db()
    return jsonify(fetch_email_logs(conn, limit=10))


@app.route('/api/events/<int:eid>', methods=['PUT'])
def update_event(eid):
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE events SET title=%s, date=%s, location=%s, description=%s, fee=%s, payment_account=%s, audience=%s WHERE id=%s",
        (data.get('title'), data.get('date'), data.get('location'), data.get('description'),
         data.get('fee', 0) or 0, data.get('payment_account'), data.get('audience', 'both'), eid)
    )
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/events/<int:eid>', methods=['DELETE'])
def delete_event(eid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM events WHERE id=%s", (eid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/events/<int:eid>/register', methods=['POST'])
def register_for_event(eid):
    """Alumni fills a form to register for an event."""
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO event_attendees (event_id, alumni_id, name, student_id, session, email, phone, transaction_id)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (eid, data.get('alumni_id'), data.get('name'), data.get('student_id'),
             data.get('session'), data.get('email'), data.get('phone'), data.get('transaction_id'))
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close()
    return jsonify({'success': True}), 201


@app.route('/api/events/<int:eid>/attendees', methods=['GET'])
def get_event_attendees(eid):
    """Admin gets the list of alumni registered for an event."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT id, alumni_id, name, student_id, session, email, phone, transaction_id,
                  registered_at
           FROM event_attendees WHERE event_id=%s ORDER BY registered_at DESC""",
        (eid,)
    )
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('registered_at'):
            r['registered_at'] = str(r['registered_at'])
    return jsonify(rows)


@app.route('/api/events/<int:eid>/join', methods=['POST'])
def join_event(eid):
    data = request.get_json()
    alumni_id = data.get('alumni_id')
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO event_registrations (alumni_id, event_id) VALUES (%s,%s)", (alumni_id, eid))
        conn.commit()
    except Exception:
        conn.rollback()
        return jsonify({'success': False, 'message': 'Already joined'}), 409
    finally:
        cur.close()
    return jsonify({'success': True})


@app.route('/api/events/<int:eid>/leave', methods=['POST'])
def leave_event(eid):
    data = request.get_json()
    alumni_id = data.get('alumni_id')
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM event_registrations WHERE alumni_id=%s AND event_id=%s", (alumni_id, eid))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/alumni/<int:aid>/events', methods=['GET'])
def alumni_events(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT e.* FROM events e
        JOIN event_registrations er ON e.id = er.event_id
        WHERE er.alumni_id = %s
    """, (aid,))
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('date'): r['date'] = str(r['date'])
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
    return jsonify(rows)


# ═══════════════════════════════════════════════════════
#  FUND TRANSACTIONS
# ═══════════════════════════════════════════════════════

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM fund_transactions ORDER BY date DESC")
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('date'): r['date'] = str(r['date'])
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('amount'): r['amount'] = float(r['amount'])
    return jsonify(rows)


@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO fund_transactions (donor, type, amount, date, note) VALUES (%s,%s,%s,%s,%s)",
        (data.get('donor'), data.get('type'), data.get('amount'), data.get('date'), data.get('note'))
    )
    conn.commit()
    new_id = cur.lastrowid
    cur.close()
    return jsonify({'success': True, 'id': new_id}), 201


@app.route('/api/transactions/<int:tid>', methods=['DELETE'])
def delete_transaction(tid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM fund_transactions WHERE id=%s", (tid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


# ═══════════════════════════════════════════════════════
#  TRAININGS
# ═══════════════════════════════════════════════════════

@app.route('/api/trainings', methods=['GET'])
def get_trainings():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM trainings ORDER BY date DESC")
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('date'): r['date'] = str(r['date'])
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
    return jsonify(rows)


@app.route('/api/trainings', methods=['POST'])
def add_training():
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO trainings (title, trainer, date, seats, enrolled, status, fee, payment_account, created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (data.get('title'), data.get('trainer'), data.get('date'),
         data.get('seats', 30), data.get('enrolled', 0), data.get('status', 'Upcoming'),
         data.get('fee', 0), data.get('payment_account'), data.get('created_by'))
    )
    conn.commit()
    new_id = cur.lastrowid
    cur.close()
    return jsonify({'success': True, 'id': new_id}), 201


@app.route('/api/trainings/<int:tid>', methods=['PUT'])
def update_training(tid):
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE trainings SET title=%s, trainer=%s, date=%s, seats=%s, status=%s, fee=%s, payment_account=%s WHERE id=%s",
        (data.get('title'), data.get('trainer'), data.get('date'),
         data.get('seats'), data.get('status'),
         data.get('fee', 0), data.get('payment_account'), tid)
    )
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/trainings/<int:tid>', methods=['DELETE'])
def delete_training(tid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM trainings WHERE id=%s", (tid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/trainings/<int:tid>/register', methods=['POST'])
def register_for_training(tid):
    data = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT seats, enrolled FROM trainings WHERE id=%s", (tid,))
    t = cur.fetchone()
    if not t:
        cur.close()
        return jsonify({'success': False, 'message': 'Training not found'}), 404
    if t['enrolled'] >= t['seats']:
        cur.close()
        return jsonify({'success': False, 'message': 'Training is full'}), 400
    try:
        cur.execute(
            "INSERT INTO training_attendees (training_id, alumni_id, name, student_id, email, phone, payment_method, transaction_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (tid, data.get('alumni_id'), data.get('name'), data.get('student_id'),
             data.get('email'), data.get('phone'), data.get('payment_method'), data.get('transaction_id'))
        )
        cur.execute("UPDATE trainings SET enrolled = enrolled + 1 WHERE id=%s", (tid,))
        conn.commit()
    except Exception as ex:
        conn.rollback()
        cur.close()
        return jsonify({'success': False, 'message': str(ex)}), 409
    cur.close()
    return jsonify({'success': True}), 201


@app.route('/api/trainings/<int:tid>/attendees', methods=['GET'])
def get_training_attendees(tid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM training_attendees WHERE training_id=%s ORDER BY registered_at DESC", (tid,))
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('registered_at'): r['registered_at'] = str(r['registered_at'])
    return jsonify(rows)


@app.route('/api/alumni/<int:aid>/enrolled-training-ids', methods=['GET'])
def get_enrolled_training_ids(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT training_id FROM training_attendees WHERE alumni_id=%s", (aid,))
    rows = cur.fetchall()
    cur.close()
    return jsonify([r['training_id'] for r in rows])


@app.route('/api/alumni/<int:aid>/registered-event-ids', methods=['GET'])
def get_registered_event_ids(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT event_id FROM event_attendees WHERE alumni_id=%s", (aid,))
    rows = cur.fetchall()
    cur.close()
    return jsonify([r['event_id'] for r in rows])


@app.route('/api/trainings/<int:tid>/enroll', methods=['POST'])
def enroll_training(tid):
    data = request.get_json()
    alumni_id = data.get('alumni_id')
    conn = get_db()
    cur = conn.cursor()
    # check seats
    cur.execute("SELECT seats, enrolled FROM trainings WHERE id=%s", (tid,))
    t = cur.fetchone()
    if not t:
        cur.close()
        return jsonify({'success': False, 'message': 'Training not found'}), 404
    if t['enrolled'] >= t['seats']:
        cur.close()
        return jsonify({'success': False, 'message': 'Training is full'}), 400
    try:
        cur.execute("INSERT INTO training_enrollments (alumni_id, training_id) VALUES (%s,%s)", (alumni_id, tid))
        cur.execute("UPDATE trainings SET enrolled = enrolled + 1 WHERE id=%s", (tid,))
        conn.commit()
    except Exception:
        conn.rollback()
        return jsonify({'success': False, 'message': 'Already enrolled'}), 409
    finally:
        cur.close()
    return jsonify({'success': True})


@app.route('/api/trainings/<int:tid>/unenroll', methods=['POST'])
def unenroll_training(tid):
    data = request.get_json()
    alumni_id = data.get('alumni_id')
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM training_enrollments WHERE alumni_id=%s AND training_id=%s", (alumni_id, tid))
    if cur.rowcount > 0:
        cur.execute("UPDATE trainings SET enrolled = GREATEST(0, enrolled - 1) WHERE id=%s", (tid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/alumni/<int:aid>/trainings', methods=['GET'])
def alumni_trainings(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT t.* FROM trainings t
        JOIN training_enrollments te ON t.id = te.training_id
        WHERE te.alumni_id = %s
    """, (aid,))
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('date'): r['date'] = str(r['date'])
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
    return jsonify(rows)


# ═══════════════════════════════════════════════════════
#  JOBS
# ═══════════════════════════════════════════════════════

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Returns only approved jobs (used by alumni dashboard and admin listing)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM jobs WHERE status='approved' ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('deadline'):   r['deadline']   = str(r['deadline'])
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
    return jsonify(rows)


@app.route('/api/jobs/pending-submissions', methods=['GET'])
def get_pending_jobs():
    """Returns alumni-submitted jobs awaiting admin approval."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT j.*, a.name AS alumni_name, a.email AS alumni_email
        FROM jobs j
        LEFT JOIN alumni a ON a.id = j.submitted_by
        WHERE j.status='pending'
        ORDER BY j.created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('deadline'):   r['deadline']   = str(r['deadline'])
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
    return jsonify(rows)


@app.route('/api/jobs', methods=['POST'])
def add_job():
    """Admin posts a job – immediately approved."""
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'INSERT INTO jobs (title, company, location, type, deadline, description, apply_link, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
        (d['title'], d.get('company',''), d.get('location',''), d.get('type','Full-time'),
         d.get('deadline') or None, d.get('description',''), d.get('apply_link',''), 'approved')
    )
    conn.commit()
    new_id = cur.lastrowid
    cur.close()
    return jsonify({'success': True, 'id': new_id}), 201


@app.route('/api/jobs/submit', methods=['POST'])
def submit_job():
    """Alumni submits a job for admin approval."""
    d = request.get_json()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'INSERT INTO jobs (title, company, location, type, deadline, description, apply_link, submitted_by, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)',
        (d['title'], d.get('company',''), d.get('location',''), d.get('type','Full-time'),
         d.get('deadline') or None, d.get('description',''), d.get('apply_link',''),
         d.get('submitted_by') or None, 'pending')
    )
    conn.commit()
    new_id = cur.lastrowid
    cur.close()
    return jsonify({'success': True, 'id': new_id}), 201


@app.route('/api/jobs/<int:jid>/approve', methods=['POST'])
def approve_job(jid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE jobs SET status='approved' WHERE id=%s", (jid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


@app.route('/api/jobs/<int:jid>', methods=['DELETE'])
def delete_job(jid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('DELETE FROM jobs WHERE id=%s', (jid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


# ═══════════════════════════════════════════════════════
#  EXISTING LISTS (ADMIN EXCEL UPLOADS)
# ═══════════════════════════════════════════════════════

@app.route('/api/existing-lists', methods=['GET'])
def get_existing_lists():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, file_name, stored_path, uploaded_by, created_at FROM existing_lists ORDER BY created_at DESC, id DESC")
    rows = cur.fetchall()
    cur.close()

    for r in rows:
        r['file_url'] = build_upload_url(r.get('stored_path'))
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])

    return jsonify(rows)


@app.route('/api/existing-lists', methods=['POST'])
def upload_existing_list():
    content_type = (request.content_type or '').lower()
    is_multipart = ('multipart/form-data' in content_type) or bool(request.files)
    if not is_multipart:
        return jsonify({'success': False, 'message': 'Upload must be multipart/form-data'}), 400

    excel_file = request.files.get('file')
    if not excel_file or not excel_file.filename:
        return jsonify({'success': False, 'message': 'Excel file is required'}), 400

    original_name = secure_filename(excel_file.filename)
    if '.' not in original_name:
        return jsonify({'success': False, 'message': 'Invalid file name'}), 400

    ext = original_name.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_EXISTING_LIST_EXTENSIONS:
        return jsonify({'success': False, 'message': 'Only .xlsx or .xls files are allowed'}), 400

    list_title = os.path.splitext(original_name)[0].strip() or 'Untitled List'
    stored_name = f"{uuid.uuid4().hex}_{original_name}"
    subdir = os.path.join(UPLOAD_FOLDER, 'existing_lists')
    os.makedirs(subdir, exist_ok=True)
    full_path = os.path.join(subdir, stored_name)
    excel_file.save(full_path)

    stored_path = f"existing_lists/{stored_name}"

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO existing_lists (title, file_name, stored_path, uploaded_by) VALUES (%s,%s,%s,%s)",
        (list_title, original_name, stored_path, 'admin')
    )
    conn.commit()
    new_id = cur.lastrowid
    cur.close()

    return jsonify({
        'success': True,
        'id': new_id,
        'title': list_title,
        'file_name': original_name,
        'file_url': build_upload_url(stored_path),
    }), 201


@app.route('/api/existing-lists/<int:list_id>', methods=['DELETE'])
def delete_existing_list(list_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT stored_path FROM existing_lists WHERE id=%s", (list_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({'success': False, 'message': 'List not found'}), 404

    cur.execute("DELETE FROM existing_lists WHERE id=%s", (list_id,))
    conn.commit()
    cur.close()

    stored_path = row.get('stored_path')
    if stored_path:
        file_path = os.path.join(UPLOAD_FOLDER, stored_path)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

    return jsonify({'success': True})


@app.route('/api/existing-lists/<int:list_id>/data', methods=['GET'])
def get_existing_list_data(list_id):
    """Read and return the data from an Excel file"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT stored_path, title FROM existing_lists WHERE id=%s", (list_id,))
    row = cur.fetchone()
    cur.close()

    if not row:
        return jsonify({'success': False, 'message': 'List not found'}), 404

    stored_path = row.get('stored_path')
    file_path = os.path.join(UPLOAD_FOLDER, stored_path)

    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': 'File not found on disk'}), 404

    try:
        # Load Excel workbook
        wb = load_workbook(file_path, data_only=True)
        ws = wb.active

        rows = []
        headers = []

        # Extract rows and headers
        for idx, row_cells in enumerate(ws.iter_rows(values_only=True), 1):
            if idx == 1:
                # First row is headers
                headers = [str(cell).strip() if cell else f'Column {i+1}' for i, cell in enumerate(row_cells)]
            else:
                # Data rows
                row_data = {}
                for i, cell in enumerate(row_cells):
                    col_name = headers[i] if i < len(headers) else f'Column {i+1}'
                    row_data[col_name] = cell if cell is not None else ''
                rows.append(row_data)

        wb.close()

        return jsonify({
            'success': True,
            'title': row.get('title'),
            'headers': headers,
            'rows': rows,
            'total': len(rows)
        })

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error reading Excel file: {str(e)}'}), 400


# ═══════════════════════════════════════════════════════
#  EXISTING ALUMNI (ADMIN-ADDED ALUMNI LIST)
# ═══════════════════════════════════════════════════════

@app.route('/api/exist-alumni', methods=['GET'])
def get_exist_alumni():
    """Get all manually-added alumni by admin"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, email, phone, student_id, session, department, created_at
        FROM alumni
        WHERE status='approved' AND is_manually_added=1
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])
    return jsonify(rows)


@app.route('/api/exist-alumni', methods=['POST'])
def add_exist_alumni():
    """Add a single alumni manually (name, student_id, session, email, phone)"""
    data = request.get_json() or {}
    
    required_fields = ['name', 'student_id', 'email', 'session', 'phone']
    for field in required_fields:
        if not data.get(field) or not str(data.get(field, '')).strip():
            return jsonify({'success': False, 'message': f'{field} is required'}), 400

    name = str(data['name']).strip()
    student_id = str(data['student_id']).strip()
    email = str(data['email']).strip()
    session = str(data['session']).strip()
    phone = str(data['phone']).strip()
    department = str(data.get('department', 'ICE')).strip() or 'ICE'

    conn = get_db()
    cur = conn.cursor()
    try:
        # Use a dummy password since admin adds them directly
        dummy_password = generate_password_hash('ADMIN_ADDED_' + str(uuid.uuid4())[:8])
        
        cur.execute(
            """INSERT INTO alumni (name, email, phone, student_id, session, department, 
                                  password, status, user_type, is_manually_added)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (name, email, phone, student_id, session, department, dummy_password, 'approved', 'alumni', 1)
        )
        conn.commit()
        new_id = cur.lastrowid
        cur.close()
        
        return jsonify({
            'success': True,
            'id': new_id,
            'message': f'Alumni "{name}" added successfully'
        }), 201
    
    except Exception as e:
        conn.rollback()
        cur.close()
        if 'Duplicate entry' in str(e) and 'email' in str(e):
            return jsonify({'success': False, 'message': 'Email already exists'}), 409
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/exist-alumni/bulk', methods=['POST'])
def bulk_add_exist_alumni():
    """Bulk add alumni from Excel file data"""
    data = request.get_json() or {}
    alumni_records = data.get('alumni_records') or []
    
    if not alumni_records or not isinstance(alumni_records, list):
        return jsonify({'success': False, 'message': 'alumni_records must be a non-empty list'}), 400
    
    conn = get_db()
    cur = conn.cursor()
    added_count = 0
    errors = []
    
    for idx, record in enumerate(alumni_records):
        try:
            name = str(record.get('name', '')).strip()
            student_id = str(record.get('student_id', '') or record.get('id', '')).strip()
            email = str(record.get('email', '')).strip()
            session = str(record.get('session', '')).strip()
            phone = str(record.get('phone', '')).strip()
            department = str(record.get('department', 'ICE')).strip() or 'ICE'
            
            # Validate required fields
            if not name or not student_id or not email or not session or not phone:
                errors.append({
                    'row': idx + 1,
                    'reason': 'Missing required fields (name, student_id, email, session, phone)'
                })
                continue
            
            dummy_password = generate_password_hash('ADMIN_ADDED_' + str(uuid.uuid4())[:8])
            
            cur.execute(
                """INSERT INTO alumni (name, email, phone, student_id, session, department,
                                      password, status, user_type, is_manually_added)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (name, email, phone, student_id, session, department, dummy_password, 'approved', 'alumni', 1)
            )
            added_count += 1
        
        except Exception as e:
            error_msg = str(e)
            if 'Duplicate entry' in error_msg and 'email' in error_msg:
                error_msg = f'Email "{record.get("email")}" already exists'
            errors.append({
                'row': idx + 1,
                'name': record.get('name', 'Unknown'),
                'reason': error_msg
            })
    
    try:
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        return jsonify({
            'success': False,
            'message': f'Error committing records: {str(e)}',
            'added': added_count,
            'errors': errors
        }), 500
    
    cur.close()
    
    return jsonify({
        'success': True,
        'added': added_count,
        'total_attempted': len(alumni_records),
        'errors': errors if errors else [],
        'message': f'Successfully added {added_count} alumni out of {len(alumni_records)} records'
    }), 201


@app.route('/api/exist-alumni/<int:alumni_id>', methods=['DELETE'])
def delete_exist_alumni(alumni_id):
    """Delete an existing alumni record"""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("DELETE FROM alumni WHERE id=%s", (alumni_id,))
    conn.commit()
    cur.close()
    
    return jsonify({'success': True, 'message': 'Alumni record deleted successfully'})



# ═══════════════════════════════════════════════════════
#  STATS (dashboard summary)
# ═══════════════════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS cnt FROM alumni WHERE status='approved' AND (user_type IS NULL OR user_type='alumni') AND (is_manually_added IS NULL OR is_manually_added=0)")
    total_alumni = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM alumni WHERE status='approved' AND user_type='student' AND (is_manually_added IS NULL OR is_manually_added=0)")
    total_students = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM alumni WHERE status='pending'")
    pending_cnt = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM events")
    events_cnt = cur.fetchone()['cnt']
    cur.execute("SELECT COALESCE(SUM(amount),0) AS total FROM fund_transactions")
    total_funds = float(cur.fetchone()['total'])
    cur.execute("SELECT COUNT(*) AS cnt FROM jobs")
    jobs_cnt = cur.fetchone()['cnt']
    cur.close()
    return jsonify({
        'total_alumni':   total_alumni,
        'total_students': total_students,
        'pending':        pending_cnt,
        'events':         events_cnt,
        'total_funds':    total_funds,
        'total_jobs':     jobs_cnt,
    })


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'success': True, 'message': 'ok'})


@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'success': True,
        'message': 'AlumniConnect backend is running',
        'health': '/api/health',
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=config.DEBUG, port=config.PORT, use_reloader=False)
