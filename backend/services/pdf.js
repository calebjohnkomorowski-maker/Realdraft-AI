const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

// ── Number → Written Words ────────────────────────────────────────────────────
function numberToWords(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tensArr = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function convert(num) {
    if (num === 0) return '';
    if (num < 20)  return ones[num] + ' ';
    if (num < 100) return tensArr[Math.floor(num/10)] + (ones[num%10] ? '-'+ones[num%10] : '') + ' ';
    if (num < 1000)     return ones[Math.floor(num/100)] + ' Hundred ' + convert(num%100);
    if (num < 1_000_000) return convert(Math.floor(num/1000)) + 'Thousand ' + convert(num%1000);
    return convert(Math.floor(num/1_000_000)) + 'Million ' + convert(num%1_000_000);
  }
  const dollars = Math.floor(n);
  const cents   = Math.round((n - dollars) * 100);
  let result = convert(dollars).trim() + ' Dollars';
  if (cents > 0) result += ` and ${cents}/100`;
  return result;
}

// ── Field helpers ─────────────────────────────────────────────────────────────

/** White-out the underscore area and draw text over it. */
function fillField(page, font, text, x, y, { maxWidth = 400, fontSize = 8 } = {}) {
  if (text == null || text === '') return;
  const str = String(text);
  const approxWidth = Math.min(str.length * (fontSize * 0.55) + 4, maxWidth);
  page.drawRectangle({ x: x-1, y: y-2, width: approxWidth, height: fontSize + 3,
    color: rgb(1,1,1), borderWidth: 0 });
  page.drawText(str, { x, y, size: fontSize, font, color: rgb(0,0,0), maxWidth });
}

/** Draw an X inside a checkbox box (no white-out — box graphic must remain visible). */
function checkBox(page, font, x, y, size = 7) {
  page.drawText('X', { x, y: y - 1, size, font, color: rgb(0,0,0) });
}

// ── Field coordinate map ──────────────────────────────────────────────────────
// All coordinates are in PDF points, bottom-left origin (same as pdf-lib).
// page = 0-based index into pdfDoc.getPages().

const F = {
  // ── PAGE 0 (Page 1): Parties, property, broker/agent info ───────────────
  // Property
  PROPERTY_ADDR:      { pg: 0, x: 170, y: 588, w: 418 },
  ZIP:                { pg: 0, x: 460, y: 576, w: 118 },
  MUNICIPALITY:       { pg: 0, x: 120, y: 564, w: 278 },
  COUNTY:             { pg: 0, x: 462, y: 564, w: 118 },
  SCHOOL_DISTRICT:    { pg: 0, x: 130, y: 552, w: 265 },
  TAX_ID:             { pg: 0, x: 85,  y: 540, w: 470 },

  // Parties
  BUYER_NAME:         { pg: 0, x: 80,  y: 719, w: 200, fs: 9 },
  BUYER_ADDR1:        { pg: 0, x: 25,  y: 659, w: 260 },
  BUYER_ADDR2:        { pg: 0, x: 25,  y: 648, w: 260 },
  SELLER_NAME:        { pg: 0, x: 368, y: 719, w: 220, fs: 9 },
  SELLER_ADDR1:       { pg: 0, x: 306, y: 659, w: 275 },
  SELLER_ADDR2:       { pg: 0, x: 306, y: 648, w: 275 },

  // Buyer Licensee (right column, top block y≈469)
  B_LIC_NAME1:        { pg: 0, x: 393, y: 469, w: 190 },
  B_LIC_NAME2:        { pg: 0, x: 393, y: 457, w: 190 },
  B_LIC_NUM:          { pg: 0, x: 373, y: 445, w: 210 },
  B_LIC_PHONE:        { pg: 0, x: 373, y: 433, w: 210 },
  B_LIC_CELL:         { pg: 0, x: 363, y: 421, w: 220 },
  B_LIC_EMAIL:        { pg: 0, x: 333, y: 409, w: 250 },

  // Seller Licensee (right column, bottom block y≈282)
  S_LIC_NAME1:        { pg: 0, x: 393, y: 282, w: 190 },
  S_LIC_NAME2:        { pg: 0, x: 393, y: 270, w: 190 },
  S_LIC_NUM:          { pg: 0, x: 373, y: 258, w: 210 },
  S_LIC_PHONE:        { pg: 0, x: 373, y: 246, w: 210 },
  S_LIC_CELL:         { pg: 0, x: 363, y: 234, w: 220 },
  S_LIC_EMAIL:        { pg: 0, x: 333, y: 222, w: 250 },

  // Buyer Broker Company (left column, top block y≈469)
  B_BRK_NAME1:        { pg: 0, x: 106, y: 469, w: 185 },
  B_BRK_NAME2:        { pg: 0, x: 106, y: 456, w: 185 },
  B_BRK_LIC:          { pg: 0, x: 111, y: 444, w: 175 },
  B_BRK_ADDR1:        { pg: 0, x: 101, y: 432, w: 190 },
  B_BRK_ADDR2:        { pg: 0, x: 96,  y: 420, w: 190 },
  B_BRK_PHONE:        { pg: 0, x: 96,  y: 408, w: 190 },
  B_BRK_FAX:          { pg: 0, x: 86,  y: 396, w: 200 },

  // Seller Broker Company (left column, bottom block y≈281)
  S_BRK_NAME1:        { pg: 0, x: 106, y: 281, w: 185 },
  S_BRK_NAME2:        { pg: 0, x: 106, y: 269, w: 185 },
  S_BRK_LIC:          { pg: 0, x: 111, y: 257, w: 175 },
  S_BRK_ADDR1:        { pg: 0, x: 101, y: 245, w: 190 },
  S_BRK_ADDR2:        { pg: 0, x: 96,  y: 233, w: 190 },
  S_BRK_PHONE:        { pg: 0, x: 96,  y: 221, w: 190 },
  S_BRK_FAX:          { pg: 0, x: 86,  y: 209, w: 200 },

  // ── PAGE 1 (Page 2): Date, price, deposits, settlement ──────────────────
  AGREEMENT_DATE:     { pg: 1, x: 226, y: 743, w: 348 },
  PRICE_NUM:          { pg: 1, x: 152, y: 710, w: 228, fs: 9 },
  PRICE_WORDS:        { pg: 1, x: 69,  y: 699, w: 312 },
  INIT_DEP_DAYS:      { pg: 1, x: 196, y: 677, w: 6 },
  INIT_DEP:           { pg: 1, x: 400, y: 666, w: 162 },
  ADD_DEP_DAYS:       { pg: 1, x: 210, y: 655, w: 6 },
  ADD_DEP:            { pg: 1, x: 400, y: 655, w: 162 },
  SETTLEMENT_DATE:    { pg: 1, x: 145, y: 413, w: 285 },
  SELLER_ASSIST:      { pg: 1, x: 150, y: 479, w: 180 },
  WRITTEN_ACCEPT:     { pg: 1, x: 325, y: 116, w: 180 },

  // ── PAGE 2 (Page 3): Zoning, inclusions ─────────────────────────────────
  ZONING:             { pg: 2, x: 325, y: 649, w: 255 },
  INCLUSIONS_EXTRA:   { pg: 2, x: 68,  y: 484, w: 490 },
  INCLUSIONS_EXTRA2:  { pg: 2, x: 68,  y: 473, w: 490 },

  // ── PAGE 3 (Page 4): Mortgage detail ────────────────────────────────────
  MTG_COMMIT_DATE:    { pg: 3, x: 204, y: 287, w: 358 },
  MTG1_AMOUNT:        { pg: 3, x: 130, y: 451, w: 192 },
  MTG1_TERM:          { pg: 3, x: 120, y: 440, w: 60 },
  MTG1_TYPE:          { pg: 3, x: 139, y: 429, w: 182 },
  MTG1_LTV:           { pg: 3, x: 82,  y: 407, w: 42 },
  MTG1_LENDER:        { pg: 3, x: 136, y: 396, w: 145 },
  MTG1_LENDER2:       { pg: 3, x: 73,  y: 385, w: 210 },
  MTG1_RATE:          { pg: 3, x: 82,  y: 374, w: 62 },
  MTG1_RATE_MAX:      { pg: 3, x: 178, y: 352, w: 62 },

  // ── PAGE 6 (Page 7): Inspection Section 12C
  // The form prints "Elected ______" and "Waived ______" for each type.
  // When ELECTED  → write days on the Elected underline (left side, x≈36)
  // When WAIVED   → write "X"  on the Waived  underline (right side, x≈549)
  INSP_HOME_DAYS:     { pg: 6, x: 36,  y: 376, w: 30 },   // elected: days
  INSP_HOME_WAIVE:    { pg: 6, x: 549, y: 376, w: 60 },   // waived:  X
  INSP_WDO_DAYS:      { pg: 6, x: 36,  y: 255, w: 30 },
  INSP_WDO_WAIVE:     { pg: 6, x: 549, y: 255, w: 60 },
  INSP_WATER_DAYS:    { pg: 6, x: 36,  y: 79,  w: 30 },
  INSP_WATER_WAIVE:   { pg: 6, x: 549, y: 79,  w: 60 },

  // ── PAGE 7 (Page 8): Inspection Section 12C continued
  INSP_RADON_DAYS:    { pg: 7, x: 35,  y: 726, w: 30 },
  INSP_RADON_WAIVE:   { pg: 7, x: 549, y: 726, w: 60 },
  INSP_SEPTIC_DAYS:   { pg: 7, x: 35,  y: 605, w: 30 },
  INSP_SEPTIC_WAIVE:  { pg: 7, x: 549, y: 605, w: 60 },
  INSP_LEAD_DAYS:     { pg: 7, x: 35,  y: 374, w: 30 },
  INSP_LEAD_WAIVE:    { pg: 7, x: 549, y: 374, w: 60 },
};

// ── Checkbox coordinate map ───────────────────────────────────────────────────
// x,y = where to draw the 'X' mark (inside the printed checkbox box).
// Checkboxes are ~9pt boxes; labels start ~13pt to the right.

const CB = {
  // PAGE 0 (Page 1) — Agency / relationship checkboxes
  // Buyer Licensee (right column, top)
  b_lic_buyer_agent:        { pg: 0, x: 305, y: 383 },
  b_lic_buyer_designated:   { pg: 0, x: 305, y: 371 },
  b_lic_dual:               { pg: 0, x: 305, y: 347 },
  // Seller Licensee (right column, bottom)
  s_lic_seller_agent:       { pg: 0, x: 305, y: 196 },
  s_lic_seller_designated:  { pg: 0, x: 305, y: 184 },
  s_lic_dual:               { pg: 0, x: 305, y: 160 },
  // Buyer Broker (left column, top)
  b_brk_buyer_agent:        { pg: 0, x: 23,  y: 370 },
  b_brk_dual:               { pg: 0, x: 23,  y: 358 },
  // Seller Broker (left column, bottom)
  s_brk_seller_agent:       { pg: 0, x: 23,  y: 183 },
  s_brk_dual:               { pg: 0, x: 23,  y: 171 },

  // PAGE 2 (Page 3) — Financing options (Section 8A)
  financing_cash:           { pg: 2, x: 69,  y: 394 },  // Option 1: NOT APPLICABLE
  financing_waived:         { pg: 2, x: 69,  y: 383 },  // Option 2: WAIVED
  financing_contingent:     { pg: 2, x: 69,  y: 350 },  // Option 3: ELECTED

  // PAGE 4 (Page 5) — Water (Section 10A)
  water_public:             { pg: 4, x: 64,  y: 394 },
  water_community:          { pg: 4, x: 140, y: 394 },
  water_on_site:            { pg: 4, x: 241, y: 394 },
  water_none:               { pg: 4, x: 325, y: 394 },

  // PAGE 4 (Page 5) — Sewer (Section 10B)
  sewer_public:             { pg: 4, x: 79,  y: 361 },
  sewer_community:          { pg: 4, x: 190, y: 361 },
  sewer_ten_acre:           { pg: 4, x: 364, y: 361 },
  sewer_on_lot:             { pg: 4, x: 79,  y: 350 },
  sewer_holding_tank:       { pg: 4, x: 364, y: 350 },
  sewer_on_lot_well:        { pg: 4, x: 79,  y: 339 },
  sewer_none:               { pg: 4, x: 79,  y: 328 },
  sewer_none_permit:        { pg: 4, x: 237, y: 328 },

};

// ── Main form filler ──────────────────────────────────────────────────────────

async function fillPAAASRForm(offerData) {
  const templatePath = path.join(__dirname, '../templates/pa-asr-form.pdf');
  if (!fs.existsSync(templatePath)) return generateDemoPDF(offerData);

  const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath), { ignoreEncryption: true });
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages  = pdfDoc.getPages();

  /** Write a text field. spec = key in F{}. */
  const fill = (key, value) => {
    if (value == null || value === '') return;
    const s = F[key];
    if (!s) return;
    fillField(pages[s.pg], s.fs ? bold : font, value, s.x, s.y,
      { maxWidth: s.w, fontSize: s.fs || 8 });
  };

  /** Check a checkbox. spec = key in CB{}. */
  const check = (key) => {
    const s = CB[key];
    if (!s) return;
    checkBox(pages[s.pg], bold, s.x, s.y);
  };

  const money = (v) => v ? `$${Number(v).toLocaleString()}` : null;
  const d     = offerData;

  // ── PAGE 0: Property ────────────────────────────────────────────────────
  fill('PROPERTY_ADDR',   d.property_address);
  fill('ZIP',             d.property_zip);
  fill('MUNICIPALITY',    d.municipality);
  fill('COUNTY',          d.county);
  fill('SCHOOL_DISTRICT', d.school_district);
  fill('TAX_ID',          d.tax_id);

  // Parties
  fill('BUYER_NAME',  d.buyer_name);
  fill('SELLER_NAME', d.seller_name);
  if (d.buyer_address) {
    const [ln1, ...rest] = d.buyer_address.split(',');
    fill('BUYER_ADDR1', ln1.trim());
    if (rest.length) fill('BUYER_ADDR2', rest.join(',').trim());
  }
  if (d.seller_address) {
    const [ln1, ...rest] = d.seller_address.split(',');
    fill('SELLER_ADDR1', ln1.trim());
    if (rest.length) fill('SELLER_ADDR2', rest.join(',').trim());
  }

  // ── Buyer Licensee (the agent submitting this offer) ─────────────────────
  fill('B_LIC_NAME1',  d.agent_name);
  fill('B_LIC_NUM',    d.agent_license);
  fill('B_LIC_PHONE',  d.agent_phone);
  fill('B_LIC_CELL',   d.agent_cell);
  fill('B_LIC_EMAIL',  d.agent_email);

  // ── Buyer Broker (agent's own brokerage from Settings) ───────────────────
  fill('B_BRK_NAME1',  d.broker_name);
  fill('B_BRK_LIC',    d.broker_license);
  fill('B_BRK_PHONE',  d.broker_phone);
  fill('B_BRK_FAX',    d.broker_fax);
  // Split broker address into two lines at the first comma
  if (d.broker_address) {
    const commaIdx = d.broker_address.indexOf(',');
    if (commaIdx !== -1) {
      fill('B_BRK_ADDR1', d.broker_address.slice(0, commaIdx).trim());
      fill('B_BRK_ADDR2', d.broker_address.slice(commaIdx + 1).trim());
    } else {
      fill('B_BRK_ADDR1', d.broker_address);
    }
  }

  // ── Seller Licensee (listing agent from MLS) ─────────────────────────────
  fill('S_LIC_NAME1',  d.listing_agent_name);
  fill('S_LIC_NUM',    d.listing_agent_license || '');
  fill('S_LIC_PHONE',  d.listing_agent_phone);
  fill('S_LIC_EMAIL',  d.listing_agent_email);

  // ── Seller Broker (listing office from MLS) ───────────────────────────────
  fill('S_BRK_NAME1',  d.listing_office_name);
  fill('S_BRK_LIC',    d.listing_office_license);
  fill('S_BRK_PHONE',  d.listing_office_phone);

  // Agency checkboxes — default: seller agent for listing agent,
  // buyer agent for buyer's agent (most common scenario)
  const buyerAgentType   = (d.buyer_agent_type  || 'buyer_agent').toLowerCase();
  const sellerAgentType  = (d.seller_agent_type || 'seller_agent').toLowerCase();
  const buyerBrokerType  = buyerAgentType;
  const sellerBrokerType = sellerAgentType;

  // Buyer Licensee checkbox
  if (buyerAgentType.includes('designated'))       check('b_lic_buyer_designated');
  else if (buyerAgentType.includes('dual'))        check('b_lic_dual');
  else                                              check('b_lic_buyer_agent');

  // Seller Licensee checkbox
  if (sellerAgentType.includes('designated'))      check('s_lic_seller_designated');
  else if (sellerAgentType.includes('dual'))       check('s_lic_dual');
  else                                              check('s_lic_seller_agent');

  // Buyer Broker checkbox
  if (buyerBrokerType.includes('dual'))            check('b_brk_dual');
  else                                              check('b_brk_buyer_agent');

  // Seller Broker checkbox
  if (sellerBrokerType.includes('dual'))           check('s_brk_dual');
  else                                              check('s_brk_seller_agent');

  // ── PAGE 1: Date, Price, Deposits, Settlement ───────────────────────────
  const agreementDate = d.agreement_date || new Date().toLocaleDateString('en-US',
    { month: 'long', day: 'numeric', year: 'numeric' });
  fill('AGREEMENT_DATE', agreementDate);

  const priceNum   = Number(d.purchase_price_number || 0);
  const priceWords = d.purchase_price_words || numberToWords(priceNum);
  fill('PRICE_NUM',   money(priceNum));
  fill('PRICE_WORDS', `(${priceWords}`);

  // Initial deposit
  const initDays = d.initial_deposit_days != null ? String(d.initial_deposit_days) : '5';
  fill('INIT_DEP_DAYS', initDays);
  fill('INIT_DEP',      money(d.initial_deposit));

  // Additional deposit
  if (d.additional_deposit) {
    const addDays = d.additional_deposit_days != null ? String(d.additional_deposit_days) : '10';
    fill('ADD_DEP_DAYS', addDays);
    fill('ADD_DEP',      money(d.additional_deposit));
  }

  fill('SETTLEMENT_DATE', d.settlement_date);
  fill('SELLER_ASSIST',   money(d.seller_assist));

  // Written acceptance deadline (Section 5A)
  if (d.written_acceptance_date) {
    fill('WRITTEN_ACCEPT', d.written_acceptance_date);
  }

  // ── PAGE 2: Zoning, Financing option, Inclusions ────────────────────────
  fill('ZONING', d.zoning_classification);

  if (d.included_items && d.included_items.length) {
    const inclStr = Array.isArray(d.included_items)
      ? d.included_items.join('; ')
      : d.included_items;
    // Split across two lines if long
    if (inclStr.length > 85) {
      fill('INCLUSIONS_EXTRA',  inclStr.substring(0, 85));
      fill('INCLUSIONS_EXTRA2', inclStr.substring(85));
    } else {
      fill('INCLUSIONS_EXTRA', inclStr);
    }
  }

  // Financing option checkboxes (Section 8A)
  const fin = (d.financing_option || 'conventional').toLowerCase();
  if (fin === 'cash') {
    check('financing_cash');
  } else if (fin.includes('waiv')) {
    check('financing_waived');
  } else {
    // conventional / fha / va / usda / any mortgage with contingency
    check('financing_contingent');
  }

  // ── PAGE 3: Mortgage commitment date, loan details ──────────────────────
  if (d.mortgage_commitment_date) {
    fill('MTG_COMMIT_DATE', d.mortgage_commitment_date);
  }
  if (d.mortgage_amount) {
    fill('MTG1_AMOUNT', money(d.mortgage_amount));
  }
  if (d.mortgage_term) {
    fill('MTG1_TERM',  String(d.mortgage_term));
  }
  if (d.mortgage_type) {
    fill('MTG1_TYPE',  d.mortgage_type);
  }
  if (d.mortgage_ltv) {
    fill('MTG1_LTV',   String(d.mortgage_ltv));
  }
  if (d.mortgage_lender) {
    fill('MTG1_LENDER', d.mortgage_lender);
  }
  if (d.mortgage_rate) {
    fill('MTG1_RATE',     String(d.mortgage_rate));
    fill('MTG1_RATE_MAX', String(d.mortgage_rate_max || d.mortgage_rate));
  }

  // ── PAGE 4: Water & Sewer checkboxes (Section 10) ───────────────────────
  const water = (d.water_type || '').toLowerCase();
  if (water.includes('community'))                   check('water_community');
  else if (water.includes('well') || water.includes('on') || water.includes('site'))
                                                     check('water_on_site');
  else if (water.includes('none'))                   check('water_none');
  else                                               check('water_public');  // default

  const sewer = (d.sewer_type || '').toLowerCase();
  if (sewer.includes('community'))                   check('sewer_community');
  else if (sewer.includes('ten') || sewer.includes('acre')) check('sewer_ten_acre');
  else if (sewer.includes('tank') || sewer.includes('holding')) check('sewer_holding_tank');
  else if (sewer.includes('well') || sewer.includes('proximity')) check('sewer_on_lot_well');
  else if (sewer.includes('lot') || sewer.includes('septic'))    check('sewer_on_lot');
  else if (sewer.includes('permit'))                 check('sewer_none_permit');
  else if (sewer.includes('none'))                   check('sewer_none');
  else                                               check('sewer_public');  // default

  // ── PAGE 6 + 7: Inspection elections (Section 12C) ─────────────────────
  // The form prints "Elected ______" and "Waived ______" for each type.
  // Elected → write days number on the Elected underline.
  // Waived  → write "X" on the Waived underline.
  const inspDays = String(d.inspection_days || 10);

  // Home/Environmental (mold is included in home per form language)
  if (d.inspection_home !== 'waive') fill('INSP_HOME_DAYS',   inspDays);
  else                                fill('INSP_HOME_WAIVE',  'X');

  // Radon
  if (d.inspection_radon !== 'waive') fill('INSP_RADON_DAYS',  inspDays);
  else                                 fill('INSP_RADON_WAIVE', 'X');

  // WDO (Wood Destroying Organisms / termite)
  if (d.inspection_wdo !== 'waive') fill('INSP_WDO_DAYS',   inspDays);
  else                               fill('INSP_WDO_WAIVE',  'X');

  // Water Quality / Well
  if (d.inspection_water_quality !== 'waive') fill('INSP_WATER_DAYS',  inspDays);
  else                                         fill('INSP_WATER_WAIVE', 'X');

  // Septic
  if (d.inspection_septic !== 'waive') fill('INSP_SEPTIC_DAYS',  inspDays);
  else                                  fill('INSP_SEPTIC_WAIVE', 'X');

  // Lead-Based Paint — auto-elect when pre-1978
  if (d.is_pre_1978) fill('INSP_LEAD_DAYS',  inspDays);
  else               fill('INSP_LEAD_WAIVE', 'X');

  // ── Buyer / Seller initials on every page ──────────────────────────────
  const buyerInitials  = getInitials(d.buyer_name);
  const sellerInitials = getInitials(d.seller_name);
  pages.forEach((pg, i) => {
    if (i === 0) return; // Page 1 has full signatures, not initials
    fillField(pg, font, buyerInitials,  95,  29, { maxWidth: 100 });
    fillField(pg, font, sellerInitials, 500, 29, { maxWidth: 100 });
  });

  return pdfDoc.save();
}

function getInitials(name) {
  if (!name) return '';
  return name.trim().split(/\s+/).map(n => n[0].toUpperCase()).join('.') + '.';
}

// ── Demo PDF (no template on disk) ───────────────────────────────────────────

async function generateDemoPDF(offerData) {
  const pdfDoc = await PDFDocument.create();
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page   = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();

  const draw = (text, x, y, size = 10, f = font, color = rgb(0,0,0)) =>
    text && page.drawText(String(text), { x, y, size, font: f, color, maxWidth: 500 });

  draw('PENNSYLVANIA AGREEMENT FOR SALE OF REAL ESTATE', 60, height-50, 13, bold);
  draw('Preview — add PA ASR PDF to backend/templates/pa-asr-form.pdf for the real form',
    60, height-68, 8, font, rgb(0.6,0.6,0.6));

  let y = height - 100;
  const section = (label) => { draw(label, 50, y, 11, bold); y -= 20; };
  const row = (label, value) => {
    draw(label+':', 50, y, 9, bold);
    draw(value || '—', 220, y, 9);
    y -= 17;
  };
  const d = offerData;

  section('PROPERTY');
  row('Address',      d.property_address);
  row('Municipality', d.municipality);
  row('County',       d.county);
  row('ZIP',          d.property_zip);
  row('School Dist',  d.school_district);
  row('Tax ID',       d.tax_id);
  y -= 8;

  section('PARTIES');
  row('Buyer',         d.buyer_name);
  row('Buyer Address', d.buyer_address);
  row('Seller',        d.seller_name);
  row('Seller Address',d.seller_address);
  y -= 8;

  section('FINANCIAL TERMS');
  const priceNum = Number(d.purchase_price_number || 0);
  row('Purchase Price', `$${priceNum.toLocaleString()}`);
  row('In Words',       d.purchase_price_words || numberToWords(priceNum));
  row('Initial Deposit',d.initial_deposit ? `$${Number(d.initial_deposit).toLocaleString()}` : '—');
  row('Settlement Date',d.settlement_date);
  row('Seller Assist',  d.seller_assist ? `$${Number(d.seller_assist).toLocaleString()}` : 'None');
  y -= 8;

  section('FINANCING');
  row('Type',              (d.financing_option||'').toUpperCase());
  row('Mortgage Amount',   d.mortgage_amount ? `$${Number(d.mortgage_amount).toLocaleString()}` : 'N/A');
  row('Mortgage Type',     d.mortgage_type);
  row('Term',              d.mortgage_term ? `${d.mortgage_term} years` : 'N/A');
  row('Rate',              d.mortgage_rate ? `${d.mortgage_rate}%` : 'N/A');
  row('LTV',               d.mortgage_ltv ? `${d.mortgage_ltv}%` : 'N/A');
  row('Lender',            d.mortgage_lender);
  row('Commitment Date',   d.mortgage_commitment_date);
  y -= 8;

  section('UTILITIES');
  row('Water', d.water_type);
  row('Sewer', d.sewer_type);
  y -= 8;

  section('INSPECTIONS');
  ['home','radon','wdo','mold','septic','water_quality'].forEach(i => {
    row('  ' + i.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),
      (d[`inspection_${i}`]||'not specified').toUpperCase());
  });

  // Sig lines
  y = 80;
  page.drawLine({ start:{x:50,y}, end:{x:250,y}, thickness:1 });
  page.drawLine({ start:{x:350,y}, end:{x:560,y}, thickness:1 });
  draw('Buyer Signature / Date',  50,  y-14, 8);
  draw('Seller Signature / Date', 350, y-14, 8);

  return pdfDoc.save();
}

module.exports = { fillPAAASRForm, numberToWords };
