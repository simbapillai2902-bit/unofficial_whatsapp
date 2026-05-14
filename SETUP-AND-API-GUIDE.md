# Multi-Channel WhatsApp Campaign Manager - Setup & API Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation & Setup](#installation--setup)
3. [Running the Application](#running-the-application)
4. [Testing APIs](#testing-apis)
5. [API Documentation](#api-documentation)

---

## Prerequisites

- **Node.js**: v16 or higher
- **MySQL**: v8.0 or higher (running locally or Docker)
- **npm**: v7 or higher
- **Postman** or **VS Code REST Client** (for API testing)

---

## Installation & Setup

### Step 1: Clone/Setup Project
```bash
cd c:\Users\dell\Desktop\presflog\multi-channel
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables

Create `.env` file (copy from `.env.example` if needed):

```env
PORT=5000
NODE_ENV=production

# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bulk_message
DB_USER=root
DB_PASS=your_password
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_TIMEOUT=30000
DB_ENABLE_KEEP_ALIVE=true

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Campaign Configuration
CAMPAIGN_MESSAGE_DELAY_MS=4000
CAMPAIGN_MAX_RETRIES=3
CAMPAIGN_BATCH_SIZE=1000
CAMPAIGN_WORKER_INTERVAL=5000
CAMPAIGN_QUEUE_CONCURRENCY=5
CAMPAIGN_RATE_LIMIT_PER_MINUTE=50

# Session Configuration
SESSION_TIMEOUT_MS=86400000
SESSION_CLEANUP_INTERVAL_MS=3600000
MAX_ACTIVE_SESSIONS=100

# WhatsApp Configuration
WHATSAPP_TIMEOUT_MS=30000
WHATSAPP_RECONNECT_RETRIES=5
WHATSAPP_MESSAGE_RETRY_DELAY=5000

# Allowed Origins for CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
ALLOWED_HEADERS=Content-Type,Authorization

# Server Configuration
REQUEST_TIMEOUT_MS=30000
GRACEFUL_SHUTDOWN_TIMEOUT_MS=30000

# Feature Flags
ENABLE_JOB_QUEUE=true
ENABLE_CIRCUIT_BREAKER=true
ENABLE_CACHING=true
```

### Step 4: Setup MySQL Database

**Option A: Using MySQL locally**

```bash
# Connect to MySQL
mysql -u root -p

# Run in MySQL
CREATE DATABASE bulk_message;

# Then import the migration file
mysql -u root -p bulk_message < database-migration.sql
```

**Option B: Using Docker Compose**

```bash
# Start MySQL and application
docker-compose up -d

# This will start MySQL on port 3306
```

### Step 5: Verify Database Connection

```bash
npm start
```

Check logs for:
```
✓ Database connected
✓ Server is running on port 5000
```

---

## Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

This uses `nodemon` to automatically restart when you make changes.

**Output should show:**
```
[server] Server is running
[db-connection] Database connected
[app] Express app configured successfully
```

### Production Mode
```bash
npm start
```

### Health Check
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
    "success": true,
    "status": "healthy",
    "timestamp": "2026-05-14T16:30:00.000Z",
    "uptime": 125.456,
    "memory": { ... }
}
```

---

## Testing APIs

### Using Postman

1. **Download Postman**: https://www.postman.com/downloads/
2. **Import Collection**: Use the API calls below
3. **Set Variables**:
   - `base_url`: http://localhost:5000
   - `api_prefix`: /api

### Using VS Code REST Client

1. **Install Extension**: REST Client by Humao Chen
2. **Create `test.http` file** and add requests from below

### Using curl (Terminal)

```bash
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"session1"}'
```

---

## API Documentation

### Base URL
```
http://localhost:5000
```

### Response Format

**Success Response:**
```json
{
    "success": true,
    "message": "Operation successful",
    "data": { ... }
}
```

**Error Response:**
```json
{
    "success": false,
    "error": "Error message",
    "code": "ERROR_CODE_001",
    "details": [ ... ]
}
```

---

## Endpoints

### 🟢 Health Check

#### GET `/health`
Check if API is running

**Request:**
```bash
curl http://localhost:5000/health
```

**Response (200):**
```json
{
    "success": true,
    "status": "healthy",
    "timestamp": "2026-05-14T16:30:00.000Z",
    "uptime": 125.456,
    "memory": {
        "rss": 51253248,
        "heapTotal": 16875520,
        "heapUsed": 8526312,
        "external": 551432
    }
}
```

---

### 🟢 Ready Check (Dependencies)

#### GET `/ready`
Check if all dependencies (Database) are connected

**Request:**
```bash
curl http://localhost:5000/ready
```

**Response (200):**
```json
{
    "success": true,
    "status": "ready",
    "dependencies": {
        "database": "connected"
    },
    "timestamp": "2026-05-14T16:30:00.000Z"
}
```

**Response (503) - When database is down:**
```json
{
    "success": false,
    "status": "not-ready",
    "dependencies": {
        "database": "failed"
    },
    "error": "Connection timeout"
}
```

---

### 🔵 WhatsApp - Connect Session

#### POST `/api/whatsapp/connect`
Initiate a WhatsApp session and get QR code

**Request:**
```bash
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{
    "sessionName": "session1"
  }'
```

**Request Body:**
```json
{
    "sessionName": "session1"
}
```

**Body Requirements:**
- `sessionName` (string, required):
  - Alphanumeric only (no special characters)
  - Min 3 characters, Max 50 characters
  - Examples: `session1`, `campaign_whatsapp`, `ws_bot`

**Response (200) - First Time (QR Code Pending):**
```json
{
    "success": true,
    "sessionName": "session1",
    "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "connected": false,
    "message": "Scan the QR code"
}
```

**Response (200) - Already Connected:**
```json
{
    "success": true,
    "message": "Session already connected",
    "sessionName": "session1",
    "connected": true
}
```

**Response (400) - Validation Error:**
```json
{
    "success": false,
    "error": "Validation failed",
    "code": "VALIDATION_001",
    "details": [
        {
            "field": "body.sessionName",
            "message": "\"sessionName\" must only contain alpha-numeric characters"
        }
    ]
}
```

**Response (500) - Server Error:**
```json
{
    "success": false,
    "error": "Failed to create session",
    "code": "SESSION_001"
}
```

---

### 🔵 WhatsApp - Get All Sessions

#### GET `/api/whatsapp/sessions`
Retrieve all WhatsApp sessions and their status

**Request:**
```bash
curl http://localhost:5000/api/whatsapp/sessions
```

**Response (200):**
```json
{
    "success": true,
    "data": [
        {
            "sessionName": "session1",
            "connected": true,
            "qr": null,
            "authenticatedUser": {
                "name": "John Doe",
                "id": "1234567890@c.us"
            }
        },
        {
            "sessionName": "session2",
            "connected": false,
            "qr": "data:image/png;base64,iVBORw0KGgo...",
            "authenticatedUser": null
        }
    ],
    "totalSessions": 2,
    "activeSessions": 1
}
```

---

### 🟣 Campaign - Add Contacts

#### POST `/api/campaign/add-contacts`
Add phone numbers to a campaign for bulk messaging

**Request:**
```bash
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["919876543210", "911234567890", "919988776655"]
  }'
```

**Request Body:**
```json
{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["919876543210", "911234567890"]
}
```

**Body Requirements:**
- `campaign_id` (number, required): Campaign ID (integer)
- `user_id` (number, required): User ID (integer)
- `contacts` (array, required):
  - Array of phone numbers (strings)
  - Format: 10-15 digits, starting with country code
  - Min 1 contact, Max 1000 contacts per request
  - Examples: `"919876543210"`, `"441234567890"`, `"14155552671"`

**Response (200) - Success:**
```json
{
    "success": true,
    "message": "3 contacts added successfully",
    "campaignId": 1,
    "insertedCount": 3
}
```

**Response (400) - Validation Error:**
```json
{
    "success": false,
    "error": "Validation failed",
    "code": "VALIDATION_001",
    "details": [
        {
            "field": "body.contacts.0",
            "message": "\"contacts[0]\" must contain only numeric characters"
        }
    ]
}
```

**Response (409) - Duplicate Contacts:**
```json
{
    "success": false,
    "error": "Some contacts already exist",
    "code": "CAMPAIGN_001"
}
```

**Response (500) - Server Error:**
```json
{
    "success": false,
    "error": "Failed to add campaign contacts",
    "code": "CAMPAIGN_002"
}
```

---

### 🟣 Campaign - Start Campaign

#### POST `/api/campaign/campaign/start/:campaignId`
Start sending messages to all contacts in a campaign

**Request:**
```bash
curl -X POST http://localhost:5000/api/campaign/campaign/start/1 \
  -H "Content-Type: application/json" \
  -d '{
    "messageTemplate": "Hello {{name}}, this is your message from our campaign!"
  }'
```

**URL Parameters:**
- `campaignId` (number, required): Campaign ID from URL

**Request Body:**
```json
{
    "messageTemplate": "Hello {{name}}, this is your message!"
}
```

**Body Requirements:**
- `messageTemplate` (string, required):
  - Min 1 character, Max 4096 characters
  - Can include template variables: `{{name}}`, `{{phone}}`, etc.
  - Examples:
    - `"Hello, welcome to our service!"`
    - `"Hi {{name}}, your code is {{code}}"`

**Response (202) - Campaign Started:**
```json
{
    "success": true,
    "message": "Campaign started",
    "campaignId": 1,
    "contactCount": 150,
    "statusCheckUrl": "/api/campaign/1/status"
}
```

**Response (404) - No Pending Contacts:**
```json
{
    "success": false,
    "error": "No pending contacts for this campaign",
    "code": "CAMPAIGN_002"
}
```

**Response (400) - Validation Error:**
```json
{
    "success": false,
    "error": "Validation failed",
    "code": "VALIDATION_001",
    "details": [
        {
            "field": "body.messageTemplate",
            "message": "\"messageTemplate\" is not allowed to be empty"
        }
    ]
}
```

---

### 🟣 Campaign - Get Campaign Status

#### GET `/api/campaign/campaign/:campaignId/status`
Get real-time status of campaign message delivery

**Request:**
```bash
curl http://localhost:5000/api/campaign/campaign/1/status
```

**URL Parameters:**
- `campaignId` (number, required): Campaign ID

**Response (200):**
```json
{
    "success": true,
    "data": {
        "campaignId": 1,
        "pending": 50,
        "sent": 100,
        "failed": 2,
        "total": 152,
        "failedReasons": [
            {
                "mobile": "919876543210",
                "reason": "Invalid number format"
            },
            {
                "mobile": "918765432109",
                "reason": "Session not connected"
            }
        ]
    },
    "completionPercentage": 65.78
}
```

**Response (404) - Campaign Not Found:**
```json
{
    "success": false,
    "error": "Campaign not found",
    "code": "CAMPAIGN_NOT_FOUND"
}
```

---

### 🟣 Campaign - Get Job Status

#### GET `/api/campaign/job/:jobId/status`
Get status of a specific job

**Request:**
```bash
curl http://localhost:5000/api/campaign/job/campaign-1-1715755200000/status
```

**URL Parameters:**
- `jobId` (string, required): Job ID from campaign start response

**Response (404) - Not Available:**
```json
{
    "success": false,
    "error": "Job status endpoint not available",
    "code": "JOB_001"
}
```

---

## Frontend Integration Example

### React/Vue Example

```javascript
// WhatsApp Connect
const connectWhatsApp = async (sessionName) => {
    const response = await fetch('http://localhost:5000/api/whatsapp/connect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionName })
    });
    const data = await response.json();
    
    if (data.success) {
        if (data.qr) {
            // Display QR code to user
            displayQRCode(data.qr);
        }
        // Check connection status periodically
        pollSessionStatus(sessionName);
    }
};

// Get All Sessions
const getSessions = async () => {
    const response = await fetch('http://localhost:5000/api/whatsapp/sessions');
    const data = await response.json();
    return data.data;
};

// Add Campaign Contacts
const addContacts = async (campaignId, userId, contacts) => {
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
    return response.json();
};

// Start Campaign
const startCampaign = async (campaignId, messageTemplate) => {
    const response = await fetch(`http://localhost:5000/api/campaign/campaign/start/${campaignId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageTemplate })
    });
    return response.json();
};

// Get Campaign Status
const getCampaignStatus = async (campaignId) => {
    const response = await fetch(`http://localhost:5000/api/campaign/campaign/${campaignId}/status`);
    return response.json();
};
```

---

## Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|------------|
| VALIDATION_001 | Request validation failed | 400 |
| VALIDATION_002 | Validation middleware error | 500 |
| AUTH_001 | Missing authorization token | 401 |
| AUTH_002 | Token expired | 401 |
| AUTH_003 | Invalid token | 401 |
| SESSION_001 | Failed to create session | 500 |
| CAMPAIGN_001 | Some contacts already exist | 409 |
| CAMPAIGN_002 | No pending contacts | 404 |
| JOB_001 | Job not found | 404 |
| TIMEOUT_001 | Request timeout | 408 |
| NOT_FOUND | Endpoint not found | 404 |
| RATE_LIMIT_001 | Rate limit exceeded (global) | 429 |
| RATE_LIMIT_002 | Rate limit exceeded (user) | 429 |
| RATE_LIMIT_003 | Rate limit exceeded (campaign) | 429 |

---

## Rate Limiting

- **Global Limit**: 100 requests per 15 minutes
- **User Limit**: 50 requests per 15 minutes
- **Campaign Limit**: 50 requests per minute
- **Health Check**: Not rate limited

---

## Common Issues & Solutions

### Issue: "Database connection failed"
**Solution:**
1. Verify MySQL is running: `mysql -u root -p`
2. Check DB credentials in `.env`
3. Verify database exists: `SHOW DATABASES;`

### Issue: "Cannot find module"
**Solution:**
```bash
npm install
```

### Issue: Port 5000 already in use
**Solution:**
```bash
# Change PORT in .env
PORT=5001
```

### Issue: WhatsApp Session not connecting
**Solution:**
1. Check internet connection
2. Verify WhatsApp is not open on another device
3. Try again with different sessionName

---

## Support

For issues or questions:
1. Check logs: `npm run dev` (watch for error messages)
2. Verify `.env` configuration
3. Test endpoints with Postman/curl

---

**Last Updated**: May 14, 2026
**Version**: 1.0.0
