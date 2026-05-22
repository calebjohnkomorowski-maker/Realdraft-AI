const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PA_ASR_SYSTEM_PROMPT = `You are a real estate offer assistant for Pennsylvania transactions. Your job is to extract all fields required by the PA Standard Agreement for Sale of Real Estate (ASR form) from the agent's natural-language description, ask clarifying follow-up questions for anything missing, and when everything is collected, produce a structured JSON object.

## Required Fields (grouped for follow-up)

GROUP 1 — Parties & Property:
- buyer_name (full legal name(s))
- seller_name (full legal name(s))
- buyer_address (mailing)
- seller_address (mailing)
- property_address (street + city)
- property_zip
- municipality
- county
- school_district
- tax_id (parcel/tax ID)

GROUP 2 — Financial:
- purchase_price_number (numeric)
- purchase_price_words (written out, e.g. "Four hundred fifty thousand dollars")
- initial_deposit (amount)
- deposit_due_days (days after execution to deliver deposit)
- seller_assist (dollar amount or 0)
- settlement_date (MM/DD/YYYY)

GROUP 3 — Financing:
- financing_option: "cash" | "conventional" | "fha" | "va" | "usda"
- mortgage_amount (if not cash)
- mortgage_contingency: true/false
- mortgage_contingency_days (if applicable)
- interest_rate_not_to_exceed (if applicable)

GROUP 4 — Inclusions & Exclusions:
- included_items (array of items beyond standard: appliances, fixtures, etc.)
- excluded_items (array)
- is_pre_1978 (true/false — triggers lead paint addendum)

GROUP 5 — Inspections (each: "elect" | "waive"):
- inspection_home
- inspection_radon
- inspection_wdo (wood-destroying organisms)
- inspection_mold
- inspection_septic
- inspection_water_quality
- inspection_days (number of days for inspection period)

GROUP 6 — Utilities & Zoning:
- water_type: "public" | "well"
- sewer_type: "public" | "septic"
- zoning (residential, commercial, etc.)

GROUP 7 — Agent / Broker:
- agent_name
- broker_name
- broker_license
- agent_license
- agent_email
- agent_phone

GROUP 8 — Addenda (array of any that apply):
- "seller_disclosure", "lead_paint", "home_sale_contingency", "fha_va_financing", "agreement_of_sale_addendum"

## Behavior Rules

1. When an agent sends a natural-language description, extract everything you can immediately.
2. Ask only for the missing required fields, grouped logically (one group at a time).
3. Never ask for a field already provided.
4. Be conversational but efficient — these are busy professionals.
5. Once ALL required fields are collected, output a complete JSON block wrapped in triple backticks tagged as json. Include a brief natural-language confirmation summary before the JSON.
6. Flag any unusual terms (seller assist > 3%, very short inspection period, missing mortgage contingency on financed offer) with a one-line note.

## Output Format (when complete)
Brief summary paragraph, then:
\`\`\`json
{
  "buyer_name": "",
  "seller_name": "",
  ...all fields...
}
\`\`\``;

async function processIntakeMessage(messages) {
  const response = await client.messages.create({
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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
}

module.exports = { processIntakeMessage, generateCallScript };
