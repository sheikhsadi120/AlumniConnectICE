import urllib.request
import json

# Get all events from API
url = 'http://localhost:5000/api/events'
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode('utf-8'))
        events = data if isinstance(data, list) else data.get('events', [])
        
        print('Recent Events from API:')
        print('=' * 120)
        for ev in sorted(events, key=lambda x: x.get('id', 0))[-5:]:
            print('\nID: {}'.format(ev.get('id')))
            print('  Title: {}'.format(ev.get('title')))
            print('  Date: {}, Time: {}'.format(ev.get('date'), ev.get('time')))
            print('  Banner URL: {}'.format(ev.get('banner_image_url')))
            print('  Banner (raw): {}'.format(ev.get('banner_image')))
except Exception as e:
    print('Error: {}'.format(e))
