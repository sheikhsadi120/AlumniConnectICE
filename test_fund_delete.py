import requests

URL = 'http://localhost:5000/api/fund-requests/1'
ORIGIN = 'http://localhost:5175'

print('=== OPTIONS preflight ===')
try:
    r = requests.options(URL, headers={'Origin': ORIGIN})
    print(r.status_code)
    print(r.text)
    print(dict(r.headers))
except Exception as e:
    print('OPTIONS error:', e)

print('\n=== DELETE request ===')
try:
    r = requests.delete(URL, headers={'Origin': ORIGIN})
    print(r.status_code)
    print(r.text)
    print(dict(r.headers))
except Exception as e:
    print('DELETE error:', e)
