import requests
import json

# Try OPTIONS preflight
print("=== Testing OPTIONS preflight ===")
try:
    resp = requests.options(
        'http://localhost:5000/api/fund-requests/1',
        headers={'Origin': 'http://localhost:5175'}
    )
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
    print(f"Headers: {dict(resp.headers)}")
except Exception as e:
    print(f"Error: {e}")

# Try PUT request
print("\n=== Testing PUT request ===")
try:
    payload = {
        'title': 'test',
        'purpose': 'test purpose',
        'target_amount': 1000,
        'payment_option': 'both',
        'status': 'open'
    }
    resp = requests.put(
        'http://localhost:5000/api/fund-requests/1',
        json=payload,
        headers={'Origin': 'http://localhost:5175'}
    )
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
    print(f"Headers: {dict(resp.headers)}")
except Exception as e:
    print(f"Error: {e}")
