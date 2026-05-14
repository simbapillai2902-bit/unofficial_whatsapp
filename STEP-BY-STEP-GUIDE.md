# 📖 Step-by-Step Guide: Setup, Run, and Share APIs

## 🎯 Your Goal
- ✅ Run the application locally
- ✅ Test all APIs
- ✅ Share API documentation with frontend engineers

---

## 📋 Prerequisites

Before starting, make sure you have:
- Node.js v16+ (`node --version`)
- MySQL 8.0+ running (`mysql --version`)
- npm v7+ (`npm --version`)

### Check Prerequisites
```bash
node --version          # Should be v16 or higher
npm --version           # Should be v7 or higher
mysql --version         # Should be v8 or higher
```

---

## 🚀 STEP 1: Install Dependencies (2 minutes)

### In Terminal:
```bash
cd c:\Users\dell\Desktop\presflog\multi-channel
npm install
```

### What it does:
- Downloads all required packages
- Installs Express, MySQL driver, WhatsApp library, etc.
- Creates `node_modules` folder

### Expected output:
```
added X packages in Y seconds
```

✅ **Step 1 Complete!**

---

## 🔧 STEP 2: Configure Database (3 minutes)

### 2A. Update .env File

**Open file**: `.env` (in project root)

**Find these lines and update with your MySQL credentials:**
```env
DB_HOST=127.0.0.1          # MySQL host (usually localhost)
DB_PORT=3306               # MySQL port (usually 3306)
DB_NAME=bulk_message       # Database name
DB_USER=root               # MySQL username
DB_PASS=your_password      # Your MySQL password
```

**Example (with actual values):**
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bulk_message
DB_USER=root
DB_PASS=MyPassword123
```

### 2B. Create Database

**Open Terminal and connect to MySQL:**
```bash
mysql -u root -p
```
(Enter your MySQL password)

**Inside MySQL:**
```sql
CREATE DATABASE bulk_message;
EXIT;
```

### 2C. Import Database Schema

**Back in Terminal:**
```bash
mysql -u root -p bulk_message < database-migration.sql
```
(Enter your MySQL password)

✅ **Step 2 Complete!**

---

## ▶️ STEP 3: Start the Server (1 minute)

### In Terminal:
```bash
npm run dev
```

### Expected output:
```
Server is running on port 5000
Database connected
Express app configured successfully
```

### ✅ Server is now running!

Leave this terminal window open while testing.

---

## 🧪 STEP 4: Test the API (5 minutes)

### Open a NEW terminal window (keep first one running)

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-14T16:30:00.000Z",
  "uptime": 12.345,
  "memory": { ... }
}
```

✅ **If you see this, API is working!**

---

### Test 2: Connect WhatsApp
```bash
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"test_session"}'
```

**Expected Response:**
```json
{
  "success": true,
  "sessionName": "test_session",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "connected": false,
  "message": "Scan the QR code"
}
```

✅ **API is responding correctly!**

---

### Test 3: Add Contacts
```bash
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["919876543210", "911234567890"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "2 contacts added successfully",
  "campaignId": 1,
  "insertedCount": 2
}
```

✅ **Database connection working!**

---

## 🎯 STEP 5: Choose Testing Method (Pick One)

### Option 1️⃣: Postman (Recommended for GUI)

1. **Download Postman**: https://www.postman.com/downloads/
2. **Open Postman**
3. **Click**: `File` → `Import`
4. **Select**: `postman-collection.json` (from project folder)
5. **Set Variable**: `base_url = http://localhost:5000`
6. **Start Testing**: Click any request → Click `Send`

✅ **All endpoints ready to test!**

---

### Option 2️⃣: VS Code REST Client

1. **Install Extension**: Open VS Code → Extensions → Search "REST Client" → Install
2. **Open File**: `test-api.http` in VS Code
3. **Test**: Hover over any request → Click `Send Request`
4. **View**: Response appears in panel below

✅ **All endpoints ready to test!**

---

### Option 3️⃣: Terminal (curl)

See `CURL-TEST-COMMANDS.sh` file for all commands.

Copy any command and paste in terminal:
```bash
curl http://localhost:5000/api/whatsapp/sessions
```

✅ **Test any endpoint from terminal!**

---

## 📱 STEP 6: Complete Workflow Test

**Copy and paste this into your terminal** (in separate window from server):

```bash
# Test 1: Health Check
echo "1. Testing health..."
curl http://localhost:5000/health

# Test 2: Connect WhatsApp
echo -e "\n2. Connecting WhatsApp..."
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"workflow"}'

# Test 3: Add Contacts
echo -e "\n3. Adding contacts..."
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["919876543210", "911234567890"]
  }'

# Test 4: Start Campaign
echo -e "\n4. Starting campaign..."
curl -X POST http://localhost:5000/api/campaign/campaign/start/1 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": "Hello! This is test campaign"}'

# Test 5: Check Status
echo -e "\n5. Checking campaign status..."
curl http://localhost:5000/api/campaign/campaign/1/status

echo -e "\n✅ Workflow test complete!"
```

✅ **All tests passed!**

---

## 📧 STEP 7: Share with Frontend Team

### Files to Share:

**Create a folder** named `API_Documentation` and copy these files:

1. **FRONTEND-API-GUIDE.md**
   - Complete integration guide
   - JavaScript/React code examples
   - Error handling examples

2. **API-QUICK-REFERENCE.md**
   - Quick lookup card
   - All endpoints at a glance
   - Request/response examples

3. **postman-collection.json**
   - Ready-to-import Postman collection
   - All endpoints pre-configured

### Share Instructions to Frontend Team:

```
Hi Team,

Here are the API docs for the WhatsApp Campaign Manager:

📖 Files:
- FRONTEND-API-GUIDE.md (Read this first!)
- API-QUICK-REFERENCE.md (Quick reference)
- postman-collection.json (Import to Postman)

🚀 Quick Start:
1. Base URL: http://localhost:5000
2. Import postman-collection.json to Postman
3. Test all endpoints
4. Use code examples from FRONTEND-API-GUIDE.md

✅ No authentication required (currently)
✅ All endpoints fully documented
✅ Example code included

Questions? Check the documentation files or ask me.
```

---

## 📊 API Summary (For Sharing)

### Available Endpoints:
```
🟢 Health
  GET  /health           → Check API health
  GET  /ready            → Check dependencies

🔵 WhatsApp
  POST /api/whatsapp/connect      → Get QR code
  GET  /api/whatsapp/sessions     → List sessions

🟣 Campaign
  POST /api/campaign/add-contacts         → Add numbers
  POST /api/campaign/campaign/start/:id   → Start campaign
  GET  /api/campaign/campaign/:id/status  → Get progress
```

### Base URL:
```
http://localhost:5000
```

### Request Example:
```json
POST /api/campaign/add-contacts
{
  "campaign_id": 1,
  "user_id": 100,
  "contacts": ["919876543210"]
}
```

### Response Example:
```json
{
  "success": true,
  "message": "1 contacts added successfully",
  "insertedCount": 1
}
```

---

## 🎓 JavaScript Integration Example

```javascript
// For Frontend Engineers

// 1. Add Contacts
async function addContacts() {
  const response = await fetch('http://localhost:5000/api/campaign/add-contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_id: 1,
      user_id: 100,
      contacts: ['919876543210', '911234567890']
    })
  });
  return response.json();
}

// 2. Start Campaign
async function startCampaign(campaignId, message) {
  const response = await fetch(
    `http://localhost:5000/api/campaign/campaign/start/${campaignId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageTemplate: message })
    }
  );
  return response.json();
}

// 3. Get Status
async function getCampaignStatus(campaignId) {
  const response = await fetch(
    `http://localhost:5000/api/campaign/campaign/${campaignId}/status`
  );
  return response.json();
}

// Usage
const result = await addContacts();
console.log('Contacts added:', result);
```

---

## ✅ Checklist

- [ ] npm install completed
- [ ] .env file updated with DB credentials
- [ ] MySQL database created
- [ ] npm run dev started
- [ ] Health check working (curl test)
- [ ] All endpoints tested
- [ ] Postman collection imported (optional)
- [ ] Documentation shared with team
- [ ] Frontend team can access API
- [ ] Ready for development!

---

## 🆘 Common Issues & Solutions

### Issue: "npm command not found"
**Solution**: Install Node.js from nodejs.org

### Issue: "MySQL connection failed"
**Solution**: 
1. Verify MySQL is running: `mysql -u root -p`
2. Check .env credentials match your MySQL setup
3. Verify database exists: `SHOW DATABASES;`

### Issue: "Port 5000 already in use"
**Solution**: Change PORT in .env file to 5001 or another free port

### Issue: "Cannot POST /api/campaign/add-contacts"
**Solution**: 
1. Check server is running (look for "Server running" message)
2. Verify Content-Type header is "application/json"
3. Check request body format is correct

### Issue: "Database connection timeout"
**Solution**: Increase timeout in .env:
```env
DB_POOL_TIMEOUT=60000  # Increase to 60 seconds
```

---

## 🎯 Next Steps

1. ✅ **Setup Complete** → Server running
2. ✅ **Testing Complete** → All APIs working
3. ✅ **Documentation Complete** → Ready to share
4. 📧 **Share with Team** → Send documentation files
5. 👨‍💻 **Frontend Starts** → Integration begins
6. 🚀 **Deploy** → To production

---

## 📚 Quick Reference

| Task | Command |
|------|---------|
| Install | `npm install` |
| Start | `npm run dev` |
| Test | `curl http://localhost:5000/health` |
| Stop | `Ctrl + C` |
| Database | `mysql -u root -p` |

---

## 📞 Support Links

- **Setup Help**: See SETUP-AND-API-GUIDE.md
- **Frontend Help**: See FRONTEND-API-GUIDE.md
- **API Details**: See API-QUICK-REFERENCE.md
- **Testing**: Use postman-collection.json

---

## 🎉 Success!

When you see this, everything is working:

```
✅ Server running on port 5000
✅ Database connected
✅ Health check returns 200
✅ All endpoints responding
✅ Ready to share with team
```

**Next command**: `npm run dev`

Good luck! 🚀
