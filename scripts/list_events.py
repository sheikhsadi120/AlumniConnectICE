import requests
r = requests.get('http://127.0.0.1:5000/api/events')
print('Status', r.status_code)
try:
    import json
    print(json.dumps(r.json(), indent=2))
except Exception:
    print(r.text)
