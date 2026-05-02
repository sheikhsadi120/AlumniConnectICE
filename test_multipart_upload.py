import urllib.request
import urllib.error
import json
from pathlib import Path

def post_multipart_event():
    """Test multipart event creation with banner image"""
    url = 'http://localhost:5000/api/events'
    
    # Prepare multipart data
    boundary = '----WebKitFormBoundary7330' 
    
    body_parts = []
    
    # Add text fields
    fields = {
        'title': 'Test Multipart Banner Event',
        'description': 'Testing multipart event creation with banner image',
        'date': '2025-05-20',
        'time': '15:30',
        'location': 'Main Hall',
        'fee': '50',
        'payment_account': '',
        'audience': 'all'
    }
    
    for key, value in fields.items():
        body_parts.append(f'--{boundary}'.encode())
        body_parts.append(f'Content-Disposition: form-data; name="{key}"'.encode())
        body_parts.append(b'')
        body_parts.append(value.encode())
    
    # Add file
    banner_path = Path('react-app/public/assets/ice-logo-watermark.png')
    if banner_path.exists():
        body_parts.append(f'--{boundary}'.encode())
        body_parts.append(b'Content-Disposition: form-data; name="banner_image"; filename="ice-logo-watermark.png"')
        body_parts.append(b'Content-Type: image/png')
        body_parts.append(b'')
        with open(banner_path, 'rb') as f:
            body_parts.append(f.read())
    
    body_parts.append(f'--{boundary}--'.encode())
    body_parts.append(b'')
    
    body = b'\r\n'.join(body_parts)
    
    # Create request
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            print('Status:', response.status)
            print('Response:', result)
            response_json = json.loads(result)
            if response_json.get('event'):
                print('\n✓ Event created successfully!')
                print('  ID:', response_json['event'].get('id'))
                print('  Title:', response_json['event'].get('title'))
                print('  Banner URL:', response_json['event'].get('banner_image_url'))
    except urllib.error.HTTPError as e:
        print('Error:', e.code)
        print('Response:', e.read().decode('utf-8'))
    except Exception as e:
        print('Exception:', e)

if __name__ == '__main__':
    post_multipart_event()
