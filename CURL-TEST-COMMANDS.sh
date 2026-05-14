#!/bin/bash
# WhatsApp Campaign Manager - API Test Commands
# Copy and paste these commands in your terminal to test the API

# Set base URL
BASE_URL="http://localhost:5000"

echo "==================================================================="
echo "WhatsApp Campaign Manager - API Testing Commands"
echo "==================================================================="
echo ""

# ===== HEALTH CHECKS =====
echo "1️⃣ TEST: Health Check"
echo "---"
echo "curl $BASE_URL/health"
echo ""

echo "2️⃣ TEST: Ready Check (Dependencies)"
echo "---"
echo "curl $BASE_URL/ready"
echo ""

# ===== WHATSAPP ENDPOINTS =====
echo "3️⃣ TEST: Connect WhatsApp Session"
echo "---"
echo "curl -X POST $BASE_URL/api/whatsapp/connect \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"sessionName\":\"session1\"}'"
echo ""

echo "4️⃣ TEST: Get All Sessions"
echo "---"
echo "curl $BASE_URL/api/whatsapp/sessions"
echo ""

# ===== CAMPAIGN ENDPOINTS =====
echo "5️⃣ TEST: Add Contacts to Campaign"
echo "---"
echo "curl -X POST $BASE_URL/api/campaign/add-contacts \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{
    \"campaign_id\": 1,
    \"user_id\": 100,
    \"contacts\": [\"919876543210\", \"911234567890\"]
  }'"
echo ""

echo "6️⃣ TEST: Start Campaign"
echo "---"
echo "curl -X POST $BASE_URL/api/campaign/campaign/start/1 \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{
    \"messageTemplate\": \"Hello! Welcome to our campaign\"
  }'"
echo ""

echo "7️⃣ TEST: Get Campaign Status"
echo "---"
echo "curl $BASE_URL/api/campaign/campaign/1/status"
echo ""

# ===== EXECUTABLE COMMANDS =====
echo ""
echo "==================================================================="
echo "QUICK TEST SCRIPT - Copy & paste each command:"
echo "==================================================================="
echo ""

cat << 'EOF'
# Test 1: Health Check
curl http://localhost:5000/health

# Test 2: Ready Check
curl http://localhost:5000/ready

# Test 3: Connect WhatsApp
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"session1"}'

# Test 4: Get Sessions
curl http://localhost:5000/api/whatsapp/sessions

# Test 5: Add Contacts
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["919876543210", "911234567890", "919988776655"]
  }'

# Test 6: Start Campaign
curl -X POST http://localhost:5000/api/campaign/campaign/start/1 \
  -H "Content-Type: application/json" \
  -d '{
    "messageTemplate": "Hello! Welcome to our campaign"
  }'

# Test 7: Check Campaign Status
curl http://localhost:5000/api/campaign/campaign/1/status

# Test 8: Add More Contacts (Different Campaign)
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 2,
    "user_id": 101,
    "contacts": ["919123456789", "918234567890"]
  }'

# Test 9: Monitor Campaign Progress (Run in loop)
for i in {1..5}; do
  curl http://localhost:5000/api/campaign/campaign/1/status
  sleep 5
done

EOF

echo ""
echo "==================================================================="
echo "ERROR TEST CASES - Test validation"
echo "==================================================================="
echo ""

cat << 'EOF'
# Test: Invalid session name (special characters)
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"session@123"}'

# Test: Invalid session name (too short)
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"ab"}'

# Test: Invalid phone number
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["123"]
  }'

# Test: Empty contacts array
curl -X POST http://localhost:5000/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": []
  }'

# Test: Empty message template
curl -X POST http://localhost:5000/api/campaign/campaign/start/1 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": ""}'

EOF

echo ""
echo "==================================================================="
echo "BASH SCRIPT - Automated Complete Workflow"
echo "==================================================================="
echo ""

cat << 'EOF'
#!/bin/bash
# Complete workflow test

BASE_URL="http://localhost:5000"

echo "Step 1: Check health..."
curl $BASE_URL/health | jq .

echo "Step 2: Connect WhatsApp..."
QR_RESPONSE=$(curl -s -X POST $BASE_URL/api/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName":"workflow_test"}')
echo $QR_RESPONSE | jq .

echo "Step 3: Add contacts..."
curl -s -X POST $BASE_URL/api/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": 1,
    "user_id": 100,
    "contacts": ["919876543210", "911234567890"]
  }' | jq .

echo "Step 4: Start campaign..."
START_RESPONSE=$(curl -s -X POST $BASE_URL/api/campaign/campaign/start/1 \
  -H "Content-Type: application/json" \
  -d '{"messageTemplate": "Test campaign message"}')
echo $START_RESPONSE | jq .

echo "Step 5: Check status..."
curl -s $BASE_URL/api/campaign/campaign/1/status | jq .

EOF

echo ""
echo "==================================================================="
echo "For more details, see:"
echo "  - SETUP-AND-API-GUIDE.md"
echo "  - FRONTEND-API-GUIDE.md"
echo "  - API-QUICK-REFERENCE.md"
echo "==================================================================="
