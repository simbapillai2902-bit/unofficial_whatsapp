# Troubleshooting Guide - Common Issues & Solutions

## Issue 1: Server Won't Start

### Error
```
Error: Cannot find module 'express'
Error: EADDRINUSE: address already in use :::5000
```

### Solutions

**Missing dependencies:**
```bash
npm install
```

**Port 5000 in use:**
```bash
# Kill the process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# OR use different port
# Edit .env and change PORT=5001
```

---

## Issue 2: Database Connection Error

### Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
Error: No database selected
```

### Solutions

**Check MySQL is running:**
```bash
# Windows - Check Services
services.msc
# Look for MySQL80 or MySQL57

# OR start MySQL
mysqld
```

**Check database exists:**
```bash
mysql -u root -p
> SHOW DATABASES;
> USE multi_channel_whatsapp;
```

**Load schema if missing:**
```bash
mysql -u root -p multi_channel_whatsapp < DATABASE_SCHEMA.sql
```

**Check .env file:**
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=multi_channel_whatsapp
```

---

## Issue 3: Validation Errors

### Error
```
"Schema with external rules must use validateAsync()"
"campaignId format must be like camp_001"
```

### Solutions

**This is FIXED** ✅  
File: `src/validationMiddleware.js`

**Campaign ID Format:**
- ✅ Use: `camp_001`, `camp_002`, etc.
- ❌ Don't use: `1`, `2`, `campaign_001`

**Template or Plain Text:**
- Must provide EITHER `messageTemplate` OR `templateId`
- Cannot provide both or neither

**Example correct request:**
```bash
curl -X POST http://localhost:5000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": "Hello!"}'
```

---

## Issue 4: WhatsApp Session Not Connecting

### Error
```
Session connection failed
QR code not generated
Cannot send message - session disconnected
```

### Solutions

**1. Verify WhatsApp Desktop is installed:**
```bash
# Check if Whatsapp-web.js can access browser
# Make sure Node.js version is compatible
node --version
# Should be >= 14.0.0
```

**2. Check session files:**
```bash
# Look for session storage
ls -la .wwebjs_auth/
# Should contain session files for each session
```

**3. Scan QR code properly:**
- Generate QR via: `POST /api/whatsapp/connect`
- Scan with WhatsApp mobile
- Wait for "Connected" message
- Don't close the response while scanning

**4. Session expired:**
```bash
# Re-connect the session
POST /api/whatsapp/connect
{
  "sessionName": "session1"
}
```

---

## Issue 5: API Returns 500 Error

### Error
```
Status: 500
message: "Internal server error"
```

### Check Server Logs

Look for error messages in console:
- Check request path
- Check request body
- Check database query errors
- Check validation failures

### Common Causes

**1. Missing request body:**
```bash
# ❌ Wrong
curl -X POST http://localhost:5000/api/campaign/start/camp_001

# ✅ Correct
curl -X POST http://localhost:5000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": "Hello"}'
```

**2. Invalid campaign ID:**
```bash
# ❌ Wrong
POST /api/campaign/start/1

# ✅ Correct
POST /api/campaign/start/camp_001
```

**3. Campaign doesn't exist:**
```bash
# First create contacts
POST /api/campaign/add-contacts/camp_001
{
  "contacts": [
    {"name": "John", "number": "1234567890"}
  ]
}
```

---

## Issue 6: Messages Not Sending

### Error
```
Campaign started but no messages sent
Status shows pending forever
```

### Solutions

**1. Check campaign has contacts:**
```bash
GET /api/campaign/camp_001/status
```

Look for `totalContacts` > 0

**2. Check session is connected:**
```bash
GET /api/whatsapp/sessions
```

Should show `connected: true`

**3. Check message queue:**
- Look in database: `message_logs` table
- Check status: should be `pending` → `in_progress` → `sent`

**4. Check phone numbers format:**
- Must be valid WhatsApp numbers
- Format: country code + number (e.g., 91 for India)
- Example: `919876543210`

**5. Rate limiting:**
- Max 50 messages per minute
- Max 5 concurrent messages
- If sending 1000 messages, takes 20 minutes

---

## Issue 7: Template Not Saving

### Error
```
{
  "success": false,
  "error": "Failed to save template"
}
```

### Solutions

**Check required fields:**
```bash
POST /api/campaign/templates/save
{
  "user_id": 1,              # Required
  "template_name": "Promo",  # Required
  "template_type": "plainText",  # Required
  "template_content": "50% OFF",  # Required
  "variables": []             # Optional, but must be array
}
```

**Valid template types:**
- plainText
- buttonMessage
- linkMenu
- actionMenu
- infoCard
- productCard
- orderUpdate
- custom
- simpleMenu
- boxMenu

**Check user exists:**
- user_id must be valid user ID
- Check `users` table in database

---

## Issue 8: Template Not Found

### Error
```
{
  "success": false,
  "error": "Template not found"
}
```

### Solutions

**1. Verify template exists:**
```bash
GET /api/campaign/templates/5
# Should return template data
```

**2. Check template ID:**
```bash
GET /api/campaign/templates/user/1
# Lists all templates for user 1
```

**3. Verify user owns template:**
- Template must belong to the user_id
- Cannot use another user's template

---

## Issue 9: Database Lock Errors

### Error
```
Error: Deadlock detected
Error: Lock wait timeout exceeded
```

### Solutions

**1. Restart MySQL:**
```bash
# Windows Services
net stop MySQL80
net start MySQL80
```

**2. Check for long-running queries:**
```bash
mysql> SHOW PROCESSLIST;
# Look for processes running > 60 seconds
# Kill if needed: KILL <process_id>;
```

**3. Reduce concurrent operations:**
- Check p-queue config
- Max concurrent: currently 5
- Reduce if getting locks

---

## Issue 10: Port Already in Use

### Error
```
Error: listen EADDRINUSE: address already in use :::5000
```

### Solutions

**Option 1: Kill the process**
```bash
netstat -ano | findstr :5000
# Find <PID>
taskkill /PID <PID> /F
```

**Option 2: Use different port**
```bash
# Edit .env
PORT=5001

# Restart server
npm start
```

**Option 3: Wait a few seconds**
```bash
# Sometimes the port takes time to release
# Wait 30 seconds and try again
```

---

## Issue 11: JSON Parse Error

### Error
```
SyntaxError: Unexpected token < in JSON at position 0
Error parsing JSON response
```

### Solutions

**Check Content-Type header:**
```bash
# ✅ Correct
curl -X POST http://localhost:5000/api/campaign/templates/save \
  -H "Content-Type: application/json" \
  -d '{...}'

# ❌ Wrong
curl -X POST http://localhost:5000/api/campaign/templates/save \
  -d '{...}'
```

**Check JSON is valid:**
```bash
# Use online JSON validator
# Check for missing quotes, commas, brackets
```

**Check response is JSON:**
- Some errors return HTML error pages
- Check `Content-Type: application/json`

---

## Issue 12: Memory Leak

### Error
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
JavaScript heap out of memory
```

### Solutions

**Increase Node.js memory:**
```bash
node --max-old-space-size=4096 server.js
```

**Check for memory leaks:**
- Look for event listeners not being removed
- Check database connections are closed
- Check large arrays being kept in memory

**Restart server periodically:**
```bash
# In production, use PM2
npm install -g pm2
pm2 start server.js
```

---

## Quick Diagnostic Checklist

### ✅ Before Testing
- [ ] Node.js installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] Dependencies installed: `npm install`
- [ ] MySQL running: `mysql -u root`
- [ ] Database created: `SHOW DATABASES;`
- [ ] Schema loaded: Check tables exist
- [ ] .env file configured
- [ ] Port 5000 available: `netstat -ano | findstr :5000`

### ✅ When Testing
- [ ] Server started: `npm start`
- [ ] Health check passes: `GET /health`
- [ ] WhatsApp connected: `GET /api/whatsapp/sessions`
- [ ] Template saved: `POST /api/campaign/templates/save`
- [ ] Campaign created: `POST /api/campaign/add-contacts/camp_001`
- [ ] Campaign started: `POST /api/campaign/start/camp_001`

### ✅ When Debugging
- [ ] Check server console logs
- [ ] Check database for data
- [ ] Check request/response in network tab
- [ ] Verify JSON body format
- [ ] Verify campaign ID format: `camp_XXX`
- [ ] Verify phone numbers format: `countrycode + number`

---

## Getting Help

### Check these files
1. `COMPLETE_API_REFERENCE.md` - Full API documentation
2. `API_ENDPOINTS_QUICK_REFERENCE.md` - Quick lookup
3. `SYSTEM_ANALYSIS.md` - Technical details
4. `VALIDATION_FIXES_APPLIED.md` - Validation info
5. `DATABASE_SCHEMA.sql` - Database structure

### Server Logs
- Check console output
- Look for ERROR level messages
- Stack traces show exact line number

### Database Query
```bash
mysql -u root -p multi_channel_whatsapp

# Check contacts
SELECT * FROM campaign_contacts;

# Check templates
SELECT * FROM message_templates;

# Check messages sent
SELECT * FROM message_logs;

# Check campaign queue
SELECT * FROM campaign_queue;
```

---

## Status: ✅ Ready to Use

All known issues documented with solutions.

**Most common issue:** Wrong campaign ID format  
**Solution:** Use `camp_001`, `camp_002`, etc.

**Questions?** Check the documentation files or server logs.
