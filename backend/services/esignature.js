// E-signature service — supports HelloSign (Dropbox Sign) and DocuSign
// Set ESIGN_PROVIDER in .env to "hellosign" or "docusign"

const PROVIDER = process.env.ESIGN_PROVIDER || 'hellosign';

// ── HelloSign (Dropbox Sign) ──────────────────────────────────────────────────

async function createHellosignEnvelope({ pdfBytes, signers, subject, message, ccEmails = [] }) {
  // Dropbox Sign REST API
  const FormData = require('form-data');
  const form = new FormData();

  form.append('file[0]', Buffer.from(pdfBytes), { filename: 'offer.pdf', contentType: 'application/pdf' });
  form.append('subject', subject);
  form.append('message', message);
  form.append('signing_redirect_url', process.env.FRONTEND_URL + '/offer-signed');
  form.append('test_mode', process.env.NODE_ENV !== 'production' ? '1' : '0');

  signers.forEach((signer, i) => {
    form.append(`signers[${i}][name]`, signer.name);
    form.append(`signers[${i}][email_address]`, signer.email);
    form.append(`signers[${i}][order]`, String(signer.order ?? i));
  });

  ccEmails.forEach((email, i) => {
    form.append(`cc_email_addresses[${i}]`, email);
  });

  const response = await fetch('https://api.hellosign.com/v3/signature_request/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.HELLOSIGN_API_KEY + ':').toString('base64')}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HelloSign error: ${err}`);
  }

  const data = await response.json();
  return {
    envelopeId: data.signature_request.signature_request_id,
    signingUrls: data.signature_request.signatures.map(s => ({
      email: s.signer_email_address,
      url: s.sign_url,
    })),
  };
}

// ── DocuSign ──────────────────────────────────────────────────────────────────

async function createDocuSignEnvelope({ pdfBytes, signers, subject }) {
  // DocuSign eSign REST API v2.1
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const baseUrl = `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}`;

  // JWT auth token would be obtained via DocuSign JWT Grant — simplified here
  const token = process.env.DOCUSIGN_ACCESS_TOKEN;

  const document = {
    documentBase64: Buffer.from(pdfBytes).toString('base64'),
    name: 'Agreement for Sale of Real Estate',
    fileExtension: 'pdf',
    documentId: '1',
  };

  const tabs = {
    signHereTabs: signers.map((s, i) => ({
      documentId: '1',
      pageNumber: '14',
      recipientId: String(i + 1),
      xPosition: s.role === 'buyer' ? '100' : '350',
      yPosition: '100',
    })),
    dateSignedTabs: signers.map((s, i) => ({
      documentId: '1',
      pageNumber: '14',
      recipientId: String(i + 1),
      xPosition: s.role === 'buyer' ? '100' : '350',
      yPosition: '140',
    })),
  };

  const envelope = {
    emailSubject: subject,
    documents: [document],
    recipients: {
      signers: signers.map((s, i) => ({
        name: s.name,
        email: s.email,
        recipientId: String(i + 1),
        routingOrder: String(s.order ?? i + 1),
        tabs,
      })),
    },
    status: 'sent',
  };

  const response = await fetch(`${baseUrl}/envelopes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(envelope),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DocuSign error: ${err}`);
  }

  const data = await response.json();
  return { envelopeId: data.envelopeId };
}

// ── Public interface ──────────────────────────────────────────────────────────

async function createSigningEnvelope(options) {
  if (PROVIDER === 'docusign') {
    return createDocuSignEnvelope(options);
  }
  return createHellosignEnvelope(options);
}

module.exports = { createSigningEnvelope };
