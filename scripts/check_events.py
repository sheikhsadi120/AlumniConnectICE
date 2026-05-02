import json, urllib.request

ev = json.load(urllib.request.urlopen('http://localhost:5000/api/events'))
for e in ev:
    print(e.get('id'), '|', e.get('title'), '|', e.get('banner_image'))
