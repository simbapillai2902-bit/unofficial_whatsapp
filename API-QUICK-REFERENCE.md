# API Quick Reference Card

**Base URL**: `http://localhost:5000`

---

## 🟢 Health Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Check API health |
| GET | `/ready` | Check dependencies |

---

## 🔵 WhatsApp Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/whatsapp/connect` | Create WhatsApp session & get QR | ❌ |
| GET | `/api/whatsapp/sessions` | List all sessions | ❌ |

### POST `/api/whatsapp/connect`
```json
Request: { "sessionName": "session1" }
Response: { "sessionName": "...", "qr": "base64...", "connected": false }
```

### GET `/api/whatsapp/sessions`
```json
Response: { "data": [...], "totalSessions": 2, "activeSessions": 1 }
```

---

## 🟣 Campaign Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/campaign/add-contacts` | Add phone numbers | ❌ |
| POST | `/api/campaign/campaign/start/:id` | Start campaign | ❌ |
| GET | `/api/campaign/campaign/:id/status` | Get campaign status | ❌ |
| GET | `/api/campaign/job/:jobId/status` | Get job status | ❌ |

### POST `/api/campaign/add-contacts`
```json
Request: {
  "campaign_id": 1,
  "user_id": 100,
  "contacts": ["919876543210", "911234567890"]
}
Response: {
  "success": true,
  "message": "2 contacts added successfully",
  "insertedCount": 2
}
```

**Constraints**: 
- Contacts: 1-1000 per request
- Phone format: 10-15 digits

### POST `/api/campaign/campaign/start/:campaignId`
```json
Request: {
  "messageTemplate": "Hello! Welcome to our campaign"
}
Response: {
  "success": true,
  "message": "Campaign started",
  "campaignId": 1,
  "contactCount": 150,
  "statusCheckUrl": "/api/campaign/1/status"
}
```

**Constraints**: 
- Message: 1-4096 characters
- Can include variables: `{{name}}`, `{{code}}`

### GET `/api/campaign/campaign/:campaignId/status`
```json
Response: {
  "success": true,
  "data": {
    "campaignId": 1,
    "pending": 50,
    "sent": 100,
    "failed": 2,
    "total": 152,
    "failedReasons": [...]
  },
  "completionPercentage": 65.78
}
```

---

## 📝 Request Body Examples

### Add Contacts
```json
{
  "campaign_id": 1,
  "user_id": 100,
  "contacts": [
    "919876543210",
    "911234567890",
    "919988776655"
  ]
}
```

### Start Campaign
```json
{
  "messageTemplate": "Hi {{name}}, check out our offer!"
}
```

### Connect WhatsApp
```json
{
  "sessionName": "session1"
}
```

---

## 🔄 Typical Workflow

```
1. POST /api/whatsapp/connect       ← Get QR code
                ↓
   Scan QR code with WhatsApp
                ↓
2. GET /api/whatsapp/sessions       ← Verify connected
                ↓
3. POST /api/campaign/add-contacts  ← Add phone numbers
                ↓
4. POST /api/campaign/campaign/start/1  ← Start campaign
                ↓
5. GET /api/campaign/campaign/1/status  ← Monitor progress
                ↓
   Repeat step 5 every 5 seconds
```

---

## ⚠️ Status Codes

| Code | Meaning |
|------|---------|
| 200 | ✓ Success |
| 202 | ✓ Accepted (async) |
| 400 | ✗ Validation error |
| 404 | ✗ Not found |
| 409 | ✗ Duplicate |
| 429 | ✗ Rate limited |
| 500 | ✗ Server error |

---

## 📊 Phone Number Format

Valid formats:
- `919876543210` (India - 12 digits)
- `441234567890` (UK - 12 digits)
- `14155552671` (US - 11 digits)
- `33123456789` (France - 11 digits)

---

## 🎯 Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE_001",
  "details": [
    {
      "field": "body.contacts",
      "message": "Error details"
    }
  ]
}
```

---

## 🔗 Testing Tools

- **Postman**: Import `postman-collection.json`
- **REST Client**: Use `test-api.http` file
- **curl**: Use terminal with `-X POST` etc.
- **Browser**: Only for GET requests

---

## 💾 File References

- **Full Setup Guide**: `SETUP-AND-API-GUIDE.md`
- **Frontend Integration**: `FRONTEND-API-GUIDE.md`
- **Test Collection**: `postman-collection.json`
- **Test File**: `test-api.http`

---

## ⏱️ Rate Limits

- Global: 100 requests / 15 minutes
- Per user: 50 requests / 15 minutes
- Campaign: 50 requests / minute
- Health: No limit

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Test health endpoint
curl http://localhost:5000/health
```

---

**Last Updated**: May 14, 2026 | **Version**: 1.0.0
