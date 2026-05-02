@echo off
cd d:\project\sshowed\AC
"C:\Program Files\Git\bin\curl.exe" -X POST http://localhost:5000/api/events ^
  -F "title=Test Multipart Banner Upload" ^
  -F "description=Testing form data event creation with banner" ^
  -F "date=2025-05-20" ^
  -F "time=15:30" ^
  -F "location=Main Hall" ^
  -F "fee=50" ^
  -F "payment_account=" ^
  -F "audience=all" ^
  -F "banner_image=@react-app/public/assets/ice-logo-watermark.png"
