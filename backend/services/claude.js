const Anthropic = require('@anthropic-ai/sdk');

// Lazy client — reads ANTHROPIC_API_KEY at call time so a missing/rotated key
// gives a clear error rather than crashing the server on startup.
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to backend/.env and restart the server.'
    );
  }
  return new Anthropic({ apiKey });
}

const PA_ASR_SYSTEM_PROMPT = `You are a real estate offer assistant for Pennsylvania transactions. Your job is to extract all fields required by the PA Standard Agreement for Sale of Real Estate (ASR form) from the agent's natural-language description, ask clarifying follow-up questions for anything missing, and when everything is collected, produce a structured JSON object.

## Required Fields (grouped for follow-up)

GROUP 1 — Property:
- property_address (full street address including city)
- property_zip
- municipality (city/township/borough)
- county
- school_district
- tax_id (parcel # or tax ID — ask if not given)
- zoning_classification (e.g. "R-1", "Residential" — ask if known)

GROUP 2 — Parties:
- buyer_name (full legal name(s) as they will appear on deed)
- buyer_address (buyer's mailing address — street, city, state, zip)
- seller_name (full legal name(s))
- seller_address (seller's mailing address)

GROUP 3 — Financial Terms:
- purchase_price_number (numeric, e.g. 325000)
- purchase_price_words (written out, e.g. "Three Hundred Twenty-Five Thousand Dollars")
- initial_deposit (dollar amount)
- initial_deposit_days (days to deliver — default 5 if not specified)
- additional_deposit (dollar amount, if any — 0 if none)
- additional_deposit_days (days for additional deposit — default 10 if any)
- seller_assist (dollar amount Seller pays toward Buyer's closing costs — 0 if none)
- settlement_date (MM/DD/YYYY)
- written_acceptance_date (deadline for all parties to sign — typically 2-3 days from offer date)

GROUP 4 — Financing:
- financing_option: "cash" | "conventional" | "fha" | "va" | "usda" | "waived" (waived = has mortgage but no contingency)
- mortgage_amount (if not cash, numeric)
- mortgage_type (e.g. "Conventional", "FHA", "VA", "USDA")
- mortgage_term (years, e.g. 30)
- mortgage_ltv (loan-to-value percentage, e.g. 80)
- mortgage_rate (initial interest rate %, e.g. 6.875)
- mortgage_rate_max (maximum acceptable rate %, e.g. 7.5)
- mortgage_lender (name of lender — "TBD" if unknown)
- mortgage_commitment_date (date lender must issue commitment — typically 30-45 days out)

GROUP 5 — Inclusions & Exclusions:
- included_items (array of items beyond standard inclusions, e.g. ["Refrigerator","Washer","Dryer"])
- excluded_items (array of items Seller is keeping)
- is_pre_1978 (true/false — triggers lead paint addendum)

GROUP 6 — Inspections (each must be "elect" or "waive"):
- inspection_home (home inspection)
- inspection_radon
- inspection_wdo (wood-destroying organisms / termite)
- inspection_mold
- inspection_septic (only if not public sewer)
- inspection_water_quality (only if not public water)
- inspection_days (contingency period in days — default 10)

GROUP 7 — Utilities:
- water_type: "public" | "community" | "on-site" | "well" | "none"
- sewer_type: "public" | "community" | "septic" | "on-lot" | "holding tank" | "none"

GROUP 8 — Addenda (array of strings, include all that apply):
- "seller_disclosure", "lead_paint", "home_sale_contingency", "fha_va", "radon_disclosure"

## Behavior Rules

1. Extract everything you can from the agent's first message immediately — don't ask for things already provided.
2. Group follow-up questions logically. Cover Groups 1-3 first, then 4-5, then 6-8. Never more than 5-6 questions at once.
3. For cash offers: skip all mortgage fields. For financed offers: ask for mortgage details.
4. For septic/well: automatically elect those inspections unless agent says to waive.
5. Default values to use when agent says "standard" or "usual":
   - initial_deposit_days: 5
   - additional_deposit: 0
   - inspection_days: 10
   - mortgage_term: 30
   - written_acceptance_date: 3 days from today
6. Once ALL required fields are collected, output a complete JSON block (triple backtick json). Include a brief confirmation paragraph first.
7. Flag these with a ⚠️ one-line note: seller_assist > 3% of price, inspection_days < 7, no mortgage contingency on financed offer, settlement < 30 days away.

## JSON Output Format
\`\`\`json
{
  "property_address": "",
  "property_zip": "",
  "municipality": "",
  "county": "",
  "school_district": "",
  "tax_id": "",
  "zoning_classification": "",
  "buyer_name": "",
  "buyer_address": "",
  "seller_name": "",
  "seller_address": "",
  "purchase_price_number": 0,
  "purchase_price_words": "",
  "initial_deposit": 0,
  "initial_deposit_days": 5,
  "additional_deposit": 0,
  "additional_deposit_days": 10,
  "seller_assist": 0,
  "settlement_date": "",
  "written_acceptance_date": "",
  "financing_option": "conventional",
  "mortgage_amount": 0,
  "mortgage_type": "",
  "mortgage_term": 30,
  "mortgage_ltv": 0,
  "mortgage_rate": 0,
  "mortgage_rate_max": 0,
  "mortgage_lender": "",
  "mortgage_commitment_date": "",
  "included_items": [],
  "excluded_items": [],
  "is_pre_1978": false,
  "inspection_home": "elect",
  "inspection_radon": "elect",
  "inspection_wdo": "elect",
  "inspection_mold": "waive",
  "inspection_septic": "waive",
  "inspection_water_quality": "waive",
  "inspection_days": 10,
  "water_type": "public",
  "sewer_type": "public",
  "addenda": []
}
\`\`\``;

async function processIntakeMessage(messages) {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: PA_ASR_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);

  return {
    message: text,
    isComplete: !!jsonMatch,
    offerData: jsonMatch ? JSON.parse(jsonMatch[1]) : null,
    usage: response.usage,
  };
}

async function generateCallScript({ agentName, clientName, address, price, deposit, settlementDate, contingencies, unusualTerms }) {
  const prompt = `You are a real estate coaching assistant. Generate a natural, confident phone script for agent ${agentName} to call their client ${clientName} about an offer on ${address} at $${price.toLocaleString()}.

Key points to cover:
- Deposit: $${deposit.toLocaleString()}
- Settlement date: ${settlementDate}
- Contingencies: ${contingencies.join(', ')}
${unusualTerms?.length ? `- Notable terms: ${unusualTerms.join(', ')}` : ''}

Tone: professional but warm.

Output exactly this structure (use markdown headers):
## Opening Line
## Offer Summary Talking Points
## Anticipated Q&A (3 questions with suggested responses)
## Closing & Call to Action
## SMS Follow-Up Template`;

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

const MLS_EXTRACTION_PROMPT = `Extract all available fields from this MLS listing sheet.
Return ONLY a single valid JSON object — no markdown, no explanation, no extra text.

Use exactly these field names and value rules:

{
  "property_address": "full street address including city but NOT state or zip (e.g. '623 W Seven Stars Rd, Phoenixville')",
  "property_zip": "5-digit zip code only",
  "municipality": "township or borough name only (e.g. 'East Vincent Township')",
  "county": "county name only, no state (e.g. 'Chester')",
  "school_district": "school district name (e.g. 'Owen J Roberts')",
  "tax_id": "parcel / tax ID number exactly as shown",
  "zoning_classification": "zoning code (e.g. 'AP', 'R-1')",
  "seller_name": "owner / seller name(s) exactly as shown",
  "list_price": numeric list price as an integer with no $ or commas,
  "settlement_date": "YYYY-MM-DD if a close date or settlement date is shown, else empty string",
  "water_type": one of: "public" | "community" | "on-site" | "none"  — map 'Well' → 'on-site', 'Public Water' → 'public',
  "sewer_type": one of: "public" | "community" | "septic" | "none"  — map 'On Site Septic' or 'Septic' → 'septic', 'Public Sewer' → 'public',
  "financing_option": one of: "conventional" | "cash" | "fha" | "va" | "usda"  — use first/primary acceptable type; if only Cash listed → 'cash'; default 'conventional',
  "included_items_text": "comma-separated inclusions exactly as written on the sheet",
  "excluded_items_text": "comma-separated exclusions exactly as written on the sheet",
  "is_pre_1978": true if year built < 1978 else false,
  "listing_agent_name": "listing agent full name",
  "listing_agent_phone": "listing agent direct phone number",
  "listing_agent_email": "listing agent email address",
  "listing_office_name": "listing brokerage / office name",
  "listing_office_phone": "listing office main phone number",
  "listing_office_license": "listing office / broker license number"
}

For any field not found in the document use: "" for strings, 0 for numbers, false for booleans.`;

async function parseMLSDocument(pdfBuffer) {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBuffer.toString('base64'),
          },
        },
        { type: 'text', text: MLS_EXTRACTION_PROMPT },
      ],
    }],
  });

  const text = response.content[0].text.trim();
  // Strip markdown fences if Claude wrapped it anyway
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { processIntakeMessage, generateCallScript, parseMLSDocument };
