# API Documentation for Frontend Engineer

**Base URL**: `http://localhost:5000`  
**API Version**: 1.0.0  
**Content-Type**: `application/json`

---

## Table of Contents

1. [Health Check APIs](#health-check-apis)
2. [WhatsApp APIs](#whatsapp-apis)
3. [Campaign APIs](#campaign-apis)
4. [Error Handling](#error-handling)

---

## Health Check APIs

### 1. Health Check
Check if the server is running and healthy.

**Endpoint**:
```
GET /health
```

**Response (200 OK)**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-15T12:01:06.825+05:30",
  "uptime": 3456.789,
  "memory": {
    "rss": 89456789,
    "heapTotal": 45678901,
    "heapUsed": 23456789,
    "external": 123456
  }
}
```

**Response (503 Service Unavailable)**:
```json
{
  "success": false,
  "status": "unhealthy",
  "error": "Error message describing the issue"
}
```

---

### 2. Readiness Check
Check if the server is ready to handle requests (includes database connectivity).

**Endpoint**:
```
GET /ready
```

**Response (200 OK)**:
```json
{
  "success": true,
  "status": "ready",
  "dependencies": {
    "database": "connected"
  },
  "timestamp": "2026-05-15T12:01:06.825+05:30"
}
```

**Response (503 Service Unavailable)**:
```json
{
  "success": false,
  "status": "not-ready",
  "dependencies": {
    "database": "failed"
  },
  "error": "Database connection failed: connection timeout"
}
```

---

## WhatsApp APIs

### 1. Connect WhatsApp Session
Initiate a new WhatsApp session and get QR code for authentication.

**Endpoint**:
```
POST /api/whatsapp/connect
```

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "sessionName": "mysession"
}
```

**Request Validation**:
- `sessionName` (required): Alphanumeric string, 3-50 characters

**Response (200 OK - Session already connected)**:
```json
{
  "success": true,
  "message": "Session already connected",
  "sessionName": "mysession",
  "connected": true
}
```

**Response (200 OK - Session created with QR code)**:
```json
{
  "success": true,
  "sessionName": "mysession",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAMAAAC...",
  "connected": false,
  "message": "Scan the QR code"
}
```

**Response (200 OK - QR code generation in progress)**:
```json
{
  "success": true,
  "sessionName": "mysession",
  "qr": null,
  "connected": false,
  "message": "QR code generation in progress"
}
```

**Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.sessionName",
      "message": "\"sessionName\" must be alphanumeric"
    }
  ]
}
```

**Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Failed to create session",
  "code": "SESSION_001",
  "requestId": "req-123456"
}
```

---

### 2. Get All Sessions
Retrieve list of all active WhatsApp sessions.

**Endpoint**:
```
GET /api/whatsapp/sessions
```

**Headers**:
```
Content-Type: application/json
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "name": "mysession",
      "connected": true,
      "createdAt": 1715767266825,
      "lastActivity": 1715767466825,
      "qr": false
    },
    {
      "name": "session2",
      "connected": false,
      "createdAt": 1715767300000,
      "lastActivity": 1715767400000,
      "qr": true
    }
  ],
  "totalSessions": 2,
  "activeSessions": 1
}
```

**Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Failed to get sessions",
  "code": "SESSION_ERROR",
  "requestId": "req-123456"
}
```

---

### 3. Logout WhatsApp Session (NEW ⭐)
Close a WhatsApp session and cleanup all connections.

**Endpoint**:
```
POST /api/whatsapp/logout
```

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "sessionName": "mysession"
}
```

**Request Validation**:
- `sessionName` (required): Alphanumeric string, 3-50 characters

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Session logged out successfully",
  "sessionName": "mysession"
}
```

**Response (404 Not Found)**:
```json
{
  "success": false,
  "message": "Session not found",
  "sessionName": "mysession",
  "code": "SESSION_002"
}
```

**Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.sessionName",
      "message": "\"sessionName\" is required"
    }
  ]
}
```

**Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Failed to logout WhatsApp session",
  "code": "LOGOUT_ERROR",
  "requestId": "req-123456"
}
```

---

## Campaign APIs

### 1. Add Contacts to Campaign
Add phone numbers to a campaign queue for messaging.

**Endpoint**:
```
POST /api/campaign/add-contacts
```

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "campaign_id": 123,
  "user_id": 456,
  "contacts": [
    "9876543210",
    "9876543211",
    "9876543212",
    "9876543213"
  ]
}
```

**Request Validation**:
- `campaign_id` (required): Integer
- `user_id` (required): Integer
- `contacts` (required): Array of phone numbers (10-15 digits each)
  - Minimum 1 contact
  - Maximum 1000 contacts per request

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "4 contacts added successfully",
  "campaignId": 123,
  "insertedCount": 4
}
```

**Response (400 Bad Request - Validation Error)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.campaign_id",
      "message": "\"campaign_id\" must be a number"
    },
    {
      "field": "body.contacts.0",
      "message": "Each contact must be a valid phone number (10-15 digits)"
    }
  ]
}
```

**Response (409 Conflict - Duplicate Contacts)**:
```json
{
  "success": false,
  "error": "Some contacts already exist",
  "code": "CAMPAIGN_001",
  "requestId": "req-123456"
}
```

**Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Failed to add campaign contacts",
  "code": "CAMPAIGN_ERROR",
  "requestId": "req-123456"
}
```

---

### 2. Start Campaign
Begin sending messages to campaign contacts.

**Endpoint**:
```
POST /api/campaign/start/:campaignId
```

**URL Parameters**:
- `campaignId` (required): Campaign ID (number)

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "messageTemplate": "Hello {{name}}, your order {{orderId}} is confirmed. Thank you!"
}
```

**Request Validation**:
- `messageTemplate` (required): Non-empty string, max 4096 characters

**Response (202 Accepted - Campaign Started)**:
```json
{
  "success": true,
  "message": "Campaign started",
  "campaignId": "CAMP123456",
  "contactCount": 100,
  "statusCheckUrl": "/api/campaign/CAMP123456/status"
}
```

**Response (400 Bad Request - Validation Error)**:
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.messageTemplate",
      "message": "\"messageTemplate\" cannot be empty"
    }
  ]
}
```

**Response (404 Not Found - No Contacts)**:
```json
{
  "success": false,
  "error": "No pending contacts for this campaign",
  "code": "CAMPAIGN_002",
  "requestId": "req-123456"
}
```

**Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Failed to start campaign",
  "code": "CAMPAIGN_ERROR",
  "requestId": "req-123456"
}
```

---

### 3. Get Campaign Status
Check the progress and status of a running campaign.

**Endpoint**:
```
GET /api/campaign/:campaignId/status
```

**URL Parameters**:
- `campaignId` (required): Campaign ID (string)

**Headers**:
```
Content-Type: application/json
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "campaignId": "CAMP123456",
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

**Response (404 Not Found)**:
```json
{
  "success": false,
  "error": "Campaign not found",
  "code": "CAMPAIGN_003",
  "requestId": "req-123456"
}
```

**Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Failed to get campaign status",
  "code": "CAMPAIGN_ERROR",
  "requestId": "req-123456"
}
```

---

### 4. Get Job Status
Check the status of a specific job (message send job).

**Endpoint**:
```
GET /api/campaign/job/:jobId/status
```

**URL Parameters**:
- `jobId` (required): Job ID (string)

**Headers**:
```
Content-Type: application/json
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "jobId": "JOB_123456",
    "campaignId": "CAMP123456",
    "status": "processing",
    "progress": {
      "total": 100,
      "completed": 67,
      "failed": 3,
      "pending": 30
    },
    "progressPercentage": 67,
    "startedAt": "2026-05-15T10:30:00.000Z",
    "lastUpdatedAt": "2026-05-15T11:45:00.000Z",
    "estimatedCompletion": "2026-05-15T12:00:00.000Z"
  }
}
```

**Response (404 Not Found)**:
```json
{
  "success": false,
  "error": "Job not found",
  "code": "JOB_001",
  "requestId": "req-123456"
}
```

**Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "error": "Failed to get job status",
  "code": "JOB_ERROR",
  "requestId": "req-123456"
}
```

---

## Error Handling

### Standard Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "requestId": "unique-request-id",
  "details": []
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | OK | Request succeeded |
| **202** | Accepted | Campaign started (async processing) |
| **400** | Bad Request | Validation failed |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate entry |
| **500** | Server Error | Internal error |
| **503** | Service Unavailable | Database connection failed |

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_001` | Request validation failed |
| `VALIDATION_002` | Validation middleware error |
| `SESSION_001` | Failed to create session |
| `SESSION_002` | Session not found |
| `CAMPAIGN_001` | Duplicate contacts error |
| `CAMPAIGN_002` | No pending contacts |
| `CAMPAIGN_003` | Campaign not found |
| `JOB_001` | Job not found |
| `TIMEOUT_001` | Request timeout |
| `NOT_FOUND` | Endpoint not found |

---

## Sample Frontend Implementation

### Using JavaScript Fetch API

#### WhatsApp Connect
```javascript
async function connectWhatsApp(sessionName) {
  try {
    const response = await fetch('http://localhost:5000/api/whatsapp/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionName: sessionName
      })
    });

    const data = await response.json();
    
    if (data.success) {
      if (data.qr) {
        // Display QR code
        displayQRCode(data.qr);
      } else {
        console.log('Waiting for QR code generation...');
      }
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

#### WhatsApp Logout
```javascript
async function logoutWhatsApp(sessionName) {
  try {
    const response = await fetch('http://localhost:5000/api/whatsapp/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionName: sessionName
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Logged out successfully:', data.message);
    } else {
      console.error('Logout failed:', data.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

#### Add Campaign Contacts
```javascript
async function addCampaignContacts(campaignId, userId, contacts) {
  try {
    const response = await fetch('http://localhost:5000/api/campaign/add-contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        user_id: userId,
        contacts: contacts
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`${data.insertedCount} contacts added`);
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

#### Start Campaign
```javascript
async function startCampaign(campaignId, messageTemplate) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/campaign/start/${campaignId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageTemplate: messageTemplate
        })
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log('Campaign started:', data.contactCount, 'contacts');
      // Start polling for status
      pollCampaignStatus(data.campaignId);
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

#### Poll Campaign Status
```javascript
async function pollCampaignStatus(campaignId) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/campaign/${campaignId}/status`
      );

      const data = await response.json();
      
      if (data.success) {
        const status = data.data;
        console.log(`Progress: ${status.progressPercentage}%`);
        
        if (status.status === 'completed') {
          clearInterval(interval);
          console.log('Campaign completed!');
        }
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  }, 5000); // Poll every 5 seconds
}
```

---

## Using cURL for Testing

### WhatsApp Connect
```bash
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "mysession"
  }'
```

### Get Sessions
```bash
curl http://localhost:5000/api/whatsapp/sessions
```

### WhatsApp Logout
```bash
curl -X POST http://localhost:5000/api/whatsapp/logout \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "mysession"
  }'
```

### Add Campaign Contacts
```bash
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 123,
    "user_id": 456,
    "contacts": ["9876543210", "9876543211"]
  }'
```

### Start Campaign
```bash
curl -X POST http://localhost:5000/api/campaign/start/123 \
  -H "Content-Type: application/json" \
  -d '{
    "messageTemplate": "Hello, your order is confirmed!"
  }'
```

### Get Campaign Status
```bash
curl http://localhost:5000/api/campaign/CAMP123456/status
```

---

## Notes for Frontend Engineer

1. **Session Names**: Must be alphanumeric, 3-50 characters
2. **Phone Numbers**: 10-15 digits, no special characters
3. **Async Operations**: Use status endpoints to poll for campaign progress
4. **Error Handling**: Always check `success` field before processing data
5. **Request IDs**: Use `requestId` in error logs for debugging
6. **QR Code**: Display as image from base64 data URL
7. **Polling**: Recommended 5-10 second intervals for status checks
8. **Max Contacts**: 1000 contacts per request for add-contacts endpoint

---

**Last Updated**: 2026-05-15  
**Version**: 1.0.0  
**Maintained By**: Backend Team
