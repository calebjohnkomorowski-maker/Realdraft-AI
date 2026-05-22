const express = require('express');
const router  = express.Router();
const { fillPAAASRForm }         = require('../services/pdf');
const { createSigningEnvelope }  = require('../services/esignature');
const { sendOfferPackage, sendOfferSigningRequest, testEmailConnection } = require('../services/email');
const { sendOfferReadySMS }      = require('../services/sms');
const db = require('../services/supabase');

// ── Preview PDF without saving ───────────────────────────────────────────────
router.post('/preview', async (req, res, next) => {
  try {
    const { offerData } = req.body;
    const pdfBytes = await fillPAAASRForm(offerData);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (err) { next(err); }
});

// ── Generate PDF and save to storage ────────────────────────────────────────
router.post('/generate', async (req, res, next) => {
  try {
    const { offerId, offerData } = req.body;
    const pdfBytes = await fillPAAASRForm(offerData);

    if (offerId) {
      const pdfUrl = await db.uploadPDF(offerId, 'offer', pdfBytes);
      await db.createDocument({ offer_id: offerId, type: 'offer', pdf_url: pdfUrl, signature_status: 'pending' });
      return res.json({ pdfUrl, offerId });
    }

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="offer.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (err) { next(err); }
});

// ── Test email connection ────────────────────────────────────────────────────
router.post('/test-email', async (req, res, next) => {
  try {
    const { smtpUser, smtpPass } = req.body;
    const result = await testEmailConnection(smtpUser, smtpPass);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Send package ─────────────────────────────────────────────────────────────
// Supports two modes:
//   mode: "email"   — attach PDF and send directly (no e-sign required)
//   mode: "esign"   — create signing envelope then email link
router.post('/send', async (req, res, next) => {
  try {
    const { offerId, offerData, signers, ccEmails, agentName, agentEmail, smtpUser, smtpPass, mode = 'email' } = req.body;

    // Build the PDF
    const dataToUse = offerData || (offerId ? (await db.getOffer(offerId))?.fields : null);
    if (!dataToUse) return res.status(400).json({ error: 'No offer data provided' });

    const pdfBytes = await fillPAAASRForm(dataToUse);
    const address  = dataToUse.property_address || 'Property';

    if (mode === 'email') {
      // ── Simple: email PDF as attachment ──
      for (const signer of signers) {
        if (signer.email) {
          await sendOfferPackage({
            to:         signer.email,
            clientName: signer.name,
            agentName,
            agentEmail,
            address,
            pdfBuffer:  pdfBytes,
            smtpUser,
            smtpPass,
          });
        }
        if (signer.phone) {
          try {
            await sendOfferReadySMS({ to: signer.phone, clientName: signer.name, agentName, address });
          } catch (smsErr) {
            console.warn('[SMS] not configured — skipping:', smsErr.message);
          }
        }
      }

      if (offerId) await db.updateOffer(offerId, { status: 'sent' });
      return res.json({ ok: true, mode: 'email', sentTo: signers.map(s => s.email).filter(Boolean) });
    }

    // ── E-sign mode ──────────────────────────────────────────────────────
    const subject  = `Agreement for Sale — ${address}`;
    const envelope = await createSigningEnvelope({
      pdfBytes, signers, subject,
      message: `Please review and sign your offer for ${address}.`,
      ccEmails,
    });

    if (offerId) await db.updateOffer(offerId, { status: 'sent', envelope_id: envelope.envelopeId });

    for (const signer of signers) {
      const signingUrl = envelope.signingUrls?.find(u => u.email === signer.email)?.url || '';
      if (signer.email) {
        await sendOfferSigningRequest({ to: signer.email, clientName: signer.name, agentName, agentEmail, address, signingUrl, smtpUser, smtpPass });
      }
      if (signer.phone) {
        try { await sendOfferReadySMS({ to: signer.phone, clientName: signer.name, agentName, address }); }
        catch (smsErr) { console.warn('[SMS] skipping:', smsErr.message); }
      }
    }

    res.json({ ok: true, mode: 'esign', envelopeId: envelope.envelopeId });
  } catch (err) { next(err); }
});

module.exports = router;
