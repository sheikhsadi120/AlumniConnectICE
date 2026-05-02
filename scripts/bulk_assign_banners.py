import json
import urllib.request

base = 'http://localhost:5000'
default = base + '/uploads/events/test_event_banner.png'

print('Fetching events from', base + '/api/events')
with urllib.request.urlopen(base + '/api/events') as resp:
    events = json.load(resp)

updated = 0
for e in events:
    if not e.get('banner_image'):
        data = json.dumps({'banner_image': default}).encode('utf-8')
        req = urllib.request.Request(f"{base}/api/events/{e['id']}", data=data, method='PUT', headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req) as r:
                print('Updated', e['id'])
                updated += 1
        except Exception as ex:
            print('Failed to update', e['id'], ex)

print(f'Total updated: {updated}')
print('Sample events:')
print(json.dumps(events[:5], indent=2))
