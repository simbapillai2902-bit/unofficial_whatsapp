# Multi-Channel WhatsApp Bulk Messaging System - Complete API Reference

**Base URL**: `http://localhost:3000/api`  
**Version**: 1.0.0  
**Authentication**: Not required  
**Content-Type**: `application/json`

---

## 📋 Table of Contents

1. [Health Check](#health-check)
2. [WhatsApp Session Management](#whatsapp-session-management)
3. [Message Templates](#message-templates)
4. [Campaign Management](#campaign-management)
5. [Error Codes](#error-codes)
6. [Complete Usage Flow](#complete-usage-flow)
7. [Rate Limits](#rate-limits)

---

## Health Check

### GET /health
**Description**: Verify API is running and responsive

```bash
curl http://localhost:3000/health
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "API is healthy"
}
```

---

## WhatsApp Session Management

### POST /api/whatsapp/connect
**Description**: Initiate WhatsApp connection and generate QR code

**Request**:
```json
{
  "sessionName": "session1"
}
```

**Response (First Call - QR Generated)**:
```json
{
  "success": true,
  "sessionName": "session1",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAC...",
  "connected": false,
  "message": "Scan the QR code"
}
```

**Response (QR Already Connected)**:
```json
{
  "success": true,
  "message": "Session already connected",
  "sessionName": "session1",
  "connected": true
}
```

**Validation**:
- `sessionName`: Pattern `session1`, `session2`, etc. (required)

---

### GET /api/whatsapp/sessions
**Description**: List all WhatsApp sessions with status

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "name": "session1",
      "connected": true,
      "messageCount": 42,
      "createdAt": "2024-05-19T10:30:00Z"
    },
    {
      "name": "session2",
      "connected": false,
      "messageCount": 0
    }
  ],
  "totalSessions": 2,
  "activeSessions": 1
}
```

---

### POST /api/whatsapp/logout
**Description**: Disconnect and remove a WhatsApp session

**Request**:
```json
{
  "sessionName": "session1"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session logged out successfully",
  "sessionName": "session1"
}
```

---

## Message Templates

### POST /api/campaign/templates/save
**Description**: Create and save a reusable message template

**Request**:
```json
{
  "user_id": 1,
  "template_name": "Welcome Message",
  "template_type": "plainText",
  "template_content": "Hello {name}, welcome to our service! 🎉",
  "variables": ["name", "company"],
  "preview_text": "Hello {{name}}, welcome to our service!",
  "template_data": {
    "greeting": "Hello",
    "emoji": "🎉"
  }
}
```

**Template Types**:
- `plainText` - Simple text message (default)
- `buttonMessage` - Message with buttons/CTA
- `linkMenu` - Menu with links
- `actionMenu` - Action-based menu
- `infoCard` - Information card format
- `productCard` - Product display format
- `orderUpdate` - Order status update
- `custom` - Custom formatted message
- `simpleMenu` - Simple menu
- `boxMenu` - Box menu format

**Response**:
```json
{
  "success": true,
  "message": "Template saved successfully",
  "templateId": 5,
  "templateName": "Welcome Message",
  "createdAt": "2024-05-19T12:17:01Z"
}
```

**Validation**:
- `user_id`: Integer (required)
- `template_name`: String, max 255 chars, unique per user (required)
- `template_type`: One of above types (required)
- `template_content`: String, max 4096 chars (required)
- `variables`: Array of strings (optional)
- `preview_text`: String, max 500 chars (optional)
- `template_data`: JSON object (optional)

---

### GET /api/campaign/templates/user/:user_id
**Description**: Retrieve all templates for a user

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "template_name": "Welcome Message",
      "template_type": "plainText",
      "template_content": "Hello {name}, welcome!",
      "variables": ["name"],
      "is_active": true,
      "usage_count": 15,
      "created_at": "2024-05-18T10:00:00Z",
      "preview_text": "Hello {{name}}, welcome!"
    }
  ],
  "total": 1,
  "userId": 1
}
```

---

### GET /api/campaign/templates/:template_id
**Description**: Get specific template details

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 5,
    "user_id": 1,
    "template_name": "Welcome Message",
    "template_type": "plainText",
    "template_content": "Hello {name}, welcome to our service!",
    "variables": ["name", "company"],
    "is_active": true,
    "usage_count": 15,
    "created_at": "2024-05-18T10:00:00Z",
    "updated_at": "2024-05-19T12:00:00Z",
    "preview_text": "Hello {{name}}, welcome!",
    "template_data": {
      "greeting": "Hello",
      "emoji": "🎉"
    }
  }
}
```

---

### PUT /api/campaign/templates/:template_id
**Description**: Update an existing template

**Request**:
```json
{
  "user_id": 1,
  "template_name": "Welcome Message v2",
  "template_type": "plainText",
  "template_content": "Hello {name}, welcome to our updated service!",
  "variables": ["name"],
  "is_active": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Template updated successfully",
  "templateId": 5,
  "templateName": "Welcome Message v2",
  "updatedAt": "2024-05-19T12:20:00Z"
}
```

---

### DELETE /api/campaign/templates/:template_id
**Description**: Delete a template (soft delete - sets is_active to 0)

**Request**:
```json
{
  "user_id": 1
}
```

**Response**:
```json
{
  "success": true,
  "message": "Template deleted successfully",
  "templateId": 5
}
```

---

## Campaign Management

### POST /api/campaign/add-contacts
**Description**: Add phone numbers to a campaign

**Request**:
```json
{
  "campaign_id": "camp_001",
  "user_id": 1,
  "contacts": [
    "919876543210",
    "919876543211",
    "919876543212",
    "919876543213"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "4 contacts added successfully",
  "campaignId": "camp_001",
  "insertedCount": 4
}
```

**Error (Duplicates)**:
```json
{
  "success": false,
  "error": "Some contacts already exist",
  "code": "CAMPAIGN_001",
  "statusCode": 409
}
```

**Validation**:
- `campaign_id`: Pattern `camp_001`, `camp_002`, etc. (required)
- `user_id`: Integer (required)
- `contacts`: Array of 1-1000 phone numbers (required)
- Each phone: 10-15 digits, no special characters (required)

---

### POST /api/campaign/start/:campaignId
**Description**: Launch campaign with plain text message

**Request (Plain Text)**:
```json
{
  "messageTemplate": "Hello! Check out our amazing offers today! 🎉"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Campaign started",
  "campaignId": "camp_001",
  "templateId": null,
  "contactCount": 100,
  "statusCheckUrl": "/api/campaign/camp_001/status"
}
```

---

### POST /api/campaign/start/:campaignId
**Description**: Launch campaign using a saved template

**Request (Template ID)**:
```json
{
  "templateId": 5
}
```

**Response**:
```json
{
  "success": true,
  "message": "Campaign started with template",
  "campaignId": "camp_001",
  "templateId": 5,
  "contactCount": 100,
  "statusCheckUrl": "/api/campaign/camp_001/status"
}
```

**Error (Template Not Found)**:
```json
{
  "success": false,
  "error": "Template not found or inactive",
  "code": "TEMPLATE_001",
  "statusCode": 404
}
```

**Validation**:
- Either `messageTemplate` OR `templateId` must be provided (required)
- `messageTemplate`: String, max 4096 chars
- `templateId`: Integer

---

### GET /api/campaign/:campaignId/status
**Description**: Check campaign progress

**Response**:
```json
{
  "success": true,
  "data": {
    "campaignId": "camp_001",
    "pending": 20,
    "in_progress": 10,
    "sent": 50,
    "delivered": 45,
    "read": 40,
    "failed": 5
  },
  "completionPercentage": 87.5
}
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_001` | 400 | Request validation failed |
| `VALIDATION_002` | 500 | Validation middleware error |
| `SESSION_001` | 500 | Failed to create session |
| `SESSION_002` | 404 | Session not found |
| `CAMPAIGN_001` | 409 | Duplicate contacts in campaign |
| `CAMPAIGN_002` | 404 | No pending contacts for campaign |
| `CAMPAIGN_003` | 400 | Neither template nor message provided |
| `TEMPLATE_001` | 404 | Template not found or inactive |
| `TEMPLATE_002` | 409 | Template with this name already exists |
| `TEMPLATE_003` | 403 | Unauthorized - not your template |
| `TIMEOUT_001` | 408 | Request timeout |
| `NOT_FOUND` | 404 | Endpoint not found |

---

## Complete Usage Flow

### Step 1: Connect WhatsApp Session
```bash
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session1"}'
```
**Action**: User scans the QR code from the response

### Step 2: Verify Session Connected
```bash
curl http://localhost:3000/api/whatsapp/sessions
```
**Check**: Ensure `connected: true` for your session

### Step 3: Save Message Template (Optional)
```bash
curl -X POST http://localhost:3000/api/campaign/templates/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Summer Offer",
    "template_type": "plainText",
    "template_content": "🎉 Hey {name}! Check our Summer Offer - 50% OFF!",
    "variables": ["name"]
  }'
```
**Save Template ID from response for later use**

### Step 4: Add Contacts to Campaign
```bash
curl -X POST http://localhost:3000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "camp_001",
    "user_id": 1,
    "contacts": [
      "919876543210",
      "919876543211",
      "919876543212"
    ]
  }'
```

### Step 5a: Start Campaign with Plain Text
```bash
curl -X POST http://localhost:3000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{
    "messageTemplate": "Hello! Check our amazing offers today!"
  }'
```

### Step 5b: OR Start Campaign with Template
```bash
curl -X POST http://localhost:3000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": 5
  }'
```

### Step 6: Monitor Campaign Status
```bash
curl http://localhost:3000/api/campaign/camp_001/status
```

---

## Rate Limits

| Setting | Value |
|---------|-------|
| **Concurrency** | 5 messages at a time |
| **Rate Limit** | 50 messages per minute |
| **Message Size** | Max 4096 characters |
| **Contacts per Request** | Max 1000 contacts |
| **Request Timeout** | 30 seconds (configurable) |
| **Graceful Shutdown** | 30 seconds (configurable) |

---

## Environment Configuration

```env
PORT=3000
REQUEST_TIMEOUT_MS=30000
GRACEFUL_SHUTDOWN_TIMEOUT_MS=30000
CAMPAIGN_QUEUE_CONCURRENCY=5
CAMPAIGN_RATE_LIMIT_PER_MINUTE=50
CAMPAIGN_BATCH_SIZE=1000
CAMPAIGN_MAX_RETRIES=3
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_METHODS=GET,POST,PUT,DELETE
ALLOWED_HEADERS=Content-Type,Authorization
```

---

## Database Structure

### Key Tables
- **campaigns** - Campaign metadata and statistics
- **campaign_queue** - Individual contacts and delivery status
- **message_templates** - Saved message templates
- **message_logs** - Complete message delivery logs
- **whatsapp_configs** - WhatsApp session configurations
- **users** - User accounts

### Message Status Flow
```
pending → in_progress → sent → delivered → read
                      ↘ failed ↙
```

---

## Notes

✅ No authentication required  
✅ All timestamps in UTC  
✅ Phone numbers in international format (country code + number)  
✅ Templates support variable substitution using `{variableName}` syntax  
✅ Campaigns are idempotent per contact (no duplicate messaging)  
✅ Template usage is automatically tracked  
✅ Supports multiple concurrent WhatsApp sessions  

---

## Support

For issues or questions, check the logs in `/logs/` directory with request IDs for tracing.
