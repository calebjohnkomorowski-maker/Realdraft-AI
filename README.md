# RealDraft AI 🏠

**AI-powered PA real estate offer automation.** Type (or speak) a natural-language offer description and get a filled PA ASR form, call script, e-signature package, and client SMS — in minutes.

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- A Supabase project (free tier is fine)
- Anthropic API key
- Twilio account (SMS)
- Gmail / SMTP credentials (email)
- HelloSign or DocuSign API key (e-signatures)

### 2. Install & Configure

```powershell
# Clone / navigate to the project folder, then:
.\setup.ps1
```

Or manually:
```bash
cd backend && npm install
cd ../frontend && npm install
cp backend/.env.example backend/.env
# Edit backend/.env with your keys
```

### 3. Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. Run `supabase-schema.sql` in the SQL editor
3. Create a **Storage bucket** named `documents` (set to Public)
4. Copy your **Project URL** and **Service Role Key** into `.env`

### 4. PA ASR Form Template
Place your PA Standard Agreement for Sale of Real Estate PDF at:
```
backend/templates/pa-asr-form.pdf
```
> Without the template, a **demo PDF** is generated automatically showing all extracted fields. This lets you test the full flow immediately.

### 5. Start Development Servers

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173**

---

## Architecture

```
realdraft-ai/
├── backend/                    Node.js + Express API
│   ├── routes/
│   │   ├── chat.js             AI intake endpoint
│   │   ├── offers.js           Offer CRUD
│   │   ├── documents.js        PDF generate + send
│   │   ├── clients.js          Client management
│   │   └── scripts.js          Call script generation
│   ├── services/
│   │   ├── claude.js           Anthropic SDK (intake + scripts)
│   │   ├── pdf.js              pdf-lib form filling
│   │   ├── supabase.js         Database + storage
│   │   ├── email.js            Nodemailer
│   │   ├── sms.js              Twilio
│   │   └── esignature.js       HelloSign / DocuSign
│   └── templates/
│       └── pa-asr-form.pdf     ← Place your PA ASR template here
│
└── frontend/                   React + Vite + TailwindCSS + shadcn/ui
    └── src/
        ├── components/
        │   ├── Chat.jsx         Conversational offer intake
        │   ├── OfferSummary.jsx Live extracted fields panel
        │   ├── CallScript.jsx   AI call script generator
        │   └── DocumentSend.jsx E-sign + email + SMS sender
        └── pages/
            ├── NewOffer.jsx    4-step offer workflow
            ├── Home.jsx        Dashboard
            ├── OfferDetail.jsx Single offer view
            ├── Clients.jsx     Client pipeline
            └── Settings.jsx    Agent profile
```

---

## How It Works

### Phase 2 — Conversational Intake
The agent describes the offer naturally:
> *"Write an offer for 123 Main St. Buyer is Sarah Johnson, seller is Mike Thompson. $450k, $15k deposit, settlement July 30th, conventional mortgage contingent, 10-day inspection, they want the garage and bar included."*

Claude extracts all fields, asks follow-up questions for anything missing (financing type, water/sewer, inspections, zoning, broker info), then outputs a structured JSON mapping to the PA ASR form.

### Phase 3 — PDF Auto-Fill
`pdf-lib` fills the PA ASR form using coordinate/field-name mapping for all 14 pages including:
- Buyer/seller info, property details
- Purchase price (number + written)
- Settlement date, deposit, seller assist
- Financing type checkboxes
- Inspection election/waiver checkboxes
- Water/sewer type checkboxes
- Signature & initial placeholder boxes

### Phase 4 — E-Signature Automation
All 14 pages get buyer/seller initial boxes and the final page gets full signature lines with dates. The envelope is sent via HelloSign or DocuSign with configurable signing order.

### Phase 5 — Document Package
- Email: professional HTML signing request via Nodemailer
- SMS: Twilio notification to all signers
- Agent CC'd on all notifications
- Executed copy auto-emailed when all parties sign

### Phase 6 — Call Script
Claude generates a personalized phone script with:
- Opening line
- Offer summary talking points
- 3 anticipated client Q&As
- Closing / CTA
- SMS follow-up template

---

## Environment Variables

```env
ANTHROPIC_API_KEY=        # Required — Claude API
SUPABASE_URL=             # Required — database + storage
SUPABASE_SERVICE_KEY=     # Required — service role key
TWILIO_ACCOUNT_SID=       # SMS
TWILIO_AUTH_TOKEN=        # SMS
TWILIO_FROM_NUMBER=       # SMS
SMTP_HOST=                # Email
SMTP_PORT=587             # Email
SMTP_USER=                # Email
SMTP_PASS=                # Email
ESIGN_PROVIDER=hellosign  # "hellosign" or "docusign"
HELLOSIGN_API_KEY=        # HelloSign
DOCUSIGN_*=               # DocuSign (if using)
FRONTEND_URL=http://localhost:5173
```

---

## PA ASR Field Mapping

| JSON Field | Form Location |
|---|---|
| `buyer_name` | Page 1, Buyer(s) |
| `seller_name` | Page 1, Seller(s) |
| `property_address` | Page 1, Property Address |
| `municipality` / `county` | Page 1 |
| `purchase_price_number` | Page 2, $ field |
| `purchase_price_words` | Page 2, written amount |
| `initial_deposit` | Page 2, Deposit |
| `settlement_date` | Page 2, Settlement Date |
| `included_items` | Page 3, Section 7B |
| `financing_option` | Page 3, Section 8 checkboxes |
| `water_type` / `sewer_type` | Page 5, Section 10A/B |
| `inspection_*` | Pages 7-8, elected/waived |
| Signature lines | Page 14 (all pages for initials) |

---

## Future Expansion (Phase 8)
- NJ, NY, DE forms — swap `pa-asr-form.pdf` + field map
- Listing agreements & counter-offers
- MLS data pull to pre-fill property fields
- Multi-offer comparison tool
- Supabase Auth for multi-agent teams
