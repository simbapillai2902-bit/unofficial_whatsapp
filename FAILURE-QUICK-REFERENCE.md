# 🚨 Quick Failure Reference - All Scenarios

## When Your API Will FAIL ❌

### 1️⃣ VALIDATION FAILURES (400)

```
❌ Invalid Session Name
├─ session@123         (special chars)
├─ ab                  (too short)
├─ session 1           (space not allowed)
└─ Fix: Use alphanumeric only (session1)

❌ Invalid Phone Numbers
├─ 123                 (too short)
├─ 919876543210123     (too long)
├─ 919876543a10        (contains letters)
├─ 91-9876543210       (contains symbols)
└─ Fix: Use 10-15 digit format (919876543210)

❌ Empty Contacts
├─ contacts: []        (empty array)
└─ Fix: Add at least 1 contact

❌ Missing Fields
├─ Missing campaign_id
├─ Missing user_id
├─ Missing messageTemplate
└─ Fix: Include all required fields

❌ Empty Message
├─ messageTemplate: ""
└─ Fix: Add message content (min 1 char)
```

---

### 2️⃣ DATABASE FAILURES (500)

```
❌ MySQL Not Running
├─ Error: ECONNREFUSED
├─ Cause: MySQL service stopped
└─ Fix: Start MySQL

❌ Wrong Credentials
├─ Error: Access denied
├─ Cause: Wrong password in .env
└─ Fix: Update .env with correct password

❌ Database Doesn't Exist
├─ Error: Unknown database
├─ Cause: Database not created
└─ Fix: Run database-migration.sql

❌ Table Not Found
├─ Error: Table doesn't exist
├─ Cause: Schema not imported
└─ Fix: Reimport database-migration.sql

❌ Duplicate Contact
├─ Error: Duplicate entry
├─ Cause: Same phone number added twice
└─ Fix: Remove duplicates or use different campaign
```

---

### 3️⃣ WHATSAPP FAILURES

```
❌ Session Not Connected
├─ Status: connected: false
├─ Cause: QR code not scanned or phone offline
└─ Fix: Scan QR code again, ensure internet

❌ Session Creation Failed
├─ Error: Failed to create session
├─ Cause: Session name already exists
└─ Fix: Use unique session name

❌ WhatsApp Offline
├─ Error: Session timeout
├─ Cause: Phone internet lost
└─ Fix: Reconnect WhatsApp
```

---

### 4️⃣ CAMPAIGN FAILURES (404)

```
❌ No Pending Contacts
├─ Error: No pending contacts for this campaign
├─ Cause: Forgot to add contacts
└─ Fix: Add contacts BEFORE starting campaign

❌ Campaign Already Running
├─ Error: Previous campaign still processing
├─ Cause: Started multiple campaigns simultaneously
└─ Fix: Wait for previous to complete or use different campaign

❌ No WhatsApp Connected
├─ Error: Cannot start without WhatsApp
├─ Cause: WhatsApp session not connected
└─ Fix: Connect WhatsApp first
```

---

### 5️⃣ SERVER FAILURES (500)

```
❌ Server Crashed
├─ Error: Internal server error
├─ Cause: Unhandled exception
└─ Fix: Restart server (npm run dev)

❌ Connection Pool Exhausted
├─ Error: Too many connections
├─ Cause: Database connections not released
└─ Fix: Increase DB_POOL_MAX in .env

❌ Out of Memory
├─ Error: Process out of memory
├─ Cause: Too many large operations
└─ Fix: Process smaller batches
```

---

### 6️⃣ NETWORK FAILURES

```
❌ Server Not Running
├─ Error: ECONNREFUSED
├─ Cause: API server stopped
└─ Fix: npm run dev

❌ Wrong URL
├─ Error: Cannot connect to http://localhost:3000
├─ Cause: API running on 5000, not 3000
└─ Fix: Use http://localhost:5000

❌ CORS Blocked
├─ Error: CORS policy violation
├─ Cause: Frontend domain not allowed
└─ Fix: Add domain to ALLOWED_ORIGINS in .env

❌ Network Timeout
├─ Error: ETIMEDOUT
├─ Cause: Network slow or unreachable
└─ Fix: Retry with backoff strategy
```

---

### 7️⃣ RATE LIMITING FAILURES (429)

```
❌ Too Many Requests
├─ Error: Rate limit exceeded
├─ Cause: > 100 requests in 15 minutes
└─ Fix: Wait before making more requests

❌ User Rate Limited
├─ Error: User rate limit exceeded
├─ Cause: > 50 requests per 15 min from same user
└─ Fix: Space out requests

❌ Campaign Rate Limited
├─ Error: Campaign rate limit exceeded
├─ Cause: > 50 requests per minute
└─ Fix: Delay between campaign operations
```

---

### 8️⃣ TIMEOUT FAILURES (408)

```
❌ Request Timeout
├─ Error: Request timeout
├─ Cause: Operation took > 30 seconds
└─ Fix: Process smaller batches or increase timeout
```

---

## 🔴 When API WILL Fail - Decision Tree

```
START API CALL
    │
    ├─ Server running?
    │  ├─ NO → ECONNREFUSED (Start server: npm run dev)
    │  └─ YES ↓
    │
    ├─ Valid request format?
    │  ├─ NO → 400 VALIDATION_001 (Check input format)
    │  └─ YES ↓
    │
    ├─ Database connected?
    │  ├─ NO → 500 DB_ERROR (Start MySQL)
    │  └─ YES ↓
    │
    ├─ Valid data in database?
    │  ├─ NO → 500 DB_QUERY_ERROR (Check schema)
    │  └─ YES ↓
    │
    ├─ Duplicate data?
    │  ├─ YES → 409 CAMPAIGN_001 (Use unique data)
    │  └─ NO ↓
    │
    ├─ Pending contacts available?
    │  ├─ NO → 404 CAMPAIGN_002 (Add contacts first)
    │  └─ YES ↓
    │
    ├─ WhatsApp connected?
    │  ├─ NO → 500 SESSION_ERROR (Connect WhatsApp)
    │  └─ YES ↓
    │
    ├─ Rate limit exceeded?
    │  ├─ YES → 429 RATE_LIMIT_001 (Wait before retry)
    │  └─ NO ↓
    │
    ├─ Request timeout?
    │  ├─ YES → 408 TIMEOUT_001 (Retry with smaller data)
    │  └─ NO ↓
    │
    └─ ✅ SUCCESS 200 OK
```

---

## 📋 Common Failure Combinations

### Combination 1: Setup Issues
```
❌ FAILS: npm run dev
├─ MySQL not running
└─ Solution:
   1. Start MySQL
   2. Update .env credentials
   3. Run database-migration.sql
   4. npm run dev
```

### Combination 2: Adding Contacts Fails
```
❌ FAILS: POST /api/campaign/add-contacts
├─ Validation error (wrong phone format)
└─ Solution:
   1. Check phone numbers are 10-15 digits
   2. No letters or special characters
   3. Use format: "919876543210"
```

### Combination 3: Starting Campaign Fails
```
❌ FAILS: POST /api/campaign/campaign/start/1
├─ No pending contacts
└─ Solution:
   1. Add contacts first: POST /api/campaign/add-contacts
   2. Verify WhatsApp connected
   3. Then start campaign
```

### Combination 4: Campaign Shows No Progress
```
❌ FAILS: GET /api/campaign/campaign/1/status
├─ Campaign not running or WhatsApp offline
└─ Solution:
   1. Check WhatsApp is connected
   2. Verify campaign started successfully
   3. Check database has contacts
```

---

## 🆘 Troubleshooting Flow

```
Problem: API Returns Error
   │
   ├─ Is it 400? (Validation)
   │  └─ Check input format
   │
   ├─ Is it 404? (Not Found)
   │  └─ Check resource exists
   │
   ├─ Is it 409? (Conflict)
   │  └─ Check for duplicates
   │
   ├─ Is it 429? (Rate Limited)
   │  └─ Wait and retry
   │
   ├─ Is it 500? (Server Error)
   │  ├─ Check server logs
   │  ├─ Is MySQL running?
   │  ├─ Restart server
   │  └─ Check .env credentials
   │
   └─ Is it ECONNREFUSED?
      └─ Start server (npm run dev)
```

---

## ⏱️ Timing Issues

### When requests fail due to timing:

```
❌ ECONNREFUSED
├─ Cause: Server not fully started yet
└─ Fix: Wait 3-5 seconds after npm run dev

❌ Database Connection Failed
├─ Cause: MySQL not fully started
└─ Fix: Wait 2-3 seconds after MySQL start

❌ WhatsApp not connected
├─ Cause: QR code needs time to process
└─ Fix: Wait 5-10 seconds after scanning

❌ Campaign slow to start
├─ Cause: Large number of contacts
└─ Fix: Wait 10-30 seconds or process smaller batches
```

---

## 🎯 Error Recovery Strategy

```
1️⃣ IDENTIFY
   What error code?
   What is the message?
   When did it happen?

2️⃣ CLASSIFY
   Is it validation? (400)
   Is it not found? (404)
   Is it server? (500)
   Is it network? (ECONNREFUSED)

3️⃣ LOCATE
   Which endpoint?
   What parameters?
   What operation?

4️⃣ FIX
   For 400: Fix input format
   For 404: Add missing resource
   For 409: Remove duplicates
   For 500: Check server/database
   For network: Start server/MySQL

5️⃣ RETRY
   Same parameters
   Possibly with backoff delay
   If still fails, escalate
```

---

## 📊 Failure Rate by Cause

### Most Common Failures (What Usually Breaks)

```
1. Validation errors (40%)
   ├─ Wrong phone format
   ├─ Missing fields
   └─ Invalid session name

2. Database errors (25%)
   ├─ MySQL not running
   ├─ Wrong credentials
   └─ Schema not imported

3. WhatsApp errors (20%)
   ├─ Not connected
   ├─ Session timeout
   └─ Phone offline

4. Network errors (10%)
   ├─ Server not running
   ├─ CORS issues
   └─ Connection timeout

5. Other (5%)
   ├─ Rate limiting
   ├─ Server crash
   └─ Unknown errors
```

---

## ✅ How to AVOID Failures

```
✓ Validation Errors
  └─ Validate input BEFORE sending to API

✓ Database Errors
  └─ Ensure MySQL running before API start

✓ WhatsApp Errors
  └─ Connect WhatsApp BEFORE starting campaign

✓ Campaign Errors
  └─ Add contacts BEFORE starting campaign

✓ Network Errors
  └─ Keep server running (npm run dev)

✓ Timeout Errors
  └─ Process data in smaller batches

✓ Rate Limit Errors
  └─ Add delays between requests

✓ Server Errors
  └─ Monitor error logs regularly
```

---

## 🧪 Test Failure Cases

### Test Case 1: Invalid Phone
```bash
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["123"]  # ❌ Too short
  }'

Expected: 400 Validation Error ✓
```

### Test Case 2: No Contacts Added
```bash
curl -X POST http://localhost:5000/api/campaign/campaign/start/999 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": "Hello"}'

Expected: 404 No pending contacts ✓
```

### Test Case 3: Server Down
```bash
curl http://localhost:5000/health

Expected: ECONNREFUSED ✓
(Then start server)
```

---

## 📞 When to Contact Support

❌ **Don't know error code?**
→ Check API-FAILURE-SCENARIOS.md

❌ **Input validation failing?**
→ Check input format in API-QUICK-REFERENCE.md

❌ **Database not connecting?**
→ Check MySQL setup in SETUP-AND-API-GUIDE.md

❌ **Server won't start?**
→ Check STEP-BY-STEP-GUIDE.md

❌ **Still broken?**
→ Check error logs: npm run dev

---

## 🎯 Summary

**Your API will FAIL when:**

1. ❌ Input validation fails → 400 Error
2. ❌ Resource doesn't exist → 404 Error
3. ❌ Duplicate data exists → 409 Error
4. ❌ Too many requests → 429 Error
5. ❌ Database not available → 500 Error
6. ❌ Server not running → ECONNREFUSED
7. ❌ WhatsApp not connected → Session Error
8. ❌ Request times out → 408 Error

**How to handle:**
- ✅ Validate input before sending
- ✅ Add error handling (try-catch)
- ✅ Implement retry logic
- ✅ Check logs for details
- ✅ Follow recovery strategy

**Remember:**
🚀 Most failures are preventable with proper validation!
📊 Monitor logs to catch issues early
🔄 Implement retry logic for transient errors
📱 Keep WhatsApp/database/server running

---

**Know your failures, prevent them! 💪**
