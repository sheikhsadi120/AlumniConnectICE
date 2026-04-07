# Excel File Preview Feature - Testing Guide

## Overview
When you upload an Excel file in the Admin Dashboard's "Existing List Repository", you can now view the actual data (names, emails, etc.) from inside the Excel file directly in the admin panel.

## How to Use

### 1. Upload an Excel File
- Navigate to Admin Dashboard → **Existing List Repository**
- Click **"Upload Excel List"**
- Select your .xlsx or .xls file
- Click **"Upload List"**

### 2. View Excel Data
Once the file is uploaded:
- Click the **"View Data"** button (new button in the table)
- A modal will open showing:
  - Title of the list
  - Total number of records
  - Full table with all columns from your Excel file

### 3. Features
✅ Display all column names from Excel header row  
✅ Show all data rows from the Excel file  
✅ Scrollable table for large files  
✅ Display up to 50 characters per cell (truncated for readability)  
✅ "—" symbol for empty cells  
✅ Loading state while fetching data  

## Sample Excel File Format

Your Excel file should have:
- **Row 1 (Headers)**: Column names (Name, Email, Phone, etc.)
- **Rows 2+**: Your data

Example:
```
| Name             | Email                  | Phone       |
|------------------|------------------------|-------------|
| Md. Amin Khan    | amin@example.com       | 01712345678 |
| Fatima Akter     | fatima@example.com     | 01987654321 |
```

## API Endpoints

### GET /api/existing-lists
Returns all uploaded Excel files with metadata.

### GET /api/existing-lists/<id>/data
Returns the data from a specific Excel file:
```json
{
  "success": true,
  "title": "Students List",
  "headers": ["Name", "Email", "Phone"],
  "rows": [
    {"Name": "Md. Amin Khan", "Email": "amin@example.com", "Phone": "01712345678"},
    {"Name": "Fatima Akter", "Email": "fatima@example.com", "Phone": "01987654321"}
  ],
  "total": 2
}
```

## Backend Implementation
- Endpoint: `GET /api/existing-lists/<id>/data`
- Library: `openpyxl` for reading Excel files
- Reads first row as headers
- Extracts all subsequent rows as data

## Frontend Components
- Button: "View Data" in existing list table actions
- Modal: Shows Excel data in a scrollable table
- State: Handles loading, errors, and data display

## Technical Stack
- **Backend**: Flask, openpyxl
- **Frontend**: React, Bootstrap Modal
- **Database**: Stores file metadata only (actual data fetched on demand)

## Notes
- Files are stored in `backend/uploads/existing_lists/`
- Large Excel files may take a moment to load
- Empty cells display as "—"
- Cell values are truncated to 50 characters in the preview
