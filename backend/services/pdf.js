const { PDFDocument, StandardFonts, rgb, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Helper to safely fill a form text field
function trySetField(form, fieldName, value) {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value != null ? String(value) : '');
  } catch {
    // Field not found in this PDF — skip
  }
}

function tryCheckBox(form, fieldName, checked = true) {
  try {
    const box = form.getCheckBox(fieldName);
    checked ? box.check() : box.uncheck();
  } catch {}
}

function numberToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(num) {
    if (num === 0) return '';
    if (num < 20) return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num / 10)] + ' ' + ones[num % 10] + ' ';
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + convert(num % 100);
    if (num < 1_000_000) return convert(Math.floor(num / 1000)) + 'Thousand ' + convert(num % 1000);
    return convert(Math.floor(num / 1_000_000)) + 'Million ' + convert(num % 1_000_000);
  }

  const dollars = Math.floor(n);
  const cents = Math.round((n - dollars) * 100);
  let result = convert(dollars).trim() + ' Dollars';
  if (cents > 0) result += ` and ${cents}/100`;
  return result;
}

async function fillPAAASRForm(offerData) {
  const templatePath = path.join(__dirname, '../templates/pa-asr-form.pdf');

  if (!fs.existsSync(templatePath)) {
    // Generate a demonstration PDF when template is not yet uploaded
    return generateDemoPDF(offerData);
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // --- Page 1: Parties & Property ---
  trySetField(form, 'buyer_name', offerData.buyer_name);
  trySetField(form, 'seller_name', offerData.seller_name);
  trySetField(form, 'buyer_address', offerData.buyer_address);
  trySetField(form, 'seller_address', offerData.seller_address);
  trySetField(form, 'property_address', offerData.property_address);
  trySetField(form, 'property_zip', offerData.property_zip);
  trySetField(form, 'municipality', offerData.municipality);
  trySetField(form, 'county', offerData.county);
  trySetField(form, 'school_district', offerData.school_district);
  trySetField(form, 'tax_id', offerData.tax_id);

  // --- Page 2: Financial ---
  trySetField(form, 'agreement_date', offerData.agreement_date || new Date().toLocaleDateString());
  trySetField(form, 'purchase_price_number', `$${Number(offerData.purchase_price_number).toLocaleString()}`);
  trySetField(form, 'purchase_price_words',
    offerData.purchase_price_words || numberToWords(offerData.purchase_price_number));
  trySetField(form, 'initial_deposit', `$${Number(offerData.initial_deposit).toLocaleString()}`);
  trySetField(form, 'settlement_date', offerData.settlement_date);
  trySetField(form, 'seller_assist', offerData.seller_assist ? `$${Number(offerData.seller_assist).toLocaleString()}` : '');

  // --- Page 3: Inclusions & Financing ---
  if (offerData.included_items?.length) {
    trySetField(form, 'included_items', offerData.included_items.join(', '));
  }
  tryCheckBox(form, `financing_${offerData.financing_option}`, true);
  if (offerData.mortgage_amount) {
    trySetField(form, 'mortgage_amount', `$${Number(offerData.mortgage_amount).toLocaleString()}`);
  }
  tryCheckBox(form, 'mortgage_contingency', offerData.mortgage_contingency);

  // --- Page 5: Utilities ---
  tryCheckBox(form, 'water_public', offerData.water_type === 'public');
  tryCheckBox(form, 'water_well', offerData.water_type === 'well');
  tryCheckBox(form, 'sewer_public', offerData.sewer_type === 'public');
  tryCheckBox(form, 'sewer_septic', offerData.sewer_type === 'septic');

  // --- Pages 7-8: Inspections ---
  const inspections = ['home', 'radon', 'wdo', 'mold', 'septic', 'water_quality'];
  inspections.forEach((insp) => {
    const val = offerData[`inspection_${insp}`];
    tryCheckBox(form, `inspect_${insp}_elect`, val === 'elect');
    tryCheckBox(form, `inspect_${insp}_waive`, val === 'waive');
  });
  if (offerData.inspection_days) {
    trySetField(form, 'inspection_days', String(offerData.inspection_days));
  }

  // --- Agent Info ---
  trySetField(form, 'agent_name', offerData.agent_name);
  trySetField(form, 'broker_name', offerData.broker_name);
  trySetField(form, 'agent_license', offerData.agent_license);
  trySetField(form, 'agent_phone', offerData.agent_phone);
  trySetField(form, 'agent_email', offerData.agent_email);

  // Flatten form fields to prevent further editing (optional — comment out for editable PDF)
  // form.flatten();

  return pdfDoc.save();
}

async function generateDemoPDF(offerData) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const addPage = () => {
    const page = pdfDoc.addPage([612, 792]);
    return page;
  };

  const page = addPage();
  const { width, height } = page.getSize();

  const draw = (text, x, y, size = 10, f = font, color = rgb(0, 0, 0)) =>
    page.drawText(text, { x, y, size, font: f, color });

  // Header
  draw('PENNSYLVANIA AGREEMENT FOR SALE OF REAL ESTATE', 80, height - 50, 13, bold);
  draw('(Demo PDF — Upload PA ASR template to backend/templates/pa-asr-form.pdf)', 60, height - 68, 8, font, rgb(0.5, 0.5, 0.5));

  let y = height - 110;
  const row = (label, value) => {
    draw(label + ':', 50, y, 9, bold);
    draw(value || '—', 220, y, 9);
    y -= 18;
  };

  draw('PROPERTY', 50, y, 11, bold); y -= 20;
  row('Property Address', offerData.property_address);
  row('Municipality', offerData.municipality);
  row('County', offerData.county);
  row('ZIP', offerData.property_zip);
  row('Tax ID', offerData.tax_id);
  y -= 10;

  draw('PARTIES', 50, y, 11, bold); y -= 20;
  row('Buyer(s)', offerData.buyer_name);
  row('Buyer Mailing Address', offerData.buyer_address);
  row('Seller(s)', offerData.seller_name);
  row('Seller Mailing Address', offerData.seller_address);
  y -= 10;

  draw('FINANCIAL TERMS', 50, y, 11, bold); y -= 20;
  row('Purchase Price', `$${Number(offerData.purchase_price_number || 0).toLocaleString()}`);
  row('In Words', offerData.purchase_price_words || numberToWords(offerData.purchase_price_number || 0));
  row('Initial Deposit', `$${Number(offerData.initial_deposit || 0).toLocaleString()}`);
  row('Settlement Date', offerData.settlement_date);
  row('Seller Assist', offerData.seller_assist ? `$${Number(offerData.seller_assist).toLocaleString()}` : 'None');
  y -= 10;

  draw('FINANCING', 50, y, 11, bold); y -= 20;
  row('Financing Type', (offerData.financing_option || '').toUpperCase());
  row('Mortgage Amount', offerData.mortgage_amount ? `$${Number(offerData.mortgage_amount).toLocaleString()}` : 'N/A');
  row('Mortgage Contingency', offerData.mortgage_contingency ? 'Yes' : 'No');
  y -= 10;

  draw('UTILITIES', 50, y, 11, bold); y -= 20;
  row('Water', offerData.water_type);
  row('Sewer', offerData.sewer_type);
  y -= 10;

  draw('INCLUSIONS', 50, y, 11, bold); y -= 20;
  row('Included Items', Array.isArray(offerData.included_items) ? offerData.included_items.join(', ') : offerData.included_items);
  y -= 10;

  draw('INSPECTIONS', 50, y, 11, bold); y -= 20;
  ['home', 'radon', 'wdo', 'mold', 'septic', 'water_quality'].forEach((insp) => {
    const val = offerData[`inspection_${insp}`] || 'not specified';
    row(`  ${insp.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}`, val.toUpperCase());
  });
  y -= 10;

  draw('AGENT', 50, y, 11, bold); y -= 20;
  row('Agent Name', offerData.agent_name);
  row('Brokerage', offerData.broker_name);
  row('Agent Phone', offerData.agent_phone);
  row('Agent Email', offerData.agent_email);

  // Signature lines on bottom
  y = 80;
  page.drawLine({ start: { x: 50, y }, end: { x: 250, y }, thickness: 1 });
  page.drawLine({ start: { x: 350, y }, end: { x: 560, y }, thickness: 1 });
  draw('Buyer Signature / Date', 50, y - 14, 8);
  draw('Seller Signature / Date', 350, y - 14, 8);

  return pdfDoc.save();
}

module.exports = { fillPAAASRForm, numberToWords };
