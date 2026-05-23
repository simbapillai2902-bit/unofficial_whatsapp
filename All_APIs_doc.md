# 📚 All APIs Documentation

## WhatsApp Bulk Messaging Platform - Complete API Reference

**Version:** 1.0  
**Created:** 2026-05-23  
**Purpose:** Complete sequential API guide for developers  
**Base URL:** `http://localhost:3000`

---

## 📋 Quick Navigation

| Phase | APIs | Purpose |
|-------|------|---------|
| **0** | 2 APIs | Health & Readiness |
| **1** | 3 APIs | WhatsApp Connection |
| **2** | 3 APIs | User Management |
| **3** | 5 APIs | Message Templates |
| **4** | 3 APIs | Campaign Setup |
| **5** | 3 APIs | Add Contacts |
| **6** | 1 API | Start Campaign |
| **7** | 2 APIs | Monitor Status |
| **8** | 7 APIs | Message Details |
| **9** | 5 APIs | Analytics |
| **TOTAL** | **34 APIs** | Complete Workflow |

---

# PHASE 0: Health Check & Server Readiness

Start here to verify the server is running properly.

## API 0.1: Server Health Check

**Purpose:** Verify server is running and healthy  
**Endpoint:** `GET /health/health`  
**Authentication:** None  

### Request

```bash
curl -X GET http://localhost:3000/health/health
```

### Response (200 OK)

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-23T10:44:45.000Z",
  "uptime": 3600.45
}
```

### Expected Status Code

- ✅ **200 OK** - Server is healthy

---

## API 0.2: Server Readiness Check

**Purpose:** Verify server is ready (database connected)  
**Endpoint:** `GET /health/ready`  
**Authentication:** None

### Request

```bash
curl -X GET http://localhost:3000/health/ready
```

### Response (200 OK)

```json
{
  "success": true,
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-05-23T10:44:45.000Z"
}
```

### Expected Status Code

- ✅ **200 OK** - Server is ready

---

# PHASE 1: WhatsApp Connection

Connect WhatsApp account before sending any messages.

## API 1.1: Connect WhatsApp Session

**Purpose:** Initialize WhatsApp connection and get QR code  
**Endpoint:** `POST /api/whatsapp/connect`  
**Authentication:** None  
**Rate Limit:** Once per session

### Request

```bash
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "session1"
  }'
```

### Request Body

```json
{
  "sessionName": "session1"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "WhatsApp session started. Scan the QR code with your phone.",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "sessionName": "session1",
  "status": "connecting"
}
```

### Response (When Connected)

```json
{
  "success": true,
  "message": "WhatsApp session connected successfully",
  "sessionName": "session1",
  "status": "connected",
  "phoneNumber": "919876543210"
}
```

### Expected Status Codes

- ✅ **200 OK** - Session created
- ❌ **400 Bad Request** - Invalid session name
- ❌ **500 Server Error** - Connection failed

### Important Notes

- Scan QR code with WhatsApp mobile app
- Session will stay connected until logged out
- One session per sessionName
- Phone must have WhatsApp installed

---

## API 1.2: Get All Connected Sessions

**Purpose:** List all active WhatsApp sessions  
**Endpoint:** `GET /api/whatsapp/sessions`  
**Authentication:** None

### Request

```bash
curl -X GET http://localhost:3000/api/whatsapp/sessions
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "sessionName": "session1",
      "status": "connected",
      "phoneNumber": "919876543210",
      "connectedAt": "2026-05-23T10:30:00.000Z"
    }
  ]
}
```

### Expected Status Codes

- ✅ **200 OK** - Sessions retrieved
- ❌ **500 Server Error** - Query failed

---

## API 1.3: Logout WhatsApp Session

**Purpose:** Disconnect and logout a WhatsApp session  
**Endpoint:** `POST /api/whatsapp/logout`  
**Authentication:** None

### Request

```bash
curl -X POST http://localhost:3000/api/whatsapp/logout \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "session1"
  }'
```

### Request Body

```json
{
  "sessionName": "session1"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Session logged out successfully",
  "sessionName": "session1"
}
```

### Expected Status Codes

- ✅ **200 OK** - Logout successful
- ❌ **400 Bad Request** - Session not found
- ❌ **500 Server Error** - Logout failed

---

# PHASE 2: User Management

Create and manage user accounts.

## API 2.1: Create User

**Purpose:** Create a new user account  
**Endpoint:** `POST /api/user/create`  
**Authentication:** None

### Request

```bash
curl -X POST http://localhost:3000/api/user/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com"
  }'
```

### Request Body

```json
{
  "username": "john_doe",
  "email": "john@example.com"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "userId": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "createdAt": "2026-05-23T10:44:45.000Z"
  },
  "message": "User created successfully"
}
```

### Expected Status Codes

- ✅ **201 Created** - User created
- ❌ **400 Bad Request** - Validation failed
- ❌ **409 Conflict** - Username already exists
- ❌ **500 Server Error** - Creation failed

### Validation Rules

- Username: 3-50 characters, alphanumeric and underscores
- Email: Valid email format

---

## API 2.2: Get All Users

**Purpose:** Retrieve list of all users  
**Endpoint:** `GET /api/user/list`  
**Authentication:** None

### Request

```bash
curl -X GET http://localhost:3000/api/user/list
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "userId": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2026-05-23T10:44:45.000Z"
    },
    {
      "userId": 2,
      "username": "jane_smith",
      "email": "jane@example.com",
      "createdAt": "2026-05-23T10:45:00.000Z"
    }
  ]
}
```

### Expected Status Codes

- ✅ **200 OK** - Users retrieved
- ❌ **500 Server Error** - Query failed

---

## API 2.3: Get User by ID

**Purpose:** Retrieve specific user details  
**Endpoint:** `GET /api/user/:userId`  
**Authentication:** None  
**Parameters:** userId (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/user/1
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "userId": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "createdAt": "2026-05-23T10:44:45.000Z"
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - User found
- ❌ **404 Not Found** - User doesn't exist
- ❌ **500 Server Error** - Query failed

---

# PHASE 3: Message Templates

Create message templates with variables for personalization.

## API 3.1: Save Template

**Purpose:** Create a new message template  
**Endpoint:** `POST /api/template/save`  
**Authentication:** None

### Request

```bash
curl -X POST http://localhost:3000/api/template/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Welcome Message",
    "template_type": "plainText",
    "template_content": "Hello {{customer_name}}, Welcome to {{company_name}}!",
    "variables": ["customer_name", "company_name"],
    "preview_text": "Welcome to our company"
  }'
```

### Request Body

```json
{
  "user_id": 1,
  "template_name": "Welcome Message",
  "template_type": "plainText",
  "template_content": "Hello {{customer_name}}, Welcome to {{company_name}}!",
  "variables": ["customer_name", "company_name"],
  "preview_text": "Welcome to our company"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "template_id": 7,
    "user_id": 1,
    "template_name": "Welcome Message",
    "template_type": "plainText",
    "template_content": "Hello {{customer_name}}, Welcome to {{company_name}}!",
    "variables": ["customer_name", "company_name"],
    "preview_text": "Welcome to our company",
    "createdAt": "2026-05-23T10:44:45.000Z"
  },
  "message": "Template created successfully"
}
```

### Expected Status Codes

- ✅ **201 Created** - Template created
- ❌ **400 Bad Request** - Validation failed
- ❌ **500 Server Error** - Creation failed

### Field Validation

- **template_name:** 1-255 characters
- **template_type:** "plainText" or other types
- **template_content:** 1-4096 characters
- **variables:** Array of variable names (format: {{variable_name}})

---

## API 3.2: Get User Templates

**Purpose:** Retrieve all templates for a user  
**Endpoint:** `GET /api/template/templates/user/:user_id`  
**Authentication:** None  
**Parameters:** user_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/template/templates/user/1
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "template_id": 7,
      "user_id": 1,
      "template_name": "Welcome Message",
      "template_type": "plainText",
      "template_content": "Hello {{customer_name}}, Welcome to {{company_name}}!",
      "variables": ["customer_name", "company_name"],
      "preview_text": "Welcome to our company",
      "createdAt": "2026-05-23T10:44:45.000Z"
    }
  ]
}
```

### Expected Status Codes

- ✅ **200 OK** - Templates retrieved
- ❌ **404 Not Found** - User not found
- ❌ **500 Server Error** - Query failed

---

## API 3.3: Get Template by ID

**Purpose:** Retrieve specific template details  
**Endpoint:** `GET /api/template/templates/:template_id`  
**Authentication:** None  
**Parameters:** template_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/template/templates/7
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "template_id": 7,
    "user_id": 1,
    "template_name": "Welcome Message",
    "template_type": "plainText",
    "template_content": "Hello {{customer_name}}, Welcome to {{company_name}}!",
    "variables": ["customer_name", "company_name"],
    "preview_text": "Welcome to our company",
    "createdAt": "2026-05-23T10:44:45.000Z"
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Template found
- ❌ **404 Not Found** - Template doesn't exist
- ❌ **500 Server Error** - Query failed

---

## API 3.4: Update Template

**Purpose:** Update an existing template  
**Endpoint:** `PUT /api/template/templates/:template_id`  
**Authentication:** None  
**Parameters:** template_id (integer)

### Request

```bash
curl -X PUT http://localhost:3000/api/template/templates/7 \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Updated Welcome",
    "template_type": "plainText",
    "template_content": "Hi {{customer_name}}, Welcome back!",
    "variables": ["customer_name"]
  }'
```

### Request Body

```json
{
  "user_id": 1,
  "template_name": "Updated Welcome",
  "template_type": "plainText",
  "template_content": "Hi {{customer_name}}, Welcome back!",
  "variables": ["customer_name"]
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "template_id": 7,
    "user_id": 1,
    "template_name": "Updated Welcome",
    "template_type": "plainText",
    "template_content": "Hi {{customer_name}}, Welcome back!",
    "variables": ["customer_name"],
    "updatedAt": "2026-05-23T10:45:00.000Z"
  },
  "message": "Template updated successfully"
}
```

### Expected Status Codes

- ✅ **200 OK** - Template updated
- ❌ **400 Bad Request** - Validation failed
- ❌ **404 Not Found** - Template not found
- ❌ **500 Server Error** - Update failed

---

## API 3.5: Delete Template

**Purpose:** Delete a template  
**Endpoint:** `DELETE /api/template/templates/:template_id`  
**Authentication:** None  
**Parameters:** template_id (integer)

### Request

```bash
curl -X DELETE http://localhost:3000/api/template/templates/7 \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1
  }'
```

### Request Body

```json
{
  "user_id": 1
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

### Expected Status Codes

- ✅ **200 OK** - Template deleted
- ❌ **400 Bad Request** - Invalid user
- ❌ **404 Not Found** - Template not found
- ❌ **500 Server Error** - Deletion failed

---

# PHASE 4: Campaign Setup

Create campaigns to organize your message sending.

## API 4.1: Create Campaign

**Purpose:** Create a new campaign  
**Endpoint:** `POST /api/campaign/create`  
**Authentication:** None

### Request

```bash
curl -X POST http://localhost:3000/api/campaign/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "campaign_name": "Spring Sale 2026",
    "campaign_description": "30% discount on all items"
  }'
```

### Request Body

```json
{
  "user_id": 1,
  "campaign_name": "Spring Sale 2026",
  "campaign_description": "30% discount on all items"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "campaign_id": 2,
    "user_id": 1,
    "campaign_name": "Spring Sale 2026",
    "campaign_description": "30% discount on all items",
    "campaign_status": "draft",
    "createdAt": "2026-05-23T10:44:45.000Z"
  },
  "message": "Campaign created successfully"
}
```

### Expected Status Codes

- ✅ **201 Created** - Campaign created
- ❌ **400 Bad Request** - Validation failed
- ❌ **500 Server Error** - Creation failed

### Validation Rules

- **campaign_name:** 1-255 characters
- **campaign_description:** 0-1000 characters
- **user_id:** Must exist

---

## API 4.2: Get All Campaigns

**Purpose:** Retrieve all campaigns  
**Endpoint:** `GET /api/campaign/list`  
**Authentication:** None

### Request

```bash
curl -X GET http://localhost:3000/api/campaign/list
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "campaign_id": 1,
      "user_id": 1,
      "campaign_name": "First Campaign",
      "campaign_description": "Test campaign",
      "campaign_status": "draft",
      "createdAt": "2026-05-22T15:00:00.000Z"
    },
    {
      "campaign_id": 2,
      "user_id": 1,
      "campaign_name": "Spring Sale 2026",
      "campaign_description": "30% discount on all items",
      "campaign_status": "draft",
      "createdAt": "2026-05-23T10:44:45.000Z"
    }
  ]
}
```

### Expected Status Codes

- ✅ **200 OK** - Campaigns retrieved
- ❌ **500 Server Error** - Query failed

---

## API 4.3: Get Campaign by ID

**Purpose:** Retrieve specific campaign details  
**Endpoint:** `GET /api/campaign/:campaign_id`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/campaign/2
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": 2,
    "user_id": 1,
    "campaign_name": "Spring Sale 2026",
    "campaign_description": "30% discount on all items",
    "campaign_status": "draft",
    "totalContacts": 0,
    "createdAt": "2026-05-23T10:44:45.000Z"
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Campaign found
- ❌ **404 Not Found** - Campaign doesn't exist
- ❌ **500 Server Error** - Query failed

---

# PHASE 5: Add Campaign Contacts

Add phone numbers to campaigns before starting.

## API 5.1: Add Contacts to Campaign

**Purpose:** Add phone numbers to a campaign  
**Endpoint:** `POST /api/campaign/add-contacts`  
**Authentication:** None  
**Limit:** Max 2000 contacts per request

### Request

```bash
curl -X POST http://localhost:3000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 2,
    "user_id": 1,
    "contacts": [
      "919876543212",
      "919324479120",
      "918169501732"
    ]
  }'
```

### Request Body

```json
{
  "campaign_id": 2,
  "user_id": 1,
  "contacts": [
    "919876543212",
    "919324479120",
    "918169501732"
  ]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "campaign_id": 2,
    "user_id": 1,
    "totalRequested": 3,
    "contactsInserted": 3,
    "contactsDuplicate": 0,
    "queueInserted": 3,
    "queueDuplicate": 0
  },
  "message": "Contacts added successfully"
}
```

### Expected Status Codes

- ✅ **201 Created** - Contacts added
- ❌ **400 Bad Request** - Validation failed
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Addition failed

### Accepted Phone Formats

- `919876543212` - Without +
- `+919876543212` - With +
- `9876543212` - Without country code
- `00919876543212` - With 00 prefix

### Important Notes

- Duplicate numbers are not added again
- Queue is created automatically for new numbers
- Contacts are stored in contacts table
- Queue items track each send attempt

---

## API 5.2: Get Campaign Contacts

**Purpose:** Retrieve all contacts in a campaign  
**Endpoint:** `GET /api/campaign/:campaign_id/contacts`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/campaign/2/contacts
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "contact_id": 1,
      "phone_number": "919876543212",
      "contact_name": "John Doe",
      "addedAt": "2026-05-23T10:44:45.000Z"
    },
    {
      "contact_id": 2,
      "phone_number": "919324479120",
      "contact_name": "Jane Smith",
      "addedAt": "2026-05-23T10:44:46.000Z"
    }
  ]
}
```

### Expected Status Codes

- ✅ **200 OK** - Contacts retrieved
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Query failed

---

## API 5.3: Delete Contacts from Campaign

**Purpose:** Remove phone numbers from a campaign  
**Endpoint:** `POST /api/campaign/delete-contacts`  
**Authentication:** None

### Request

```bash
curl -X POST http://localhost:3000/api/campaign/delete-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 2,
    "user_id": 1,
    "contacts": [
      "919876543212"
    ]
  }'
```

### Request Body

```json
{
  "campaign_id": 2,
  "user_id": 1,
  "contacts": [
    "919876543212"
  ]
}
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": 2,
    "deleted": 1,
    "notFound": 0
  },
  "message": "Contacts deleted successfully"
}
```

### Expected Status Codes

- ✅ **200 OK** - Contacts deleted
- ❌ **400 Bad Request** - Validation failed
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Deletion failed

---

# PHASE 6: Start Campaign

Send messages using template or direct message.

## API 6.1: Start Campaign with Template

**Purpose:** Begin sending campaign messages using a template  
**Endpoint:** `POST /api/campaign/start/:campaign_id`  
**Authentication:** None  
**Parameters:** campaign_id (integer)  
**Processing:** Asynchronous (202 response)

### Request (Using Template)

```bash
curl -X POST http://localhost:3000/api/campaign/start/2 \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "templateId": 7
  }'
```

### Request Body

```json
{
  "user_id": 1,
  "templateId": 7
}
```

### Response (202 Accepted)

```json
{
  "success": true,
  "status": 202,
  "message": "Campaign processing started in background",
  "data": {
    "campaign_id": 2,
    "contactCount": 78,
    "templateId": 7
  }
}
```

### Request (Using Direct Message)

```bash
curl -X POST http://localhost:3000/api/campaign/start/2 \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "messageTemplate": "Check out our Spring Sale! Get 30% off now!"
  }'
```

### Request Body (Direct Message)

```json
{
  "user_id": 1,
  "messageTemplate": "Check out our Spring Sale! Get 30% off now!"
}
```

### Response (202 Accepted)

```json
{
  "success": true,
  "status": 202,
  "message": "Campaign processing started in background",
  "data": {
    "campaign_id": 2,
    "contactCount": 78
  }
}
```

### Expected Status Codes

- ✅ **202 Accepted** - Campaign started (async processing)
- ❌ **400 Bad Request** - Validation failed
- ❌ **404 Not Found** - Campaign/template not found
- ❌ **500 Server Error** - Start failed

### Important Notes

- Response returns 202 (processing in background)
- Use Status API to check progress
- One template OR messageTemplate (not both)
- Campaign must have contacts
- WhatsApp session must be connected

---

# PHASE 7: Monitor Campaign Status

Check campaign progress and delivery status.

## API 7.1: Get Campaign Status

**Purpose:** Get real-time campaign status and message breakdown  
**Endpoint:** `GET /api/campaign/:campaign_id/status`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/campaign/2/status
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": "2",
    "campaign_name": "Spring Sale 2026",
    "campaign_status": "in_progress",
    "total_contacts": 78,
    "message_breakdown": {
      "pending": 0,
      "in_progress": 5,
      "sent": 45,
      "delivered": 20,
      "read": 8,
      "failed": 0,
      "bounced": 0,
      "retry": 0
    },
    "metrics": {
      "progress_percentage": 87.18,
      "delivery_rate": 25.64,
      "read_rate": 10.26,
      "failure_rate": 0
    },
    "timestamps": {
      "last_updated": "2026-05-23T10:44:45.000Z",
      "campaign_created": "2026-05-23T10:30:00.000Z",
      "campaign_updated": "2026-05-23T10:44:45.000Z"
    }
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Status retrieved
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Query failed

### Status Values

- **pending:** Waiting to be sent
- **in_progress:** Currently being sent
- **sent:** Sent to WhatsApp, waiting for delivery
- **delivered:** Reached recipient's phone
- **read:** Recipient opened the message
- **failed:** Failed to send
- **bounced:** Rejected by WhatsApp
- **retry:** In retry queue

---

## API 7.2: Get Campaign Read Status

**Purpose:** Get detailed read status information  
**Endpoint:** `GET /api/campaign/:campaign_id/read-status`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/campaign/2/read-status
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": 2,
    "campaign_name": "Spring Sale 2026",
    "total_contacts": 78,
    "read_status": {
      "total_sent": 65,
      "total_delivered": 45,
      "total_read": 8,
      "not_read": 37
    },
    "metrics": {
      "delivery_percentage": 69.23,
      "read_percentage": 17.78,
      "read_of_delivered": 17.78
    },
    "timestamps": {
      "updated_at": "2026-05-23T10:44:45.000Z"
    }
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Read status retrieved
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Query failed

---

# PHASE 8: Message Details & Read Status

Track individual messages and get detailed read information.

## API 8.1: Get Message Status

**Purpose:** Get status of a single message  
**Endpoint:** `GET /api/message/:message_id/read-status`  
**Authentication:** None  
**Parameters:** message_id (string)

### Request

```bash
curl -X GET http://localhost:3000/api/message/3EB09280C0F3C5945F2514/read-status
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message_id": "3EB09280C0F3C5945F2514",
    "campaign_id": 2,
    "recipient_phone": "919876543212",
    "status": "read",
    "sent_at": "2026-05-23T10:34:01.000Z",
    "delivered_at": "2026-05-23T10:34:30.000Z",
    "read_at": "2026-05-23T10:34:37.000Z"
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Message found
- ❌ **404 Not Found** - Message not found
- ❌ **500 Server Error** - Query failed

---

## API 8.2: Get Message Read Count

**Purpose:** Get count of users who read the message  
**Endpoint:** `GET /api/message/:message_id/read-count`  
**Authentication:** None  
**Parameters:** message_id (string)

### Request

```bash
curl -X GET http://localhost:3000/api/message/3EB09280C0F3C5945F2514/read-count
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message_id": "3EB09280C0F3C5945F2514",
    "total_sent": 1,
    "total_delivered": 1,
    "total_read": 1,
    "read_percentage": 100
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Count retrieved
- ❌ **404 Not Found** - Message not found
- ❌ **500 Server Error** - Query failed

---

## API 8.3: Get Users Who Read Message

**Purpose:** List users who opened the message  
**Endpoint:** `GET /api/message/:message_id/read-users`  
**Authentication:** None  
**Parameters:** message_id (string)

### Request

```bash
curl -X GET http://localhost:3000/api/message/3EB09280C0F3C5945F2514/read-users
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message_id": "3EB09280C0F3C5945F2514",
    "read_users": [
      {
        "phone_number": "919876543212",
        "read_at": "2026-05-23T10:34:37.000Z"
      }
    ]
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Users retrieved
- ❌ **404 Not Found** - Message not found
- ❌ **500 Server Error** - Query failed

---

## API 8.4: Get Pending Read Messages

**Purpose:** Get contacts who received but haven't read  
**Endpoint:** `GET /api/message/:message_id/pending-read`  
**Authentication:** None  
**Parameters:** message_id (string)

### Request

```bash
curl -X GET http://localhost:3000/api/message/3EB09280C0F3C5945F2514/pending-read
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message_id": "3EB09280C0F3C5945F2514",
    "pending_users": [
      {
        "phone_number": "919324479120",
        "delivered_at": "2026-05-23T10:34:32.000Z"
      }
    ]
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Pending users retrieved
- ❌ **404 Not Found** - Message not found
- ❌ **500 Server Error** - Query failed

---

## API 8.5: Get Message Read History

**Purpose:** Get complete timeline of message status changes  
**Endpoint:** `GET /api/message/:message_id/read-history`  
**Authentication:** None  
**Parameters:** message_id (string)

### Request

```bash
curl -X GET http://localhost:3000/api/message/3EB09280C0F3C5945F2514/read-history
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message_id": "3EB09280C0F3C5945F2514",
    "history": [
      {
        "status": "sent",
        "timestamp": "2026-05-23T10:34:01.000Z"
      },
      {
        "status": "delivered",
        "timestamp": "2026-05-23T10:34:30.000Z"
      },
      {
        "status": "read",
        "timestamp": "2026-05-23T10:34:37.000Z"
      }
    ]
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - History retrieved
- ❌ **404 Not Found** - Message not found
- ❌ **500 Server Error** - Query failed

---

## API 8.6: Get Complete Message Status

**Purpose:** Get all information about a message  
**Endpoint:** `GET /api/message/:message_id/complete-status`  
**Authentication:** None  
**Parameters:** message_id (string)

### Request

```bash
curl -X GET http://localhost:3000/api/message/3EB09280C0F3C5945F2514/complete-status
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message_id": "3EB09280C0F3C5945F2514",
    "campaign_id": 2,
    "recipient_phone": "919876543212",
    "message_content": "Check out our Spring Sale! Get 30% off now!",
    "status": "read",
    "sent_at": "2026-05-23T10:34:01.000Z",
    "delivered_at": "2026-05-23T10:34:30.000Z",
    "read_at": "2026-05-23T10:34:37.000Z",
    "retry_count": 0,
    "error_message": null
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Complete status retrieved
- ❌ **404 Not Found** - Message not found
- ❌ **500 Server Error** - Query failed

---

## API 8.7: Mark Message as Read

**Purpose:** Manually mark a message as read  
**Endpoint:** `POST /api/message/:message_id/mark-read`  
**Authentication:** None  
**Parameters:** message_id (string)

### Request

```bash
curl -X POST http://localhost:3000/api/message/3EB09280C0F3C5945F2514/mark-read \
  -H "Content-Type: application/json" \
  -d '{
    "manual_override": true
  }'
```

### Request Body

```json
{
  "manual_override": true
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Message marked as read",
  "data": {
    "message_id": "3EB09280C0F3C5945F2514",
    "status": "read",
    "read_at": "2026-05-23T10:45:00.000Z"
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Message marked
- ❌ **404 Not Found** - Message not found
- ❌ **500 Server Error** - Mark failed

---

# PHASE 9: Campaign Analytics

Get detailed analytics and reports.

## API 9.1: Get Campaign Analytics

**Purpose:** Get comprehensive campaign analytics  
**Endpoint:** `GET /api/campaign/:campaign_id/analytics`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/campaign/2/analytics
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": 2,
    "campaign_name": "Spring Sale 2026",
    "total_contacts": 78,
    "sent_count": 65,
    "delivered_count": 45,
    "read_count": 8,
    "failed_count": 0,
    "bounce_count": 0,
    "retry_count": 0,
    "metrics": {
      "send_success_rate": 83.33,
      "delivery_rate": 69.23,
      "read_rate": 17.78,
      "failure_rate": 0
    },
    "timestamps": {
      "campaign_created": "2026-05-23T10:30:00.000Z",
      "campaign_started": "2026-05-23T10:32:00.000Z",
      "last_updated": "2026-05-23T10:44:45.000Z"
    }
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Analytics retrieved
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Query failed

---

## API 9.2: Get Messages Read Status (Campaign)

**Purpose:** Get all messages with their read status  
**Endpoint:** `GET /api/message/campaign/:campaign_id/messages-read-status`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/message/campaign/2/messages-read-status
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": 2,
    "total_messages": 65,
    "messages": [
      {
        "message_id": "3EB09280C0F3C5945F2514",
        "recipient_phone": "919876543212",
        "status": "read",
        "sent_at": "2026-05-23T10:34:01.000Z",
        "delivered_at": "2026-05-23T10:34:30.000Z",
        "read_at": "2026-05-23T10:34:37.000Z"
      }
    ]
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Messages retrieved
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Query failed

---

## API 9.3: Get Read Analytics

**Purpose:** Get detailed read analytics for campaign  
**Endpoint:** `GET /api/message/campaign/:campaign_id/read-analytics`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/message/campaign/2/read-analytics
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": 2,
    "total_sent": 65,
    "total_delivered": 45,
    "total_read": 8,
    "read_breakdown": {
      "read_percentage": 12.31,
      "unread_percentage": 87.69,
      "avg_read_time_seconds": 35.5
    }
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Analytics retrieved
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Query failed

---

## API 9.4: Get Read Summary

**Purpose:** Get quick summary of read status  
**Endpoint:** `GET /api/message/campaign/:campaign_id/read-summary`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X GET http://localhost:3000/api/message/campaign/2/read-summary
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "campaign_id": 2,
    "summary": {
      "total_contacts": 78,
      "sent": 65,
      "delivered": 45,
      "read": 8,
      "pending": 13
    },
    "rates": {
      "sent_rate": 83.33,
      "delivery_rate": 69.23,
      "read_rate": 12.31
    }
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Summary retrieved
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Query failed

---

## API 9.5: Delete Campaign

**Purpose:** Delete a campaign and all its data  
**Endpoint:** `DELETE /api/campaign/:campaign_id`  
**Authentication:** None  
**Parameters:** campaign_id (integer)

### Request

```bash
curl -X DELETE http://localhost:3000/api/campaign/2
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Campaign deleted successfully",
  "data": {
    "campaign_id": 2,
    "deleted_at": "2026-05-23T10:45:00.000Z"
  }
}
```

### Expected Status Codes

- ✅ **200 OK** - Campaign deleted
- ❌ **404 Not Found** - Campaign not found
- ❌ **500 Server Error** - Deletion failed

### Important Notes

- Deletion is permanent
- All related messages and queue items are deleted
- Cannot delete running campaigns

---

# 📊 Quick Reference

## Base URL
```
http://localhost:3000
```

## HTTP Methods Used
- **GET** - Retrieve data
- **POST** - Create data or perform action
- **PUT** - Update data
- **DELETE** - Delete data

## Common Response Codes
- **200 OK** - Request successful
- **201 Created** - Resource created
- **202 Accepted** - Async processing started
- **400 Bad Request** - Validation error
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate or conflict
- **500 Server Error** - Server error

## Content Type
All requests should use:
```
Content-Type: application/json
```

---

# 📈 Complete Workflow Example

## 1. Check Server Health
```bash
curl http://localhost:3000/health/health
```

## 2. Connect WhatsApp
```bash
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session1"}'
# Scan QR code
```

## 3. Create User
```bash
curl -X POST http://localhost:3000/api/user/create \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "email": "admin@example.com"}'
# Returns: user_id = 1
```

## 4. Create Template
```bash
curl -X POST http://localhost:3000/api/template/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Welcome",
    "template_type": "plainText",
    "template_content": "Hello {{name}}!",
    "variables": ["name"]
  }'
# Returns: template_id = 7
```

## 5. Create Campaign
```bash
curl -X POST http://localhost:3000/api/campaign/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "campaign_name": "Welcome Campaign",
    "campaign_description": "Send welcome messages"
  }'
# Returns: campaign_id = 2
```

## 6. Add Contacts
```bash
curl -X POST http://localhost:3000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 2,
    "user_id": 1,
    "contacts": ["919876543212", "919324479120"]
  }'
```

## 7. Start Campaign
```bash
curl -X POST http://localhost:3000/api/campaign/start/2 \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "templateId": 7}'
```

## 8. Check Status
```bash
curl http://localhost:3000/api/campaign/2/status
```

## 9. Get Analytics
```bash
curl http://localhost:3000/api/campaign/2/analytics
```

---

# 📝 Notes for Developers

1. **Rate Limiting:** Currently not enforced, implement in production
2. **Authentication:** Currently no auth, add JWT in production
3. **Validation:** All inputs are validated server-side
4. **Async Processing:** Campaign start returns 202, check status API
5. **Database:** Uses MySQL, ensure connection before API usage
6. **Phone Numbers:** Supports multiple formats (with/without +, country code optional)
7. **Templates:** Support variables with {{variable_name}} syntax
8. **Error Handling:** All errors return proper HTTP status codes
9. **Timestamps:** All timestamps in ISO 8601 format
10. **Pagination:** Not currently implemented, all results returned

---

**Total APIs:** 34  
**Documentation:** Complete  
**Last Updated:** 2026-05-23  
**Version:** 1.0  

