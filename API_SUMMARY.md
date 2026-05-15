# API Endpoints Summary - Share with Frontend Engineer

**Base URL**: `http://localhost:5000`

---

## 🔗 All Available Endpoints

### Health & Status (No Auth Required)
```
GET   /health                      - Server health status
GET   /api/health                  - Server health status (alt)
GET   /ready                       - Readiness check with DB test
GET   /api/health                  - Health status (alt)
```

### WhatsApp Messaging
```
POST  /api/whatsapp/connect        - Connect & get QR code
GET   /api/whatsapp/sessions       - List all sessions
POST  /api/whatsapp/logout         - Close session (NEW ⭐)
```

### Campaign Management
```
POST  /api/campaign/add-contacts   - Add contacts to campaign
POST  /api/campaign/start/:id      - Start campaign messaging
GET   /api/campaign/:id/status     - Check campaign progress
GET   /api/campaign/job/:id/status - Check job progress
```

---

## 📋 Quick API Reference

### 1️⃣ CONNECT WHATSAPP
```
POST /api/whatsapp/connect

Request:
{
  "sessionName": "session1"
}

Success Response:
{
  "success": true,
  "sessionName": "session1",
  "qr": "data:image/png;base64,...",
  "connected": false,
  "message": "Scan the QR code"
}
```

### 2️⃣ GET SESSIONS
```
GET /api/whatsapp/sessions

Success Response:
{
  "success": true,
  "data": [
    {
      "name": "session1",
      "connected": true,
      "createdAt": 1715767266825,
      "lastActivity": 1715767466825,
      "qr": false
    }
  ],
  "totalSessions": 1,
  "activeSessions": 1
}
```

### 3️⃣ LOGOUT WHATSAPP (NEW ⭐)
```
POST /api/whatsapp/logout

Request:
{
  "sessionName": "session1"
}

Success Response (200 OK):
{
  "success": true,
  "message": "Session logged out successfully",
  "sessionName": "session1"
}

Error Response (404 Not Found):
{
  "success": false,
  "message": "Session not found",
  "sessionName": "session1",
  "code": "SESSION_002"
}
```

### 4️⃣ ADD CAMPAIGN CONTACTS
```
POST /api/campaign/add-contacts

Request:
{
  "campaign_id": "camp_001",
  "user_id": 456,
  "contacts": [
    "9876543210",
    "9876543211",
    "9876543212"
  ]
}

Success Response (200 OK):
{
  "success": true,
  "message": "3 contacts added successfully",
  campaign_id": "camp_001",
  "insertedCount": 3
}
```

### 5️⃣ START CAMPAIGN
```
POST /api/campaign/start/camp_001

Request:
{
  "messageTemplate": "Hello {{name}}, your order is confirmed!"
}

Success Response (202 Accepted):
{
  "success": true,
  "message": "Campaign started",
  "campaignId": "camp_001",
  "contactCount": 100,
  "statusCheckUrl": "/api/campaign/camp_001/status"
}
```

### 6️⃣ GET CAMPAIGN STATUS
```
GET /api/campaign/camp_001/status

Success Response (200 OK):
{
  "success": true,
  "data": {
    "campaignId": "camp_001",
    "status": "running",
    "totalContacts": 100,
    "sentCount": 45,
    "failedCount": 2,
    "pendingCount": 53,
    "progressPercentage": 45,
    "startedAt": "2026-05-15T10:30:00.000Z",
    "estimatedCompletion": "2026-05-15T12:15:00.000Z"
  }
}
```

### 7️⃣ GET JOB STATUS
```
GET /api/campaign/job/JOB_123456/status

Success Response (200 OK):
{
  "success": true,
  "data": {
    "jobId": "JOB_123456",
    "campaignId": "camp_001",
    "status": "processing",
    "progress": {
      "total": 100,
      "completed": 67,
      "failed": 3,
      "pending": 30
    },
    "progressPercentage": 67,
    "startedAt": "2026-05-15T10:30:00.000Z",
    "estimatedCompletion": "2026-05-15T12:00:00.000Z"
  }
}
```

### 8️⃣ HEALTH CHECK
```
GET /health
or
GET /api/health

Success Response (200 OK):
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-15T12:01:06.825+05:30",
  "uptime": 3456.789,
  "memory": { ... }
}
```

### 9️⃣ READINESS CHECK
```
GET /ready

Success Response (200 OK):
{
  "success": true,
  "status": "ready",
  "dependencies": {
    "database": "connected"
  },
  "timestamp": "2026-05-15T12:01:06.825+05:30"
}
```

---

## ✅ Request Rules

| Endpoint | Validation |
|----------|-----------|
| `sessionName` | Alphanumeric, 3-50 chars |
| `campaign_id` | Integer |
| `user_id` | Integer |
| `contacts` | Array of phone numbers (10-15 digits) |
| `messageTemplate` | String, 1-4096 chars |
| `campaignId` | Integer or string |
| `jobId` | String |

---

## 🔴 Error Response Format

All errors return:
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "requestId": "unique-request-id",
  "details": []
}
```

Common HTTP Status Codes:
- **200** - Success
- **202** - Accepted (async processing)
- **400** - Bad request / validation error
- **404** - Not found
- **409** - Conflict (duplicate)
- **500** - Server error
- **503** - Service unavailable

---

## 📱 Usage Examples

### JavaScript Fetch
```javascript
// WhatsApp Logout
const response = await fetch('http://localhost:5000/api/whatsapp/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionName: 'session1' })
});
const data = await response.json();
console.log(data);
```

### cURL
```bash
# WhatsApp Logout
curl -X POST http://localhost:5000/api/whatsapp/logout \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"session1"}'

# Get Sessions
curl http://localhost:5000/api/whatsapp/sessions

# Add Contacts
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "camp_001",
    "user_id": 456,
    "contacts": ["9876543210", "9876543211"]
  }'

# Start Campaign
curl -X POST http://localhost:5000/api/campaign/start/123 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate":"Hello!"}'

# Check Status
curl http://localhost:5000/api/campaign/CAMP123456/status
```

---

## 💡 Important Notes

1. **Use Content-Type**: Always send `Content-Type: application/json`
2. **Check success field**: Always check `data.success` before using response
3. **Error codes**: Use error `code` field for debugging
4. **Request IDs**: Save `requestId` from errors for support
5. **QR Code**: Render base64 image as `<img src="data:..." />`
6. **Polling**: Use 5-10 second intervals for status checks
7. **Max batch**: 1000 contacts max per add-contacts request

---

## 🆕 NEW - WhatsApp Logout

**What**: Properly close WhatsApp connection and cleanup
**When**: User logs out or switches account
**How**: POST to `/api/whatsapp/logout` with sessionName
**Status**: Session files deleted, socket closed, memory cleaned

---

**For Full Documentation**: See `API_DOCUMENTATION.md`
