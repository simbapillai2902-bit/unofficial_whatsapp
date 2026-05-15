# 📦 Frontend Engineer - Complete Package

This package contains everything you need to integrate the backend APIs into your frontend application.

---

## 📄 Files to Review

### 1. **START HERE** 🌟
📋 **API_SUMMARY.md**
- Quick reference for all endpoints
- JSON request/response examples
- Most important APIs highlighted
- cURL examples for testing
- **Best for**: Quick lookups while coding

### 2. **Detailed Documentation**
📚 **API_DOCUMENTATION.md**
- Complete API reference
- All endpoints with full details
- Error codes and status codes
- Sample implementations (JavaScript)
- Fetch API examples
- **Best for**: Understanding all features

### 3. **Integration Guide**
🔗 **FRONTEND_INTEGRATION_GUIDE.md**
- Step-by-step integration instructions
- React & Vue component examples
- Error handling patterns
- Mobile integration notes
- Implementation checklist
- **Best for**: Actually implementing features

### 4. **Postman Ready**
📮 **POSTMAN_COLLECTION.json**
- Pre-built Postman collection
- All 9 endpoints configured
- Copy-paste test data included
- **How to use**:
  1. Open Postman
  2. Click Import
  3. Choose POSTMAN_COLLECTION.json
  4. Start testing immediately

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Review Quick Reference
Open `API_SUMMARY.md` and skim through

### Step 2: Test with Postman
- Import `POSTMAN_COLLECTION.json`
- Click on WhatsApp → Connect
- Click Send
- You'll get a QR code response

### Step 3: Pick Your Framework
- **React?** → See `FRONTEND_INTEGRATION_GUIDE.md` React examples
- **Vue?** → See `FRONTEND_INTEGRATION_GUIDE.md` Vue examples
- **Other?** → Use JavaScript Fetch API examples

### Step 4: Start Coding
Copy the relevant code example and integrate with your app

---

## 📊 API Endpoints Summary

**9 Total Endpoints:**

### Health Checks (2)
```
✓ GET  /health               - Server health
✓ GET  /ready                - Server + DB ready
```

### WhatsApp (3)
```
✓ POST /api/whatsapp/connect  - Get QR code
✓ GET  /api/whatsapp/sessions - List sessions
✓ POST /api/whatsapp/logout   - NEW: Logout session
```

### Campaign (4)
```
✓ POST /api/campaign/add-contacts     - Add phone numbers
✓ POST /api/campaign/start/:id        - Start sending
✓ GET  /api/campaign/:id/status       - Check progress
✓ GET  /api/campaign/job/:id/status   - Check job
```

---

## 💡 Most Important APIs for You

### 1. WhatsApp Connect (Get QR Code)
```bash
POST /api/whatsapp/connect
Body: { "sessionName": "mysession" }
Returns: QR code as base64 data image
```
**Why**: User needs to scan to connect WhatsApp

### 2. WhatsApp Logout (NEW ⭐)
```bash
POST /api/whatsapp/logout
Body: { "sessionName": "mysession" }
Returns: Success/error message
```
**Why**: User can now properly disconnect from WhatsApp

### 3. Add Campaign Contacts
```bash
POST /api/campaign/add-contacts
Body: { campaign_id, user_id, contacts[] }
Returns: Number of contacts added
```
**Why**: Upload phone numbers to send to

### 4. Start Campaign
```bash
POST /api/campaign/start/:id
Body: { messageTemplate }
Returns: Campaign ID and contact count
```
**Why**: Begin sending messages

### 5. Check Campaign Status
```bash
GET /api/campaign/:id/status
Returns: Progress percentage, sent count, etc.
```
**Why**: Show user the sending progress

---

## 🔧 Setup Instructions

### 1. Backend Must Be Running
```bash
cd /path/to/project
npm install
npm run dev
```
Check: http://localhost:5000/health should return healthy status

### 2. Update Base URL in Frontend
```javascript
const API_BASE = 'http://localhost:5000';

// In production, use environment variable
const API_BASE = process.env.REACT_APP_API_URL;
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Test First Endpoint
```bash
curl http://localhost:5000/api/whatsapp/sessions
```
Should return: `{"success": true, "data": [], ...}`

---

## 📱 Code Example - Logout Feature

**JavaScript (Vanilla)**:
```javascript
async function logoutWhatsApp(sessionName) {
  try {
    const response = await fetch(
      'http://localhost:5000/api/whatsapp/logout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Logged out:', data.message);
      // Refresh UI, redirect, etc.
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// Usage:
logoutWhatsApp('mysession');
```

**React Hook**:
```javascript
import { useState } from 'react';

export function useWhatsAppLogout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const logout = async (sessionName) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'http://localhost:5000/api/whatsapp/logout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionName })
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
      }

      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { logout, loading, error };
}

// Usage in component:
const { logout, loading } = useWhatsAppLogout();
<button onClick={() => logout('mysession')} disabled={loading}>
  Logout
</button>
```

---

## 🧪 Testing Before Coding

### Option 1: Postman (Recommended)
1. Import `POSTMAN_COLLECTION.json`
2. Click on endpoint
3. Click "Send"
4. See response

### Option 2: cURL
```bash
curl -X POST http://localhost:5000/api/whatsapp/logout \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"test"}'
```

### Option 3: JavaScript Console
```javascript
fetch('http://localhost:5000/api/whatsapp/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionName: 'test' })
})
.then(r => r.json())
.then(console.log);
```

---

## ✅ Validation Rules to Remember

| Field | Must Be |
|-------|---------|
| sessionName | 3-50 alphanumeric chars |
| campaign_id | Integer (no quotes) |
| user_id | Integer (no quotes) |
| contacts | Array of strings (phone numbers) |
| messageTemplate | Non-empty string |

**Bad**:
```json
{ "sessionName": "my-session" }     // Has hyphen
{ "campaign_id": "123" }             // String, not int
{ "contacts": "9876543210" }         // String, not array
```

**Good**:
```json
{ "sessionName": "mysession" }       // Alphanumeric
{ "campaign_id": 123 }               // Integer
{ "contacts": ["9876543210"] }       // Array
```

---

## 🔒 Security Notes

1. **Never log sensitive data** - Don't log full request bodies with tokens
2. **HTTPS in production** - Replace `http://` with `https://`
3. **Add authentication** - Include auth tokens in headers if needed
4. **Validate input** - Validate data before sending to API
5. **Error messages** - Show generic messages to users, log details

---

## 🐛 Debugging Tips

**API returning error?**
1. Check response code (200, 400, 404, 500, 503)
2. Check error `code` field
3. Check `requestId` and share with backend team
4. Verify request body format matches documentation

**Network timeout?**
1. Is backend running? `curl http://localhost:5000/health`
2. Correct URL? Check base URL
3. Firewall blocking? Try from same machine first

**QR code not displaying?**
1. Is `qr` field in response? Check API response
2. Is it valid base64? Try opening in browser
3. Is IMG src correct? Should be `data:image/png;base64,...`

---

## 📚 Reading Order

1. **First**: This file (you are here) - Get overview
2. **Second**: API_SUMMARY.md - See all endpoints
3. **Third**: Test in Postman - Make sure backend works
4. **Fourth**: FRONTEND_INTEGRATION_GUIDE.md - Integrate code
5. **Fifth**: API_DOCUMENTATION.md - Reference as needed

---

## 💬 Questions?

| Question | Answer Location |
|----------|-----------------|
| "What's the logout endpoint?" | API_SUMMARY.md line 42 |
| "How do I add contacts?" | FRONTEND_INTEGRATION_GUIDE.md - Add Campaign Contacts section |
| "What's the QR code format?" | API_DOCUMENTATION.md - WhatsApp Connect Response |
| "How do I handle errors?" | FRONTEND_INTEGRATION_GUIDE.md - Error Handling section |
| "Can I use this on mobile?" | FRONTEND_INTEGRATION_GUIDE.md - Mobile Integration section |

---

## 🎯 Your Tasks

- [ ] Read API_SUMMARY.md (15 min)
- [ ] Import POSTMAN_COLLECTION.json and test one endpoint (10 min)
- [ ] Read FRONTEND_INTEGRATION_GUIDE.md (20 min)
- [ ] Copy a code example and try it (15 min)
- [ ] Implement WhatsApp Connect feature
- [ ] Implement WhatsApp Logout feature (NEW!)
- [ ] Implement Campaign features
- [ ] Add error handling
- [ ] Test on your application

---

## 🎉 You're Ready!

Everything you need is in these 4 files:
1. **API_SUMMARY.md** - Quick reference
2. **API_DOCUMENTATION.md** - Full documentation
3. **FRONTEND_INTEGRATION_GUIDE.md** - Integration help
4. **POSTMAN_COLLECTION.json** - Testing tool

**Start with API_SUMMARY.md now!** →

---

**Backend Server**: http://localhost:5000  
**Last Updated**: 2026-05-15  
**Status**: Ready for integration ✅
