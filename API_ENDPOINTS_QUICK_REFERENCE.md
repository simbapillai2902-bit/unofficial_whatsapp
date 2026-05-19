# WhatsApp Bulk Messaging - API Endpoints Quick Reference

## Base URL
```
http://localhost:3000/api
```

---

## 🔄 WhatsApp Session Management

### 1. Connect/Initiate WhatsApp
```
POST /whatsapp/connect
Content-Type: application/json

{
  "sessionName": "session1"
}
```

**Response**: QR code (base64 image) + connection status

---

### 2. Get All Sessions
```
GET /whatsapp/sessions
```

**Response**: List of all sessions with connection status

---

### 3. Logout WhatsApp Session
```
POST /whatsapp/logout
Content-Type: application/json

{
  "sessionName": "session1"
}
```

**Response**: Confirmation of logout

---

## 📝 Message Template Management

### 1. Save/Create Template
```
POST /campaign/templates/save
Content-Type: application/json

{
  "user_id": 1,
  "template_name": "Welcome Message",
  "template_type": "plainText",
  "template_content": "Hello {name}, welcome!",
  "variables": ["name"],
  "preview_text": "Hello {{name}}, welcome!",
  "template_data": {}
}
```

**Response**: `templateId` (save this for later use)

---

### 2. Get All Templates for User
```
GET /campaign/templates/user/:user_id
```

**Response**: Array of all user's templates

---

### 3. Get Single Template
```
GET /campaign/templates/:template_id
```

**Response**: Template details

---

### 4. Update Template
```
PUT /campaign/templates/:template_id
Content-Type: application/json

{
  "user_id": 1,
  "template_name": "Welcome Message v2",
  "template_type": "plainText",
  "template_content": "Hello {name}, welcome!",
  "variables": ["name"],
  "is_active": true
}
```

**Response**: Update confirmation

---

### 5. Delete Template
```
DELETE /campaign/templates/:template_id
Content-Type: application/json

{
  "user_id": 1
}
```

**Response**: Deletion confirmation

---

## 📢 Campaign Management

### 1. Add Contacts to Campaign
```
POST /campaign/add-contacts
Content-Type: application/json

{
  "campaign_id": "camp_001",
  "user_id": 1,
  "contacts": [
    "919876543210",
    "919876543211",
    "919876543212"
  ]
}
```

**Response**: Count of added contacts

---

### 2. Start Campaign with Plain Text
```
POST /campaign/start/:campaignId
Content-Type: application/json

{
  "messageTemplate": "Hello! Check our offers today!"
}
```

**Response**: Campaign started confirmation + status URL

---

### 3. Start Campaign with Template
```
POST /campaign/start/:campaignId
Content-Type: application/json

{
  "templateId": 5
}
```

**Response**: Campaign started confirmation + status URL

---

### 4. Check Campaign Status
```
GET /campaign/:campaignId/status
```

**Response**: 
```json
{
  "campaignId": "camp_001",
  "pending": 20,
  "in_progress": 10,
  "sent": 50,
  "delivered": 45,
  "failed": 5,
  "completionPercentage": 87.5
}
```

---

## 🏥 Health Check

### Health Check
```
GET /health
GET /api/health
```

**Response**: API health status

---

## 📋 Template Types Supported

```
plainText          - Simple text message
buttonMessage      - Message with buttons
linkMenu           - Menu with links
actionMenu         - Action-based menu
infoCard           - Information card
productCard        - Product display
orderUpdate        - Order status update
custom             - Custom format
simpleMenu         - Simple menu
boxMenu            - Box menu format
```

---

## 🔴 Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| VALIDATION_001 | 400 | Invalid request data |
| SESSION_001 | 500 | Failed to create session |
| SESSION_002 | 404 | Session not found |
| CAMPAIGN_001 | 409 | Duplicate contacts |
| CAMPAIGN_002 | 404 | No pending contacts |
| CAMPAIGN_003 | 400 | Message or template required |
| TEMPLATE_001 | 404 | Template not found |
| TEMPLATE_002 | 409 | Template name exists |
| TEMPLATE_003 | 403 | Not your template |
| TIMEOUT_001 | 408 | Request timeout |

---

## 🚀 Typical Usage Flow

```
1. POST /whatsapp/connect
   ↓
2. [Scan QR Code]
   ↓
3. POST /campaign/templates/save (Optional)
   ↓
4. POST /campaign/add-contacts
   ↓
5. POST /campaign/start/camp_001
   ↓ (with either messageTemplate or templateId)
   ↓
6. GET /campaign/camp_001/status (Poll for updates)
```

---

## 💾 Validation Rules

**Phone Numbers**:
- Format: 10-15 digits
- No special characters or spaces
- Include country code (e.g., 919876543210)

**Campaign ID**:
- Format: camp_001, camp_002, etc.

**Session Name**:
- Format: session1, session2, etc.

**Template Name**:
- Max 255 characters
- Unique per user

**Message Content**:
- Max 4096 characters
- Supports {variableName} placeholders

---

## ⚙️ Rate Limits

- **Concurrency**: 5 messages simultaneously
- **Rate Limit**: 50 messages per minute
- **Max Contacts**: 1000 per add-contacts request
- **Request Timeout**: 30 seconds
- **Shutdown Timeout**: 30 seconds

---

## 🔧 Configuration (.env)

```
PORT=3000
REQUEST_TIMEOUT_MS=30000
GRACEFUL_SHUTDOWN_TIMEOUT_MS=30000
CAMPAIGN_QUEUE_CONCURRENCY=5
CAMPAIGN_RATE_LIMIT_PER_MINUTE=50
CAMPAIGN_BATCH_SIZE=1000
CAMPAIGN_MAX_RETRIES=3
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 📊 Database Tables Used

| Table | Purpose |
|-------|---------|
| campaigns | Campaign metadata |
| campaign_queue | Contact delivery queue |
| message_templates | Saved templates |
| message_logs | Delivery logs |
| whatsapp_configs | Session configs |
| users | User accounts |

---

## 💡 Example: Complete Campaign

```bash
# Step 1: Connect WhatsApp
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session1"}'

# [User scans QR code]

# Step 2: Create Template
curl -X POST http://localhost:3000/api/campaign/templates/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Summer Promo",
    "template_type": "plainText",
    "template_content": "🎉 50% OFF Summer Sale!"
  }'

# Save templateId: 5

# Step 3: Add Contacts
curl -X POST http://localhost:3000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "camp_001",
    "user_id": 1,
    "contacts": ["919876543210", "919876543211"]
  }'

# Step 4: Start Campaign with Template
curl -X POST http://localhost:3000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"templateId": 5}'

# Step 5: Check Status
curl http://localhost:3000/api/campaign/camp_001/status
```

---

## 📌 Key Points

✅ No authentication required
✅ Plain text messages OR reusable templates
✅ Multiple WhatsApp sessions supported
✅ Template usage automatically tracked
✅ Automatic retry on failures (max 3 retries)
✅ Queue-based processing for reliability
✅ Session persistence and recovery

---

## 🔗 Full Documentation

See `COMPLETE_API_REFERENCE.md` for detailed documentation with examples and explanations.
