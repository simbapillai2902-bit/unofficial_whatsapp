# 🚨 API Failure Scenarios & Error Handling

**Important**: Know when and why your APIs will fail, and how to handle each case.

---

## 📋 Table of Contents

1. [Validation Errors](#validation-errors)
2. [Database Errors](#database-errors)
3. [WhatsApp Connection Errors](#whatsapp-connection-errors)
4. [Campaign Errors](#campaign-errors)
5. [Server Errors](#server-errors)
6. [Network Errors](#network-errors)
7. [Rate Limiting Errors](#rate-limiting-errors)
8. [Timeout Errors](#timeout-errors)
9. [Error Handling Best Practices](#error-handling-best-practices)

---

## 🔴 Validation Errors (400 Bad Request)

### Error 1: Invalid Session Name
**When it fails:**
- Session name contains special characters: `session@123`, `session-1`, `session 1`
- Session name too short: `ab`, `x`
- Session name too long: > 50 characters
- Session name empty: `""`

**Error Response:**
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

**HTTP Status**: 400

**How to fix:**
```javascript
// ❌ WRONG
sessionName: "session@123"  // Special characters not allowed
sessionName: "ab"           // Too short (min 3)
sessionName: "session 1"    // Space not allowed

// ✅ CORRECT
sessionName: "session1"     // Alphanumeric only
sessionName: "wsapp_bot"    // Letters and numbers
sessionName: "campaign123"  // Any alphanumeric combination
```

---

### Error 2: Invalid Phone Numbers
**When it fails:**
- Phone number too short: `123`, `1234567`
- Phone number too long: > 15 digits
- Phone number contains letters: `919876543a10`
- Phone number contains symbols: `91-9876543210`
- Phone number starts with 0: `09876543210`

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.contacts.0",
      "message": "\"contacts[0]\" must match pattern /^[1-9]\\d{9,14}$/"
    }
  ]
}
```

**HTTP Status**: 400

**How to fix:**
```javascript
// ❌ WRONG
contacts: ["123"]                    // Too short
contacts: ["919876543210123"]        // Too long (> 15 digits)
contacts: ["919876543a10"]           // Contains letters
contacts: ["91-9876543210"]          // Contains symbols
contacts: ["09876543210"]            // Starts with 0

// ✅ CORRECT
contacts: ["919876543210"]           // 12 digits (India)
contacts: ["441234567890"]           // 12 digits (UK)
contacts: ["14155552671"]            // 11 digits (US)
contacts: ["33123456789"]            // 11 digits (France)
```

---

### Error 3: Empty Contacts Array
**When it fails:**
- No contacts provided: `[]`
- More than 1000 contacts: > 1000

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.contacts",
      "message": "\"contacts\" must contain at least 1 items"
    }
  ]
}
```

**HTTP Status**: 400

**How to fix:**
```javascript
// ❌ WRONG
contacts: []                         // Empty
contacts: Array(1001).fill(i => i)  // More than 1000

// ✅ CORRECT
contacts: ["919876543210"]           // At least 1
contacts: ["919876543210", "911234567890"]  // 2 contacts
// Split into multiple requests if more than 1000
```

---

### Error 4: Missing Required Fields
**When it fails:**
- Missing `campaign_id`
- Missing `user_id`
- Missing `messageTemplate`
- Missing `sessionName`

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_001",
  "details": [
    {
      "field": "body.campaign_id",
      "message": "\"campaign_id\" is required"
    }
  ]
}
```

**HTTP Status**: 400

**How to fix:**
```javascript
// ❌ WRONG
{
  user_id: 100,
  contacts: ["919876543210"]
  // Missing: campaign_id
}

// ✅ CORRECT
{
  campaign_id: 1,
  user_id: 100,
  contacts: ["919876543210"]
}
```

---

### Error 5: Empty Message Template
**When it fails:**
- Message is empty: `""`
- Message is too long: > 4096 characters

**Error Response:**
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

**HTTP Status**: 400

**How to fix:**
```javascript
// ❌ WRONG
messageTemplate: ""                          // Empty
messageTemplate: "a".repeat(5000)            // Too long

// ✅ CORRECT
messageTemplate: "Hello! Welcome"            // Normal
messageTemplate: "Hi {{name}}, your code is {{code}}"  // With variables
```

---

## 🔴 Database Errors (500 Server Error)

### Error 1: Database Connection Failed
**When it fails:**
- MySQL server is not running
- Wrong database credentials in `.env`
- Network unable to reach database
- Database doesn't exist
- User doesn't have permissions

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to connect to database",
  "code": "DB_CONNECTION_ERROR"
}
```

**HTTP Status**: 500

**Symptoms:**
```bash
# In server logs:
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**How to fix:**
```bash
# 1. Check MySQL is running
mysql -u root -p

# 2. Verify credentials in .env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bulk_message
DB_USER=root
DB_PASS=your_password

# 3. Check database exists
mysql -u root -p
SHOW DATABASES;

# 4. Test connection
mysql -h 127.0.0.1 -u root -p bulk_message
```

---

### Error 2: Database Query Failed
**When it fails:**
- Table doesn't exist
- Column doesn't exist
- SQL syntax error
- Database corrupted

**Error Response:**
```json
{
  "success": false,
  "error": "Database query failed",
  "code": "DB_QUERY_ERROR"
}
```

**HTTP Status**: 500

**Symptoms:**
```bash
# In server logs:
Error: ER_NO_SUCH_TABLE: Table 'bulk_message.campaign_queue' doesn't exist
```

**How to fix:**
```bash
# Reimport database schema
mysql -u root -p bulk_message < database-migration.sql
```

---

### Error 3: Duplicate Contacts
**When it fails:**
- Same phone number added twice to same campaign
- Contact already exists in database

**Error Response:**
```json
{
  "success": false,
  "error": "Some contacts already exist",
  "code": "CAMPAIGN_001"
}
```

**HTTP Status**: 409 (Conflict)

**How to fix:**
```javascript
// Remove duplicates before sending
const uniqueContacts = [...new Set(contacts)];

// Or use different campaign
{
  campaign_id: 2,  // Different campaign
  user_id: 100,
  contacts: ["919876543210"]
}
```

---

## 🟠 WhatsApp Connection Errors

### Error 1: WhatsApp Session Not Connected
**When it fails:**
- User scanned QR but phone is offline
- WhatsApp not installed on phone
- Phone's internet is down
- Phone blocked the connection
- Session timed out

**Error Response:**
```json
{
  "success": true,
  "sessionName": "session1",
  "connected": false,
  "qr": "data:image/png;base64,...",
  "message": "Scan the QR code"
}
```

**HTTP Status**: 200 (but connected: false)

**How to fix:**
```javascript
// Check if connected before starting campaign
const sessions = await fetch('http://localhost:5000/api/whatsapp/sessions');
const data = await sessions.json();
const isConnected = data.data.some(s => s.connected);

if (!isConnected) {
  console.log("WhatsApp not connected yet");
  // Wait and try again
}
```

---

### Error 2: Failed to Create Session
**When it fails:**
- Session name already exists
- Too many sessions created
- WhatsApp library error
- Authentication error

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to create session",
  "code": "SESSION_001"
}
```

**HTTP Status**: 500

**How to fix:**
```javascript
// Use unique session names
sessionName: "session_" + Date.now()  // Unique name
sessionName: "campaign_" + userId     // Based on user

// Or use existing session
const sessions = await getSessions();
if (sessions.some(s => s.sessionName === "session1")) {
  // Session already exists, reuse it
}
```

---

### Error 3: Session Timeout
**When it fails:**
- Session idle for 24+ hours
- Server restarted
- Phone disconnected

**How to fix:**
```javascript
// Reconnect before using
const session = await connectWhatsApp("session1");
if (!session.connected) {
  // Wait for QR scan again
}
```

---

## 🔴 Campaign Errors

### Error 1: No Pending Contacts
**When it fails:**
- No contacts added to campaign
- All contacts already sent
- All contacts failed

**Error Response:**
```json
{
  "success": false,
  "error": "No pending contacts for this campaign",
  "code": "CAMPAIGN_002"
}
```

**HTTP Status**: 404

**How to fix:**
```javascript
// 1. Add contacts first
await addCampaignContacts(campaignId, userId, contacts);

// 2. Then start campaign
await startCampaign(campaignId, messageTemplate);

// 3. Check status
const status = await getCampaignStatus(campaignId);
if (status.data.pending > 0) {
  // Safe to start
}
```

---

### Error 2: Campaign Already Running
**When it fails:**
- Campaign already in progress
- Previous campaign not finished

**How to check:**
```javascript
// Check status before starting
const status = await getCampaignStatus(campaignId);
if (status.data.pending > 0) {
  console.log("Campaign already running");
  // Wait or use different campaign
}
```

---

### Error 3: WhatsApp Session Not Available
**When it fails:**
- WhatsApp not connected when starting campaign
- Session timed out
- Phone went offline

**How to fix:**
```javascript
// Verify WhatsApp is connected
const sessions = await getSessions();
const connected = sessions.data.filter(s => s.connected);

if (connected.length === 0) {
  console.log("No WhatsApp connected");
  // Reconnect first
}
```

---

## 🔴 Server Errors (500 Internal Server Error)

### Error 1: Server Crashed
**When it fails:**
- Unhandled exception
- Out of memory
- Critical error

**Error Response:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

**HTTP Status**: 500

**How to fix:**
```bash
# Check server logs
# Restart server
npm run dev
```

---

### Error 2: Database Pool Exhausted
**When it fails:**
- Too many concurrent connections
- Database not releasing connections
- Connection timeout

**Error Response:**
```json
{
  "success": false,
  "error": "Connection pool error"
}
```

**HTTP Status**: 500

**How to fix:**
```env
# In .env, increase pool size
DB_POOL_MAX=30           # Increase from 20
DB_POOL_TIMEOUT=60000    # Increase from 30000
```

---

## 🟡 Network Errors

### Error 1: Network Timeout
**When it fails:**
- Request takes too long (> 30 seconds)
- Internet connection lost
- Server unresponsive

**Error Response:**
```
Error: ETIMEDOUT
```

**HTTP Status**: 408 (Request Timeout)

**How to fix:**
```javascript
// Add timeout to requests
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch('http://localhost:5000/api/endpoint', {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

---

### Error 2: Connection Refused
**When it fails:**
- API server not running
- Wrong API URL
- Wrong port

**Error Response:**
```
Error: ECONNREFUSED 127.0.0.1:5000
```

**HTTP Status**: N/A

**How to fix:**
```bash
# 1. Check server is running
npm run dev

# 2. Check port
curl http://localhost:5000/health

# 3. Verify URL
http://localhost:5000  # Correct
http://localhost:3000  # Wrong (if server on 5000)
```

---

### Error 3: CORS Error (Blocked by Browser)
**When it fails:**
- Frontend on different domain
- CORS not configured
- Wrong origin

**Error Response (in browser console):**
```
Access to XMLHttpRequest at 'http://localhost:5000/api/endpoint'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**HTTP Status**: N/A

**How to fix:**
```env
# In .env, add frontend URL to CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Or in production
ALLOWED_ORIGINS=https://myapp.com
```

---

## 🟡 Rate Limiting Errors (429 Too Many Requests)

### Error 1: Global Rate Limit Exceeded
**When it fails:**
- More than 100 requests in 15 minutes
- Sending requests too fast

**Error Response:**
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_001",
  "retryAfter": 1626123456789
}
```

**HTTP Status**: 429

**How to fix:**
```javascript
// Add delay between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

for (const contact of contacts) {
  await addContact(contact);
  await sleep(1000);  // Wait 1 second between requests
}
```

---

### Error 2: User Rate Limit Exceeded
**When it fails:**
- Same user making > 50 requests in 15 minutes
- Rapid API calls from same user

**Error Response:**
```json
{
  "success": false,
  "error": "User rate limit exceeded",
  "code": "RATE_LIMIT_002"
}
```

**HTTP Status**: 429

**How to fix:**
```javascript
// Implement exponential backoff
async function apiCallWithBackoff(url, options, maxRetries = 3) {
  let delay = 1000; // Start with 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 429) return response;
      
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Double the delay
      }
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }
  }
}
```

---

## 🔴 Timeout Errors (408 Request Timeout)

### Error 1: Request Timeout
**When it fails:**
- Request takes longer than 30 seconds
- Server processing is slow
- Database query is slow

**Error Response:**
```json
{
  "success": false,
  "error": "Request timeout",
  "code": "TIMEOUT_001",
  "requestId": "abc123"
}
```

**HTTP Status**: 408

**How to fix:**
```env
# In .env, increase timeout
REQUEST_TIMEOUT_MS=60000  # Increase from 30000
```

---

### Error 2: Campaign Processing Timeout
**When it fails:**
- Too many contacts to send
- Network is slow
- WhatsApp is slow

**How to fix:**
```javascript
// Split into smaller batches
const batchSize = 100;
for (let i = 0; i < contacts.length; i += batchSize) {
  const batch = contacts.slice(i, i + batchSize);
  await addCampaignContacts(campaignId, userId, batch);
  
  // Wait before next batch
  await new Promise(r => setTimeout(r, 5000));
}
```

---

## ✅ Error Handling Best Practices

### 1. Always Check Response
```javascript
const response = await fetch(url, options);
if (!response.ok) {
  const error = await response.json();
  console.error(error);
  // Handle error
}
```

### 2. Use Try-Catch
```javascript
try {
  const result = await apiCall();
  console.log(result);
} catch (error) {
  console.error("API Error:", error.message);
  // Show user-friendly error
}
```

### 3. Check Response.success
```javascript
const data = await response.json();
if (!data.success) {
  console.error(data.error);
  console.error(data.details);
  // Handle each error type
}
```

### 4. Implement Retry Logic
```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
const result = await apiCallWithRetry(() => 
  fetch('http://localhost:5000/api/endpoint')
);
```

### 5. Validate Input Before Sending
```javascript
function validateContact(phone) {
  if (typeof phone !== 'string') return false;
  if (!/^[1-9]\d{9,14}$/.test(phone)) return false;
  return true;
}

// Use before API call
const validContacts = contacts.filter(validateContact);
```

### 6. Handle Each Error Type
```javascript
async function handleApiError(error) {
  switch (error.code) {
    case 'VALIDATION_001':
      console.error('Input validation failed:', error.details);
      break;
    
    case 'SESSION_001':
      console.error('WhatsApp session error');
      break;
    
    case 'CAMPAIGN_002':
      console.error('No pending contacts');
      break;
    
    case 'RATE_LIMIT_001':
      console.error('Too many requests, retry later');
      break;
    
    case 'TIMEOUT_001':
      console.error('Request timed out');
      break;
    
    default:
      console.error('Unknown error:', error);
  }
}
```

### 7. Add Logging
```javascript
// Log all API calls
async function apiCall(method, endpoint, body) {
  console.log(`[${new Date().toISOString()}] ${method} ${endpoint}`);
  
  try {
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    console.log(`Response (${response.status}):`, data);
    
    return data;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}
```

---

## 📊 Error Code Reference

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| VALIDATION_001 | 400 | Invalid input | Check request format |
| VALIDATION_002 | 500 | Validation error | Check server logs |
| SESSION_001 | 500 | Session creation failed | Try again or use different name |
| CAMPAIGN_001 | 409 | Duplicate contacts | Use different contacts |
| CAMPAIGN_002 | 404 | No pending contacts | Add contacts first |
| RATE_LIMIT_001 | 429 | Global rate limit | Wait before retrying |
| RATE_LIMIT_002 | 429 | User rate limit | Wait before retrying |
| RATE_LIMIT_003 | 429 | Campaign rate limit | Wait before retrying |
| TIMEOUT_001 | 408 | Request timeout | Retry with larger timeout |
| NOT_FOUND | 404 | Endpoint not found | Check URL |
| DB_ERROR | 500 | Database error | Check MySQL |
| ECONNREFUSED | N/A | Server not running | Start with npm run dev |

---

## 🎯 Common Failure Scenarios

### Scenario 1: Adding Contacts Fails
```
❌ Error: Validation failed
   Reason: Invalid phone number format
   
Solution:
1. Phone must be 10-15 digits
2. No letters or special characters
3. Cannot start with 0

Example: "919876543210" ✅
```

### Scenario 2: Starting Campaign Fails
```
❌ Error: No pending contacts for this campaign
   Reason: No contacts added before starting
   
Solution:
1. Add contacts first: POST /api/campaign/add-contacts
2. Then start: POST /api/campaign/campaign/start/1
```

### Scenario 3: WhatsApp Not Connecting
```
❌ Error: Session not connected
   Reason: QR code not scanned or internet down
   
Solution:
1. Ensure phone has internet
2. Scan QR code with WhatsApp
3. Wait 5-10 seconds for connection
```

### Scenario 4: Database Connection Error
```
❌ Error: Failed to connect to database
   Reason: MySQL not running
   
Solution:
1. Check MySQL: mysql -u root -p
2. Update .env credentials
3. Restart server: npm run dev
```

---

## 💡 Prevention Tips

1. **Always validate input** before sending to API
2. **Check API is running** before making requests
3. **Verify WhatsApp is connected** before starting campaign
4. **Add contacts first** before starting campaign
5. **Use appropriate delays** between batch operations
6. **Implement retry logic** for network errors
7. **Monitor error logs** for patterns
8. **Test error scenarios** before production

---

**Know your failures, handle them gracefully! 🚀**
