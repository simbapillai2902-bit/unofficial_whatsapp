# Multi-Channel WhatsApp System Architecture & Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT / API CONSUMER                      │
│                      (No Frontend Required)                      │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                    REST API Calls (JSON)
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    EXPRESS.JS SERVER (Port 3000)                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              MIDDLEWARE LAYER                          │      │
│  ├────────────────────────────────────────────────────────┤      │
│  │  • CORS Configuration                                  │      │
│  │  • Request ID Middleware (Tracking)                   │      │
│  │  • Request Timeout Handler                            │      │
│  │  • Error Handler (Global)                             │      │
│  │  • Validation Middleware                              │      │
│  └────────────────────────────────────────────────────────┘      │
│                          │                                        │
│          ┌───────────────┼───────────────┬──────────────────┐    │
│          │               │               │                  │    │
│          ▼               ▼               ▼                  ▼    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │  WhatsApp    │ │  Campaign    │ │  Template    │ │  Health  │ │
│  │  Routes      │ │  Routes      │ │  Routes ✨   │ │  Routes  │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────────┘ │
│         │                │                │                       │
│         ▼                ▼                ▼                       │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              CONTROLLERS                               │      │
│  ├────────────────────────────────────────────────────────┤      │
│  │  • WhatsappController                                  │      │
│  │  • CampaignController                                  │      │
│  │  • TemplateController ✨ (NEW)                        │      │
│  └────────────────────────────────────────────────────────┘      │
│         │                │                │                       │
│         ▼                ▼                ▼                       │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              SERVICES                                  │      │
│  ├────────────────────────────────────────────────────────┤      │
│  │  • SessionManager (QR, Connection, Auth)              │      │
│  │  • SendMessageService (WhatsApp Send)                 │      │
│  │  • CampaignProcessor (Bulk Processing)                │      │
│  │  • RotationService (Load Balancing)                   │      │
│  │  • QueueProcessor (Message Queue)                     │      │
│  └────────────────────────────────────────────────────────┘      │
│         │                │                                        │
│         └────────────────┼────────────────┐                       │
│                          │                │                       │
└──────────────────────────┼────────────────┼───────────────────────┘
                           │                │
        ┌──────────────────┘                │
        │                                   │
        ▼                                   ▼
   ┌─────────────┐                   ┌──────────────┐
   │  WhatsApp   │                   │  MySQL DB    │
   │   Network   │                   │  (bulk_msg_2)│
   │             │                   │              │
   │ • Messages  │                   │ • Users      │
   │ • QR Codes  │                   │ • Templates  │
   │ • Sessions  │                   │ • Campaigns  │
   │ • Delivery  │                   │ • Queue      │
   │   Status    │                   │ • Logs       │
   └─────────────┘                   └──────────────┘
```

---

## 🔄 Message Flow - Campaign Execution

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: USER INITIATES WHATSAPP SESSION                        │
└──────────────────────────────────────────────────────────────────┘
    │
    POST /api/whatsapp/connect { sessionName: "session1" }
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  SessionManager.createSession()                                 │
│  • Initialize WhatsApp client                                   │
│  • Generate QR Code                                             │
│  • Store session in memory                                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼ [Response with QR Code in base64]
┌──────────────────────────────────────────────────────────────────┐
│  USER ACTION: SCAN QR CODE                                       │
│  • WhatsApp authentication via QR                               │
│  • Session becomes "connected"                                  │
│  • Ready to send messages                                       │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: CREATE MESSAGE TEMPLATE (OPTIONAL)                     │
└──────────────────────────────────────────────────────────────────┘
    │
    POST /api/campaign/templates/save
    {
      user_id: 1,
      template_name: "Welcome",
      template_type: "plainText",
      template_content: "Hello {name}!",
      variables: ["name"]
    }
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  TemplateController.saveTemplate()                              │
│  • Validate template data                                       │
│  • Check template name uniqueness per user                      │
│  • INSERT into message_templates table                          │
│  • Return templateId: 5                                         │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: ADD CONTACTS TO CAMPAIGN                               │
└──────────────────────────────────────────────────────────────────┘
    │
    POST /api/campaign/add-contacts
    {
      campaign_id: "camp_001",
      user_id: 1,
      contacts: [
        "919876543210",
        "919876543211",
        "919876543212"
      ]
    }
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  CampaignController.addCampaignContact()                         │
│  • Validate campaign_id format                                  │
│  • Batch insert 100 at a time                                   │
│  • INSERT into campaign_queue with status='pending'             │
│  • Update campaign.total_contacts                               │
│  • Return count: 3 inserted                                     │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: START CAMPAIGN (TWO OPTIONS)                           │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─────────────────────────┬─────────────────────────┐
    │                         │                         │
    ▼ OPTION A               ▼ OPTION B                │
POST with                POST with                     │
messageTemplate          templateId                    │
    │                         │                         │
    ▼                         ▼                         │
┌──────────────────┐   ┌──────────────────────────────┐│
│ Plain Text       │   │ Select Template Mode         ││
│ Message Passed   │   │ Fetch template from DB       ││
│ Directly         │   │ Get template_content         ││
└──────────────────┘   └──────────────────────────────┘│
    │                         │                         │
    └─────────────────────────┼─────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  CampaignController.startCampaign()                              │
│  • Validate campaign has pending contacts                       │
│  • Pass finalMessage to processCampaign()                       │
│  • Return 202 Accepted with status URL                          │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  CampaignProcessor.processCampaign()                             │
│  • Fetch pending contacts (batch of 1000)                       │
│  • UPDATE campaign_queue status='in_progress'                   │
│  • Get all active WhatsApp sessions                             │
│  • Add each contact to messageQueue (p-queue)                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼ [Concurrency: 5, Rate Limit: 50/min]
┌──────────────────────────────────────────────────────────────────┐
│  FOR EACH CONTACT (In Queue):                                    │
│                                                                  │
│  1. RotationService.getNextChannel()                            │
│     • Select WhatsApp session (round-robin)                     │
│     → selectedChannel = "session1"                              │
│                                                                  │
│  2. SendMessageService.sendMessage()                            │
│     • Construct WhatsApp JID: "919876543210@s.whatsapp.net"     │
│     • Send message via session.sock.sendMessage()               │
│     • Receive response with message.key.id                      │
│     → message_id = "3EB0B0C123..."                              │
│                                                                  │
│  3. UPDATE campaign_queue                                       │
│     queue_status='sent'                                         │
│     message_id = "3EB0B0C123..."                                │
│     whatsapp_session_id = session1                              │
│                                                                  │
│  4. INSERT into message_logs                                    │
│     user_id, campaign_id, template_id, message_id,              │
│     recipient_phone, delivery_status, message_content           │
│                                                                  │
│  5. On Error:                                                   │
│     retry_count++                                               │
│     If retry_count < 3: status='pending' (retry later)          │
│     If retry_count >= 3: status='failed'                        │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 5: MONITOR CAMPAIGN PROGRESS                              │
└──────────────────────────────────────────────────────────────────┘
    │
    GET /api/campaign/camp_001/status
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  CampaignController.getCampaignProgressStatus()                  │
│  • Query campaign_queue table                                   │
│  • Count contacts by status (pending, in_progress, sent, etc.)  │
│  • Calculate completion percentage                              │
│  • Return status breakdown                                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼ [Response]
{
  "campaignId": "camp_001",
  "pending": 0,
  "in_progress": 0,
  "sent": 3,
  "delivered": 3,
  "failed": 0,
  "completionPercentage": 100
}
```

---

## 📊 Database Operation Flow

```
┌─────────────────────────────────────────────────────────┐
│         CLIENT REQUEST (JSON)                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  VALIDATION     │
        │  Middleware     │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │  CONTROLLER                         │
        │  (Business Logic)                   │
        └────────┬────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │  DATABASE OPERATIONS                │
        │  • SELECT                           │
        │  • INSERT                           │
        │  • UPDATE                           │
        │  • DELETE                           │
        └────────┬────────────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │    MySQL Database             │
        │    ┌─────────────────────┐    │
        │    │ message_templates   │    │
        │    │ campaign_queue      │    │
        │    │ message_logs        │    │
        │    │ campaigns           │    │
        │    │ whatsapp_configs    │    │
        │    │ users               │    │
        │    └─────────────────────┘    │
        └────────┬──────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────────────┐
        │  RESPONSE FORMATTING                │
        │  • Error Middleware                 │
        │  • JSON Response                    │
        └────────┬────────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  CLIENT         │
        │  (Response JSON)│
        └─────────────────┘
```

---

## 🔌 API Endpoint Groups

```
┌─────────────────────────────────────────────────────────┐
│  /api/whatsapp/* (Session Management)                  │
├─────────────────────────────────────────────────────────┤
│  POST   /connect    → Generate QR & Connect             │
│  GET    /sessions   → List all sessions                 │
│  POST   /logout     → Disconnect session                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  /api/campaign/templates/* (Template Management) ✨NEW │
├─────────────────────────────────────────────────────────┤
│  POST   /save                   → Create template       │
│  GET    /user/:user_id          → List templates        │
│  GET    /:template_id           → Get template          │
│  PUT    /:template_id           → Update template       │
│  DELETE /:template_id           → Delete template       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  /api/campaign/* (Campaign Management)                  │
├─────────────────────────────────────────────────────────┤
│  POST   /add-contacts           → Add contacts          │
│  POST   /start/:campaignId      → Start campaign        │
│  GET    /:campaignId/status     → Check status          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  /health (Health Check)                                 │
├─────────────────────────────────────────────────────────┤
│  GET    /health                 → API health status     │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Data Model Relationships

```
users (1)
  ├─── (1:M) ─→ campaigns
  │             ├─── (1:M) ─→ campaign_queue
  │             │              └─── message_delivery_status
  │             └─── (1:M) ─→ message_logs
  │
  ├─── (1:M) ─→ message_templates
  │
  ├─── (1:M) ─→ whatsapp_configs
  │             └─── (1:M) ─→ session_activity_logs
  │
  └─── (1:M) ─→ contacts
       └─── (1:M) ─→ contact_groups
```

---

## 📈 Message Queue Processing

```
MESSAGE QUEUE (p-queue)
├── Concurrency: 5 messages simultaneously
├── Rate Limit: 50 messages per minute
└── Processing:
    
    Contact 1 ──┐
    Contact 2 ──┤
    Contact 3 ──┼─→ [Queue Processor] ──→ Send Message
    Contact 4 ──┤
    Contact 5 ──┘
    
    Contact 6 ┐
    Contact 7 ┤
    Contact 8 ├─→ [Waiting for slot...] ──→ Send Message
    ...      └
```

---

## 🚀 Deployment Architecture

```
┌──────────────────────────────────────┐
│     Client Applications              │
│     (Web, Mobile, API Consumers)     │
└──────────────────┬───────────────────┘
                   │ HTTP/REST
                   ▼
┌──────────────────────────────────────┐
│     Express.js Server                │
│     Port: 3000                       │
│     • API Endpoints                  │
│     • Validation                     │
│     • Error Handling                 │
│     • Session Management             │
│     • Message Processing             │
└──────────────────┬───────────────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
   MySQL    WhatsApp   System
   Database  Network   Config
```

---

## ✨ Key Improvements in This Implementation

### Before:
- ❌ Only plain text messages
- ❌ No message template support
- ❌ No template reuse
- ❌ Limited message flexibility

### After (with ✨):
- ✅ Plain text messages (existing)
- ✅ Reusable message templates (NEW)
- ✅ 10 different template types
- ✅ Template management API
- ✅ Template usage tracking
- ✅ Backward compatible
- ✅ No database changes needed

---

## 📝 Notes

- All components are stateless and scalable
- Database connections are pooled for efficiency
- Message queue respects WhatsApp rate limits
- Session data stored in-memory for performance
- Full audit trails via message_logs and session_activity_logs
- Comprehensive error handling and logging
