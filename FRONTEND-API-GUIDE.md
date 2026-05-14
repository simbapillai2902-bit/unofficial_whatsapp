# Frontend Integration Guide - WhatsApp Campaign Manager API

**For: Frontend Engineers**  
**Version**: 1.0.0  
**Last Updated**: May 14, 2026

---

## 🚀 Quick Start

### Base URL
```
http://localhost:5000
```

### Base API Path
```
http://localhost:5000/api
```

---

## 📡 Available APIs

### 1️⃣ WhatsApp Session Management

#### Connect WhatsApp Session
```
POST /api/whatsapp/connect
```

**Purpose**: Initiate WhatsApp connection and get QR code

**Request Body**:
```json
{
  "sessionName": "session1"
}
```

**Response** (QR Code):
```json
{
  "success": true,
  "sessionName": "session1",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "connected": false,
  "message": "Scan the QR code"
}
```

**Response** (Already Connected):
```json
{
  "success": true,
  "message": "Session already connected",
  "sessionName": "session1",
  "connected": true
}
```

**Frontend Implementation**:
```javascript
async function connectWhatsApp(sessionName) {
  try {
    const response = await fetch('http://localhost:5000/api/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionName })
    });
    
    const data = await response.json();
    
    if (data.success && data.qr) {
      // Display QR code to user
      displayQRCode(data.qr);
      
      // Poll for connection status
      pollForConnection(sessionName);
    }
    
    return data;
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}
```

---

#### Get All Sessions
```
GET /api/whatsapp/sessions
```

**Purpose**: Retrieve all WhatsApp sessions and their status

**Response**:
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
      "qr": "data:image/png;base64,...",
      "authenticatedUser": null
    }
  ],
  "totalSessions": 2,
  "activeSessions": 1
}
```

**Frontend Implementation**:
```javascript
async function getSessions() {
  try {
    const response = await fetch('http://localhost:5000/api/whatsapp/sessions');
    const data = await response.json();
    
    if (data.success) {
      const connectedSessions = data.data.filter(s => s.connected);
      console.log(`${data.activeSessions} of ${data.totalSessions} sessions connected`);
      return data.data;
    }
  } catch (error) {
    console.error('Failed to get sessions:', error);
  }
}
```

---

### 2️⃣ Campaign Management

#### Add Contacts to Campaign
```
POST /api/campaign/add-contacts
```

**Purpose**: Bulk add phone numbers to a campaign

**Request Body**:
```json
{
  "campaign_id": 1,
  "user_id": 100,
  "contacts": ["919876543210", "911234567890"]
}
```

**Constraints**:
- `contacts` array: Min 1, Max 1000 contacts per request
- Phone format: 10-15 digits (e.g., 919876543210, 441234567890)

**Response**:
```json
{
  "success": true,
  "message": "2 contacts added successfully",
  "campaignId": 1,
  "insertedCount": 2
}
```

**Frontend Implementation**:
```javascript
async function addCampaignContacts(campaignId, userId, contacts) {
  try {
    const response = await fetch('http://localhost:5000/api/campaign/add-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        user_id: userId,
        contacts: contacts
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`${data.insertedCount} contacts added`);
      return data;
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Failed to add contacts:', error);
  }
}
```

---

#### Start Campaign
```
POST /api/campaign/campaign/start/:campaignId
```

**Purpose**: Begin sending messages to all contacts in campaign

**URL Parameter**: `campaignId` (e.g., `/api/campaign/campaign/start/1`)

**Request Body**:
```json
{
  "messageTemplate": "Hello {{name}}, welcome to our campaign!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Campaign started",
  "campaignId": 1,
  "contactCount": 150,
  "statusCheckUrl": "/api/campaign/1/status"
}
```

**Frontend Implementation**:
```javascript
async function startCampaign(campaignId, messageTemplate) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/campaign/campaign/start/${campaignId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageTemplate })
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Campaign started: ${data.contactCount} contacts`);
      // Start monitoring campaign progress
      monitorCampaignProgress(data.campaignId);
      return data;
    }
  } catch (error) {
    console.error('Failed to start campaign:', error);
  }
}
```

---

#### Get Campaign Status
```
GET /api/campaign/campaign/:campaignId/status
```

**Purpose**: Real-time campaign message delivery progress

**URL Parameter**: `campaignId` (e.g., `/api/campaign/campaign/1/status`)

**Response**:
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
      }
    ]
  },
  "completionPercentage": 65.78
}
```

**Frontend Implementation - Progress Monitoring**:
```javascript
function monitorCampaignProgress(campaignId, interval = 5000) {
  const monitor = setInterval(async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/campaign/campaign/${campaignId}/status`
      );
      const data = await response.json();
      
      if (data.success) {
        const { sent, pending, failed, total, completionPercentage } = data.data;
        
        // Update UI
        updateProgressBar(completionPercentage);
        updateStats({
          sent,
          pending,
          failed,
          total,
          completion: completionPercentage.toFixed(2) + '%'
        });
        
        // Stop monitoring when complete
        if (pending === 0) {
          clearInterval(monitor);
          showCompletionMessage();
        }
      }
    } catch (error) {
      console.error('Error monitoring progress:', error);
    }
  }, interval);
}
```

---

## 🎯 Complete Workflow Example

### Step-by-Step Flow

```javascript
// 1. Connect WhatsApp
const connectResponse = await connectWhatsApp('session1');
console.log('QR Code:', connectResponse.qr);
// User scans QR code...

// 2. Wait for connection (check periodically)
const sessions = await getSessions();
const isConnected = sessions.some(s => s.connected);

// 3. Add contacts to campaign
await addCampaignContacts(1, 100, [
  '919876543210',
  '911234567890',
  '919988776655'
]);

// 4. Start campaign
const startResponse = await startCampaign(1, 'Hello! Welcome to our campaign');

// 5. Monitor progress
monitorCampaignProgress(1);
```

---

## ⚠️ Error Handling

### Common Errors

```javascript
async function handleAPIError(response) {
  if (!response.success) {
    const error = response.error;
    const code = response.code;
    
    switch (code) {
      case 'VALIDATION_001':
        // Show validation errors
        response.details.forEach(detail => {
          console.error(`${detail.field}: ${detail.message}`);
        });
        break;
        
      case 'SESSION_001':
        // Session creation failed
        alert('Failed to create WhatsApp session');
        break;
        
      case 'CAMPAIGN_002':
        // No pending contacts
        alert('No contacts to send campaign to');
        break;
        
      default:
        console.error(`Error (${code}): ${error}`);
    }
  }
  return response;
}
```

---

## 📱 Request/Response Examples

### Example 1: Complete Campaign Flow

**1. Connect WhatsApp**
```bash
POST http://localhost:5000/api/whatsapp/connect
Body: { "sessionName": "myApp_session" }
```

**2. Add Contacts**
```bash
POST http://localhost:5000/api/campaign/add-contacts
Body: {
  "campaign_id": 5,
  "user_id": 42,
  "contacts": ["919876543210", "911234567890"]
}
```

**3. Start Campaign**
```bash
POST http://localhost:5000/api/campaign/campaign/start/5
Body: { "messageTemplate": "Hi! Check out our offer today!" }
```

**4. Get Status (repeat every 5 seconds)**
```bash
GET http://localhost:5000/api/campaign/campaign/5/status
```

---

## 🔒 Data Validation

### Phone Numbers
- Format: 10-15 digit string
- Must be valid international format
- Examples: `919876543210`, `441234567890`, `14155552671`

### Session Name
- Alphanumeric only (a-z, A-Z, 0-9)
- Min 3 characters, Max 50 characters
- Examples: `session1`, `wsapp_bot`, `campaign_manager`

### Message Template
- Min 1 character, Max 4096 characters
- Can include template variables: `{{name}}`, `{{code}}`
- Plain text only

---

## 📊 Status Codes

| HTTP | Meaning | Common Causes |
|------|---------|--------------|
| 200 | Success | Request processed successfully |
| 202 | Accepted | Campaign started (async processing) |
| 400 | Bad Request | Invalid input data |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate contacts |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Backend issue |

---

## 🎨 Sample React Component

```jsx
import React, { useState, useEffect } from 'react';

export function WhatsAppCampaign() {
  const [sessionName, setSessionName] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [campaignStatus, setCampaignStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName })
      });
      const data = await response.json();
      
      if (data.success) {
        setQrCode(data.qr);
        // Poll for sessions every 3 seconds
        const interval = setInterval(async () => {
          const sessionsResponse = await fetch('http://localhost:5000/api/whatsapp/sessions');
          const sessionsData = await sessionsResponse.json();
          setSessions(sessionsData.data);
          
          if (sessionsData.data.some(s => s.sessionName === sessionName && s.connected)) {
            setQrCode(null);
            clearInterval(interval);
          }
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="campaign-container">
      <div className="session-connect">
        <input 
          value={sessionName} 
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="Enter session name"
        />
        <button onClick={handleConnect} disabled={isLoading}>
          {isLoading ? 'Connecting...' : 'Connect WhatsApp'}
        </button>
        {qrCode && <img src={qrCode} alt="QR Code" />}
      </div>

      <div className="sessions-list">
        <h3>Active Sessions</h3>
        {sessions.map(session => (
          <div key={session.sessionName} className="session-item">
            <span>{session.sessionName}</span>
            <span className={session.connected ? 'status-connected' : 'status-pending'}>
              {session.connected ? '✓ Connected' : '⏳ Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📋 Checklist Before Going Live

- [ ] API is running on correct port (5000)
- [ ] Database is connected
- [ ] CORS is properly configured for frontend domain
- [ ] Phone numbers are in correct format (10-15 digits)
- [ ] Message templates are under 4096 characters
- [ ] Session names are alphanumeric
- [ ] Error handling is implemented
- [ ] Progress monitoring is implemented
- [ ] Rate limits are considered

---

## 🆘 Troubleshooting

**Problem**: QR Code not displaying
- **Solution**: Ensure WhatsApp session has internet connection

**Problem**: Contacts not being added
- **Solution**: Verify phone numbers are in correct format (10-15 digits)

**Problem**: Campaign not starting
- **Solution**: Check if contacts exist for the campaign

**Problem**: Status not updating
- **Solution**: Verify campaign has started and has pending contacts

---

**Need Help?** Contact backend team with error code and endpoint details.
