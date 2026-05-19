#!/bin/bash

echo "Testing Multi-Channel WhatsApp API"
echo "=================================="

BASE_URL="http://localhost:5000/api"

# Test 1: Health Check
echo ""
echo "1. Testing Health Check..."
curl -X GET http://localhost:5000/health

# Test 2: Connect WhatsApp
echo ""
echo ""
echo "2. Testing WhatsApp Connect..."
curl -X POST $BASE_URL/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session1"}'

# Test 3: Add Campaign Contacts
echo ""
echo ""
echo "3. Testing Add Campaign Contacts..."
curl -X POST $BASE_URL/campaign/add-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "camp_001",
    "user_id": 1,
    "contacts": ["919876543210", "919876543211"]
  }'

# Test 4: Save Template
echo ""
echo ""
echo "4. Testing Save Template..."
curl -X POST $BASE_URL/campaign/templates/save \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "template_name": "Welcome Message",
    "template_type": "plainText",
    "template_content": "Hello {name}, welcome!",
    "variables": ["name"]
  }'

# Test 5: Start Campaign with Plain Text
echo ""
echo ""
echo "5. Testing Start Campaign with Plain Text..."
curl -X POST $BASE_URL/campaign/start/camp_001 \
  -H "Content-Type: application/json" \
  -d '{
    "messageTemplate": "Hello! Check our offers today!"
  }'

# Test 6: Get Campaign Status
echo ""
echo ""
echo "6. Testing Get Campaign Status..."
curl -X GET $BASE_URL/campaign/camp_001/status

echo ""
echo ""
echo "All tests completed!"
