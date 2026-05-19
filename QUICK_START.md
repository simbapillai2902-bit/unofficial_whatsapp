# Quick Start Guide - Multi-Channel WhatsApp System

## 🚀 Get Started in 5 Minutes

### Step 1: Install & Setup (2 minutes)
```bash
# Navigate to project
cd unofficial_whatsapp

# Install dependencies
npm install

# Verify MySQL is running
mysql -u root -p
> SELECT 1;
> exit;

# Load database schema (if not already loaded)
mysql -u root -p multi_channel_whatsapp < DATABASE_SCHEMA.sql
```

### Step 2: Start Server (1 minute)
```bash
npm start
```

**Expected output:**
```
✓ Express app configured successfully
✓ Session cleanup started
✓ Server is running on port 5000
✓ Database connection pool initialized
```

### Step 3: Test API (2 minutes)
```bash
# Test 1: Health Check
curl http://localhost:5000/health

# Test 2: Connect WhatsApp
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session1"}'

# Scan the QR code with WhatsApp mobile app
# Wait for "Connected" message
```

---

## 📋 Complete Flow (Step by Step)

### 1️⃣ Create WhatsApp Session
```bash
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session1"}'
```

**Response:**
```json
{
  "success": true,
  "sessionName": "session1",
  "qr": "data:image/png;base64,...",
  "connected": false,
  "message": "Scan the QR code with WhatsApp"
}
```

**Action:** Scan QR code with WhatsApp mobile → Wait for connected status

---

### 2️⃣ Add Contacts to Campaign
```bash
curl -X POST http://localhost:5000/api/campaign/add-contacts/camp_001 \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"name": "John", "number": "919876543210"},
      {"name": "Jane", "number": "919876543211"},
      {"name": "Bob", "number": "919876543212"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "3 contacts added to campaign camp_001",
  "campaignId": "camp_001",
  "addedCount": 3
}
```

---

### 3️⃣ Option A: Send Plain Text Message
```bash
curl -X POST http://localhost:5000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": "Hello! Check our offers today!"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign started successfully",
  "campaignId": "camp_001",
  "totalContacts": 3,
  "messageType": "plainText"
}
```

---

### 3️⃣ Option B: Send Template Message

**First, create a template:**
```bash
curl -X POST http://localhost:5000/api/campaign/templates/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Summer Sale 2026",
    "template_type": "plainText",
    "template_content": "🎉 50% OFF Summer Sale! 🎉 Limited time only!",
    "variables": []
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Template saved successfully",
  "templateId": 5,
  "templateName": "Summer Sale 2026"
}
```

**Then, start campaign with template:**
```bash
curl -X POST http://localhost:5000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"templateId": 5}'
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign started successfully",
  "campaignId": "camp_001",
  "totalContacts": 3,
  "messageType": "template",
  "templateId": 5
}
```

---

### 4️⃣ Check Campaign Status
```bash
curl http://localhost:5000/api/campaign/camp_001/status
```

**Response:**
```json
{
  "success": true,
  "campaignId": "camp_001",
  "totalContacts": 3,
  "sent": 2,
  "pending": 1,
  "failed": 0,
  "status": "in_progress"
}
```

---

### 5️⃣ Get All Templates for User
```bash
curl http://localhost:5000/api/campaign/templates/user/1
```

**Response:**
```json
{
  "success": true,
  "userId": 1,
  "templates": [
    {
      "templateId": 5,
      "templateName": "Summer Sale 2026",
      "templateType": "plainText",
      "templateContent": "🎉 50% OFF Summer Sale! 🎉",
      "createdAt": "2026-05-19T13:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## 📚 All 13 API Endpoints

### WhatsApp Sessions (3 endpoints)
```
POST   /api/whatsapp/connect              - Create new session
GET    /api/whatsapp/sessions             - Get all sessions
POST   /api/whatsapp/logout/{sessionName} - Logout session
```

### Templates (5 endpoints) ⭐ NEW
```
POST   /api/campaign/templates/save               - Create template
GET    /api/campaign/templates/user/{userId}     - List user templates
GET    /api/campaign/templates/{templateId}      - Get template details
PUT    /api/campaign/templates/{templateId}      - Update template
DELETE /api/campaign/templates/{templateId}      - Delete template
```

### Campaigns (4 endpoints)
```
POST   /api/campaign/add-contacts/{campaignId}   - Add contacts
POST   /api/campaign/start/{campaignId}          - Start campaign
GET    /api/campaign/{campaignId}/status         - Get status
```

### Health (1 endpoint)
```
GET    /health                            - Health check
```

---

## 🎯 Key Rules to Remember

### Campaign ID Format
✅ Use: `camp_001`, `camp_002`, etc.  
❌ Don't use: `1`, `2`, `campaign_1`

### Phone Number Format
✅ Use: `919876543210` (country code + number)  
❌ Don't use: `9876543210`, `91-9876543210`

### Template or Plain Text (Choose One)
```json
{
  "messageTemplate": "Hello!"  // OR
  "templateId": 5              // Use ONE of these
}
```

### Always Include Headers
```bash
-H "Content-Type: application/json"
```

---

## 📊 Example Request/Response Pairs

### Example 1: Save Template
**Request:**
```bash
curl -X POST http://localhost:5000/api/campaign/templates/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Promotion",
    "template_type": "plainText",
    "template_content": "Special offer just for you!",
    "variables": []
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Template saved successfully",
  "templateId": 5
}
```

---

### Example 2: Get All Templates
**Request:**
```bash
curl http://localhost:5000/api/campaign/templates/user/1
```

**Response:**
```json
{
  "success": true,
  "userId": 1,
  "templates": [
    {
      "templateId": 5,
      "templateName": "Promotion",
      "templateType": "plainText",
      "templateContent": "Special offer just for you!"
    }
  ],
  "count": 1
}
```

---

### Example 3: Add Contacts
**Request:**
```bash
curl -X POST http://localhost:5000/api/campaign/add-contacts/camp_001 \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"name": "Alice", "number": "919876543210"},
      {"name": "Bob", "number": "919876543211"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "2 contacts added to campaign camp_001",
  "addedCount": 2
}
```

---

### Example 4: Start Campaign
**Request:**
```bash
curl -X POST http://localhost:5000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"templateId": 5}'
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign started successfully",
  "campaignId": "camp_001",
  "totalContacts": 2,
  "templateId": 5
}
```

---

## ✅ Verification Checklist

### Before You Start
- [ ] Node.js installed
- [ ] MySQL running
- [ ] npm packages installed: `npm install`
- [ ] .env file configured
- [ ] Database schema loaded

### After Server Starts
- [ ] `npm start` runs without errors
- [ ] Server listening on port 5000
- [ ] Database connection successful
- [ ] Health check returns 200

### When Testing
- [ ] WhatsApp session connects
- [ ] QR code generated and scanned
- [ ] Contacts added successfully
- [ ] Template saved successfully
- [ ] Campaign started successfully
- [ ] Messages send to contacts

---

## 🐛 Common Issues & Fixes

### Issue: "campaignId format must be like camp_001"
**Fix:** Use `camp_001` format, not `1`
```bash
# ❌ Wrong
POST /api/campaign/start/1

# ✅ Correct
POST /api/campaign/start/camp_001
```

### Issue: "Cannot find database"
**Fix:** Load schema or check database name
```bash
mysql -u root -p multi_channel_whatsapp < DATABASE_SCHEMA.sql
```

### Issue: "Session not connected"
**Fix:** Scan QR code properly
```bash
# Generate new QR
POST /api/whatsapp/connect
# Scan with WhatsApp mobile
# Wait for connected status
```

### Issue: Port 5000 already in use
**Fix:** Kill process or use different port
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `COMPLETE_API_REFERENCE.md` | Full API documentation |
| `API_ENDPOINTS_QUICK_REFERENCE.md` | Quick endpoint lookup |
| `VALIDATION_FIXES_APPLIED.md` | Validation info |
| `TROUBLESHOOTING_GUIDE.md` | Detailed troubleshooting |
| `SYSTEM_ANALYSIS.md` | Technical architecture |
| `DATABASE_SCHEMA.sql` | Database structure |

---

## 🎓 Learning Path

1. **Start Here:** This file (5 min read)
2. **Quick Lookup:** `API_ENDPOINTS_QUICK_REFERENCE.md` (2 min)
3. **Full Details:** `COMPLETE_API_REFERENCE.md` (10 min)
4. **Architecture:** `SYSTEM_ANALYSIS.md` (10 min)
5. **Troubleshoot:** `TROUBLESHOOTING_GUIDE.md` (as needed)

---

## 🚀 You're Ready!

### Start Server
```bash
npm start
```

### Test API
Use the examples above to test endpoints

### Review Docs
Check `COMPLETE_API_REFERENCE.md` for full details

### Deploy
System is production-ready! 🎉

---

## 📞 Quick Reference Commands

```bash
# Start server
npm start

# Test health
curl http://localhost:5000/health

# Connect WhatsApp
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session1"}'

# Add contacts
curl -X POST http://localhost:5000/api/campaign/add-contacts/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"contacts": [{"name": "John", "number": "919876543210"}]}'

# Save template
curl -X POST http://localhost:5000/api/campaign/templates/save \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "template_name": "Test", "template_type": "plainText", "template_content": "Hello!", "variables": []}'

# Start campaign with template
curl -X POST http://localhost:5000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"templateId": 1}'

# Start campaign with plain text
curl -X POST http://localhost:5000/api/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": "Hello everyone!"}'

# Check status
curl http://localhost:5000/api/campaign/camp_001/status
```

---

## ✨ Summary

✅ **13 API endpoints ready**  
✅ **Template management included**  
✅ **Plain text messaging supported**  
✅ **Validation all fixed**  
✅ **Production ready**  
✅ **Fully documented**  

**Happy messaging! 🎉**
