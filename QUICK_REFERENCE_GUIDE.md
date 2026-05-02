# Event Banner Upload - Quick Reference Guide

## 🚀 Quick Start

### Admin Creates Event with Banner
1. Open Admin Dashboard
2. Navigate to Events section
3. Click "Add New Event"
4. Fill in event details (Title, Date, Time, etc.)
5. **Click "Choose Banner Image"** and select PNG/JPG file
6. Click **"Add Event"**
7. Event appears in list with banner image visible

---

## 📋 API Reference

### Create Event with Banner (Multipart)
```http
POST /api/events
Content-Type: multipart/form-data

Fields (Form Data):
  title              : string (required)
  date               : YYYY-MM-DD (required)
  time               : HH:mm (optional)
  location           : string (optional)
  description        : string (optional)
  fee                : number (optional)
  payment_account    : string (optional)
  audience           : "all" | "alumni" | "students" (optional)
  banner_image       : File (optional) - PNG, JPG, GIF

Response (201 Created):
{
  "success": true,
  "id": 19,
  "event": {
    "id": 19,
    "title": "Event Title",
    "date": "2025-05-20",
    "time": "15:30",
    "banner_image_url": "http://localhost:5000/uploads/[uuid]_filename.png",
    ...otherFields
  }
}
```

### Create Event JSON (Backward Compatible)
```http
POST /api/events
Content-Type: application/json

{
  "title": "Event Title",
  "date": "2025-05-20",
  "time": "15:30",
  "location": "Venue",
  "description": "Description",
  "fee": 100,
  "audience": "all"
}

Response (201 Created):
{
  "success": true,
  "event": {
    "id": 20,
    "title": "Event Title",
    "banner_image_url": null,
    ...otherFields
  }
}
```

### Get All Events
```http
GET /api/events

Response:
[
  {
    "id": 19,
    "title": "Event with Banner",
    "banner_image_url": "http://localhost:5000/uploads/[uuid]_filename.png",
    ...
  },
  {
    "id": 20,
    "title": "Event without Banner",
    "banner_image_url": null,
    ...
  }
]
```

---

## 💻 Code Examples

### Python - Create Event with Banner
```python
import urllib.request
import urllib.error

url = 'http://localhost:5000/api/events'

# Prepare multipart data
boundary = '----FormBoundary7330'
body_parts = []

# Add text fields
body_parts.append(b'--' + boundary.encode())
body_parts.append(b'Content-Disposition: form-data; name="title"')
body_parts.append(b'')
body_parts.append(b'Networking Event')

# Add file
body_parts.append(b'--' + boundary.encode())
body_parts.append(b'Content-Disposition: form-data; name="banner_image"; filename="banner.png"')
body_parts.append(b'Content-Type: image/png')
body_parts.append(b'')
with open('banner.png', 'rb') as f:
    body_parts.append(f.read())

body_parts.append(b'--' + boundary.encode() + b'--')
body_parts.append(b'')

body = b'\r\n'.join(body_parts)

# Send request
req = urllib.request.Request(url, data=body)
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

with urllib.request.urlopen(req) as response:
    result = response.read().decode('utf-8')
    print(f"Event created: {result}")
```

### JavaScript - Create Event with Banner
```javascript
// Build FormData
const formData = new FormData();
formData.append('title', 'Networking Event');
formData.append('date', '2025-05-20');
formData.append('time', '15:30');
formData.append('location', 'Main Hall');
formData.append('description', 'Annual networking event');
formData.append('fee', '100');
formData.append('audience', 'all');

// Add banner file from input
const fileInput = document.querySelector('input[type="file"]');
if (fileInput.files.length > 0) {
  formData.append('banner_image', fileInput.files[0]);
}

// Send request
fetch('/api/events', {
  method: 'POST',
  body: formData  // Don't JSON.stringify FormData!
})
.then(res => res.json())
.then(data => {
  console.log('Event created:', data.event.id);
  console.log('Banner URL:', data.event.banner_image_url);
})
.catch(err => console.error('Error:', err));
```

### JavaScript - Detect and Display Banner
```javascript
function displayEvent(event) {
  // Prefer backend URL over filename
  const bannerUrl = event.banner_image_url 
    || (event.banner_image ? buildImageUrl(event.banner_image) : null);
  
  return `
    <div class="event-card">
      ${bannerUrl ? `<img src="${bannerUrl}" alt="Event banner" />` : '<div class="no-banner">No Banner</div>'}
      <h3>${event.title}</h3>
      <p>${event.date} ${event.time}</p>
    </div>
  `;
}

// Helper function (fallback)
function buildImageUrl(filename) {
  return `http://localhost:5000/uploads/${filename}`;
}
```

---

## 📁 File Locations

### Backend Code
- `backend/app.py` - Event creation endpoint (lines 2260-2380)
- `backend/cloudinary_utils.py` - Image upload helpers
- `backend/uploads/` - Local image storage directory

### Frontend Code
- `react-app/src/services/api.js` - API client with FormData detection
- `react-app/src/pages/AdminDashboard.jsx` - Event form (handleAddEvent)
- `react-app/src/pages/AlumniDashboard.jsx` - Event display (banner rendering)
- `react-app/src/pages/StudentDashboard.jsx` - Event display (banner rendering)

### Documentation
- `MULTIPART_UPLOAD_FIX_VALIDATION.md` - Complete validation report
- `TECHNICAL_FLOW_DOCUMENTATION.md` - Detailed technical flow
- `QUICK_REFERENCE_GUIDE.md` - This file

---

## 🔍 Troubleshooting

### Issue: Banner image not showing in admin form preview
**Solution:** 
- Check browser console for image load errors
- Verify file size < 5MB
- Confirm image format is PNG, JPG, or GIF

### Issue: Event created but banner URL is null
**Solution:**
- Check if banner_image field was included in FormData
- Verify file exists at `/uploads/` directory on server
- Check Flask debug logs for upload errors

### Issue: FormData not being sent as multipart
**Solution:**
- Ensure NOT calling JSON.stringify() on FormData
- Verify Content-Type header is multipart/form-data
- Check api.js addEvent() function detects FormData correctly

### Issue: Old events showing broken banners
**Solution:**
- Events still use getUploadUrl(banner_image) fallback
- If filename missing from database, image won't show
- Recommend re-uploading events with new multipart method

---

## ✅ Best Practices

1. **Always check banner_image_url first**
   ```javascript
   const url = event.banner_image_url || null;  // Best
   const url = getUploadUrl(event.banner_image);  // Fallback
   ```

2. **Validate file before upload**
   ```javascript
   const MAX_SIZE = 5 * 1024 * 1024;  // 5MB
   if (file.size > MAX_SIZE) alert('File too large');
   ```

3. **Use FormData for all file uploads**
   ```javascript
   // Don't do this:
   // fetch('/api/events', { body: JSON.stringify({...form, file}) })
   
   // Do this:
   const formData = new FormData();
   formData.append('field', value);
   formData.append('file', fileInput.files[0]);
   fetch('/api/events', { method: 'POST', body: formData });
   ```

4. **Provide fallback UI for missing banners**
   ```jsx
   {bannerUrl ? (
     <img src={bannerUrl} />
   ) : (
     <div className="placeholder">Event Pending Banner</div>
   )}
   ```

---

## 📊 Database Fields

### Events Table Banner Columns
| Column | Type | Purpose |
|--------|------|---------|
| `banner_image` | VARCHAR(255) | Full URL of uploaded image |
| `banner_image_url` | VARCHAR(255) | Full URL of uploaded image (for API) |

**Sample Value:**
```
http://localhost:5000/uploads/aa10c97d948e432b83ded0cdea1687a3_ice-logo-watermark.png
```

---

## 🧪 Testing Commands

### Test Multipart Upload
```bash
cd d:\project\sshowed\AC
python test_multipart_upload.py
```

### Check Recent Events
```bash
cd d:\project\sshowed\AC
python check_events.py
```

### Manual curl Test (if available)
```bash
curl -X POST http://localhost:5000/api/events \
  -F "title=Test Event" \
  -F "date=2025-05-20" \
  -F "time=15:30" \
  -F "location=Hall A" \
  -F "fee=100" \
  -F "audience=all" \
  -F "banner_image=@path/to/image.png"
```

---

## 🎯 Success Indicators

✅ Event creation form shows file input
✅ Selected image previews before submission
✅ Event created without errors (201 status)
✅ Response includes banner_image_url field
✅ Event displays in list with banner image
✅ Banner visible in Admin/Alumni/Student dashboards
✅ No console errors or broken image icons

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review Flask debug logs: `backend/error.txt`
3. Verify database values: `SELECT * FROM events WHERE id=19`
4. Check file system: `/backend/uploads/` directory
5. Review technical flow documentation
