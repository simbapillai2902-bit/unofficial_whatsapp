# API Request/Response Schemas - JSON Reference

## Table of Contents
1. [Authentication](#authentication)
2. [WhatsApp Sessions](#whatsapp-sessions)
3. [Campaigns](#campaigns)
4. [Monitoring](#monitoring)
5. [Error Responses](#error-responses)

---

## Authentication

### Login Request (To Be Implemented)
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Login Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### Token Refresh Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Token Refresh Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

## WhatsApp Sessions

### Connect WhatsApp Request
```json
{
  "sessionName": "marketing_team"
}
```

**Validation:**
- `sessionName`: Alphanumeric, 3-50 characters, unique

### Connect WhatsApp Response (Pending)
```json
{
  "success": true,
  "sessionName": "marketing_team",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH0AAAH0AAAA...",
  "connected": false,
  "message": "Scan the QR code"
}
```

### Connect WhatsApp Response (Already Connected)
```json
{
  "success": true,
  "message": "Session already connected",
  "sessionName": "marketing_team",
  "connected": true
}
```

### Get Sessions Response
```json
{
  "success": true,
  "data": [
    {
      "name": "marketing_team",
      "connected": true,
      "createdAt": 1715677200000,
      "lastActivity": 1715680800000,
      "qr": false
    },
    {
      "name": "support_team",
      "connected": false,
      "createdAt": 1715680800000,
      "lastActivity": 1715680850000,
      "qr": true
    }
  ],
  "totalSessions": 2,
  "activeSessions": 1
}
```

### Session Object
```json
{
  "name": "string (session name)",
  "connected": "boolean (connection status)",
  "createdAt": "number (unix timestamp)",
  "lastActivity": "number (unix timestamp)",
  "qr": "boolean (has QR code)"
}
```

---

## Campaigns

### Add Contacts Request
```json
{
  "campaign_id": 1,
  "user_id": 42,
  "contacts": [
    "919876543210",
    "918765432109",
    "917654321098"
  ]
}
```

**Validation:**
- `campaign_id`: Required, positive integer
- `user_id`: Required, positive integer
- `contacts`: Required array
  - Length: 1-1000 items
  - Each item: 10-15 digits starting with country code (1-9)

### Add Contacts Response
```json
{
  "success": true,
  "message": "3 contacts added successfully",
  "campaignId": 1,
  "insertedCount": 3
}
```

### Add Contacts Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.contacts",
      "message": "Maximum 1000 contacts allowed per request"
    },
    {
      "field": "body.contacts[0]",
      "message": "Each contact must be a valid phone number (10-15 digits)"
    }
  ],
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Start Campaign Request
```json
{
  "messageTemplate": "Hello! This is a promotional message from our company. Please reply if interested."
}
```

**Validation:**
- `messageTemplate`: Required, 1-4096 characters

### Start Campaign Response (202 Accepted)
```json
{
  "success": true,
  "message": "Campaign started",
  "campaignId": 1,
  "jobId": "campaign-1-1715677200000",
  "contactCount": 150,
  "statusCheckUrl": "/api/campaign/1/status",
  "jobStatusUrl": "/api/campaign/job/campaign-1-1715677200000/status"
}
```

### Get Campaign Status Response
```json
{
  "success": true,
  "data": {
    "campaignId": 1,
    "pending": 45,
    "sent": 105,
    "failed": 0,
    "in_progress": 0
  },
  "completionPercentage": 70
}
```

### Campaign Status Object
```json
{
  "campaignId": "number",
  "pending": "number (contacts waiting to be sent)",
  "sent": "number (successfully sent)",
  "failed": "number (failed to send)",
  "in_progress": "number (currently being sent)",
  "completionPercentage": "number (0-100)"
}
```

### Get Job Status Response
```json
{
  "success": true,
  "data": {
    "id": "campaign-1-1715677200000",
    "state": "active",
    "progress": 65,
    "data": {
      "campaignId": 1,
      "messageTemplate": "Hello! This is a promotional message...",
      "userId": 42,
      "contactCount": 150
    },
    "attemptsMade": 0,
    "failedReason": null
  }
}
```

### Job Object
```json
{
  "id": "string (job ID)",
  "state": "string (waiting|active|completed|failed|delayed)",
  "progress": "number (0-100 percentage)",
  "data": {
    "campaignId": "number",
    "messageTemplate": "string",
    "userId": "number",
    "contactCount": "number"
  },
  "attemptsMade": "number",
  "failedReason": "string or null"
}
```

---

## Monitoring

### Health Check Response
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-14T12:30:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 50331648,
    "heapTotal": 33554432,
    "heapUsed": 15728640,
    "external": 2097152,
    "arrayBuffers": 1048576
  }
}
```

### Readiness Check Response
```json
{
  "success": true,
  "status": "ready",
  "dependencies": {
    "database": "connected",
    "redis": "connected"
  },
  "timestamp": "2026-05-14T12:30:00.000Z"
}
```

### Readiness Check Response (Not Ready)
```json
{
  "success": false,
  "status": "not-ready",
  "dependencies": {
    "database": "failed",
    "redis": "connected"
  },
  "error": "connect ECONNREFUSED 127.0.0.1:3306"
}
```

---

## Error Responses

### 400 - Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.campaign_id",
      "message": "campaign_id must be a number"
    }
  ],
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 401 - Missing Token
```json
{
  "success": false,
  "error": "Missing authorization token",
  "code": "AUTH_001",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 401 - Token Expired
```json
{
  "success": false,
  "error": "Token expired",
  "code": "AUTH_002",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 401 - Invalid Token
```json
{
  "success": false,
  "error": "Invalid token",
  "code": "AUTH_003",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": "Not found",
  "code": "NOT_FOUND",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 404 - Job Not Found
```json
{
  "success": false,
  "error": "Job not found",
  "code": "JOB_001",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 409 - Conflict (Duplicate)
```json
{
  "success": false,
  "error": "Resource already exists",
  "code": "DB_001",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 429 - Rate Limited
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_001",
  "retryAfter": 1715677260000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 429 - User Rate Limited
```json
{
  "success": false,
  "error": "User rate limit exceeded",
  "code": "RATE_LIMIT_002",
  "retryAfter": 1715677260000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 429 - Campaign Rate Limited
```json
{
  "success": false,
  "error": "Campaign operations rate limit exceeded",
  "code": "RATE_LIMIT_003",
  "retryAfter": 1715677260000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 429 - Upload Rate Limited
```json
{
  "success": false,
  "error": "Contact upload limit exceeded. Max 10 uploads per hour.",
  "code": "RATE_LIMIT_004",
  "retryAfter": 1715680800000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 500 - Internal Error
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 500 - Database Error
```json
{
  "success": false,
  "error": "Database error occurred",
  "code": "DB_002",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 504 - Timeout
```json
{
  "success": false,
  "error": "Request timeout",
  "code": "TIMEOUT_001",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Standard Response Structure

### Success Response (Generic)
```json
{
  "success": true,
  "data": {},
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Response (Generic)
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [],
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response Headers (All Responses)
```
Content-Type: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1715680800000
```

---

## Data Types Reference

### Phone Number Format
- **Length:** 10-15 digits
- **Format:** Country code + number (e.g., 919876543210)
- **Pattern:** Must start with 1-9
- **Examples:**
  - India: 919876543210
  - US: 19876543210
  - UK: 441234567890

### Timestamp
- **Type:** Unix milliseconds (integer)
- **Example:** 1715677200000
- **JS:** `Date.now()`
- **ISO 8601:** `2026-05-14T12:30:00.000Z`

### JWT Token
- **Format:** `header.payload.signature`
- **Header:** Base64 encoded JSON
- **Payload:** Base64 encoded claims
- **Signature:** HMAC-SHA256
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIn0...`

### UUID
- **Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Example:** `550e8400-e29b-41d4-a716-446655440000`
- **Generated:** `uuid.v4()`

---

## TypeScript Types (Optional)

```typescript
// Auth
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: true;
  token: string;
  refreshToken: string;
  expiresIn: string;
  user: User;
}

// Session
interface ConnectWhatsAppRequest {
  sessionName: string;
}

interface Session {
  name: string;
  connected: boolean;
  createdAt: number;
  lastActivity: number;
  qr: boolean;
}

// Campaign
interface AddContactsRequest {
  campaign_id: number;
  user_id: number;
  contacts: string[];
}

interface StartCampaignRequest {
  messageTemplate: string;
}

interface CampaignStatus {
  campaignId: number;
  pending: number;
  sent: number;
  failed: number;
  in_progress: number;
}

interface JobStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  data: JobData;
  attemptsMade: number;
  failedReason: string | null;
}

// Error
interface APIError {
  success: false;
  error: string;
  code: string;
  details?: ValidationDetail[];
  requestId: string;
}

interface ValidationDetail {
  field: string;
  message: string;
}
```

---

## Usage Examples

### Frontend (JavaScript/React)

#### Add Contacts Example
```javascript
const response = await fetch('/api/campaign/add-contacts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    campaign_id: 1,
    user_id: 42,
    contacts: ['919876543210', '918765432109']
  })
});

const data = await response.json();
if (data.success) {
  console.log(`Added ${data.insertedCount} contacts`);
}
```

#### Get Campaign Status Example
```javascript
const response = await fetch('/api/campaign/campaign/1/status', {
  headers: {
    'Authorization': 'Bearer token'
  }
});

const data = await response.json();
if (data.success) {
  console.log(`Progress: ${data.completionPercentage}%`);
  console.log(`Sent: ${data.data.sent}/${data.data.sent + data.data.pending + data.data.failed}`);
}
```

---

## Common Workflows

### 1. Complete Campaign Flow
```javascript
// 1. Connect WhatsApp
POST /api/whatsapp/connect
→ Get QR code, scan

// 2. Add contacts
POST /api/campaign/add-contacts
→ Contacts stored

// 3. Start campaign
POST /api/campaign/campaign/start/{id}
→ Get jobId

// 4. Poll status
GET /api/campaign/campaign/{id}/status
→ Track progress

// 5. Check job details
GET /api/campaign/job/{jobId}/status
→ Get detailed info
```

### 2. Error Handling
```javascript
try {
  const response = await api.startCampaign(id, message);
  // Handle success
} catch (error) {
  if (error.code === 'AUTH_002') {
    // Token expired, refresh and retry
  } else if (error.code === 'RATE_LIMIT_003') {
    // Wait and retry
  } else if (error.code === 'VALIDATION_001') {
    // Show validation errors
  } else {
    // Generic error handling
  }
}
```

---

This document serves as the complete JSON reference for the WhatsApp Campaign API. Use it for frontend implementation and testing.
