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
import pymysql
import pymysql.cursors
import config
import os
import uuid

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB limit
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS}}, supports_credentials=True)


def build_upload_url(filename):
    if not filename:
        return None
    base_url = config.PUBLIC_BASE_URL or request.host_url.rstrip('/')
    return f"{base_url}/uploads/{filename}"

# ─── Global JSON error handlers ───────────────────────
@app.errorhandler(Exception)
def handle_exception(e):
    """Return JSON for all unhandled exceptions instead of HTML."""
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
    cur.execute("SELECT id,name,email,phone,department,student_id,session,graduation_year,company,designation,photo,bio,research_interests,extracurricular,linkedin,github,twitter,website,status,created_at FROM alumni WHERE status='approved' AND (user_type IS NULL OR user_type='alumni') ORDER BY name")
    rows = cur.fetchall()
    cur.close()
    for r in rows:
        r['photo_url'] = build_upload_url(r.get('photo'))
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
    data = request.get_json()
    fields = ['name','phone','company','designation','session','bio','research_interests','extracurricular','linkedin','github','twitter','website']
    sets   = ', '.join(f"{f}=%s" for f in fields if f in data)
    vals   = [data[f] for f in fields if f in data]
    if not sets:
        return jsonify({'success': False, 'message': 'No fields to update'}), 400
    vals.append(aid)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE alumni SET {sets} WHERE id=%s", vals)
    conn.commit()
    cur.close()
    return jsonify({'success': True})


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
    cur.execute("UPDATE alumni SET status='approved' WHERE id=%s", (aid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


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
    cur.execute("UPDATE alumni SET user_type='alumni', upgrade_request='approved' WHERE id=%s", (aid,))
    conn.commit()
    cur.close()
    return jsonify({'success': True})


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
    cur.close()
    return jsonify({'success': True, 'id': new_id}), 201


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
#  STATS (dashboard summary)
# ═══════════════════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS cnt FROM alumni WHERE status='approved' AND (user_type IS NULL OR user_type='alumni')")
    total_alumni = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM alumni WHERE status='approved' AND user_type='student'")
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=config.DEBUG, port=config.PORT, use_reloader=False)
