import requests
import os

BACKEND = os.environ.get('BACKEND_URL', 'http://127.0.0.1:5000')
EVENT_ID = os.environ.get('TEST_EVENT_ID', '6')
FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'uploads', 'events', 'test_event_banner.png')

url = f"{BACKEND}/api/events/{EVENT_ID}/upload-image"
print('Posting to', url)
print('Using file', FILE_PATH)

if not os.path.isfile(FILE_PATH):
    print('File not found:', FILE_PATH)
    raise SystemExit(1)

with open(FILE_PATH, 'rb') as fh:
    files = {'file': (os.path.basename(FILE_PATH), fh, 'image/png')}
    try:
        r = requests.post(url, files=files, timeout=10)
    except Exception as ex:
        print('Request failed:', ex)
        raise

print('Status:', r.status_code)
try:
    print('JSON:', r.json())
except Exception:
    print('Response text:', r.text)
