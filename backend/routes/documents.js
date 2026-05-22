const express = require('express');
const router = express.Router();
const { fillPAAASRForm } = require('../services/pdf');
const { createSigningEnvelope } = require('../services/esignature');
const { sendOfferSigningRequest } = require('../services/email');
const { sendOfferReadySMS } = require('../services/sms');
const db = require('../services/supabase');

// Generate PDF from offer data
router.post('/generate', async (req, res, next) => {
  try {
    const { offerId, offerData } = req.body;

    const pdfBytes = await fillPAAASRForm(offerData);

    let pdfUrl = null;
    if (offerId) {
      pdfUrl = await db.uploadPDF(offerId, 'offer', pdfBytes);
      await db.createDocument({
        offer_id: offerId,
        type: 'offer',
        pdf_url: pdfUrl,
        signature_status: 'pending',
      });
    }

    // Return PDF as binary if no offerId, otherwise return URL
    if (!offerId) {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'inline; filename="offer-preview.pdf"');
      return res.send(Buffer.from(pdfBytes));
    }

    res.json({ pdfUrl, offerId });
  } catch (err) {
    next(err);
  }
});

// Preview PDF without saving
router.post('/preview', async (req, res, next) => {
  try {
    const { offerData } = req.body;
    const pdfBytes = await fillPAAASRForm(offerData);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    next(err);
  }
});

// Send signing package (e-sign + email + SMS)
router.post('/send', async (req, res, next) => {
  try {
    const { offerId, signers, ccEmails, agentName } = req.body;

    const offer = await db.getOffer(offerId);
    const pdfBytes = await fillPAAASRForm(offer.fields);

    const address = offer.properties?.address || offer.fields?.property_address;
    const subject = `Agreement for Sale — ${address}`;

    // Create e-signature envelope
    const envelope = await createSigningEnvelope({
      pdfBytes,
      signers,
      subject,
      message: `Please review and sign your offer for ${address}.`,
      ccEmails,
    });

    // Update offer status
    await db.updateOffer(offerId, { status: 'sent', envelope_id: envelope.envelopeId });

    // Send email + SMS to each signer
    for (const signer of signers) {
      const signingUrl = envelope.signingUrls?.find(u => u.email === signer.email)?.url || '';

      if (signer.email) {
        await sendOfferSigningRequest({
          to: signer.email,
          clientName: signer.name,
          agentName,
          address,
          signingUrl,
        });
      }

      if (signer.phone) {
        await sendOfferReadySMS({
          to: signer.phone,
          clientName: signer.name,
          agentName,
          address,
        });
      }
    }

    res.json({ ok: true, envelopeId: envelope.envelopeId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
