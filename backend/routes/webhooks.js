const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const db       = require('../services/supabase');

// Dropbox Sign sends form-encoded bodies with a `payload` field (not JSON)
// so we mount urlencoded parsing just on this router.
router.use(express.urlencoded({ extended: true }));

// ── Status map — Dropbox Sign event → offer status ───────────────────────────
const EVENT_STATUS = {
  signature_request_all_signed:  'executed',
  signature_request_signed:      'partially_signed',
  signature_request_declined:    'declined',
  signature_request_canceled:    'draft',   // back to draft so agent can re-send
};

// ── Verify event hash ─────────────────────────────────────────────────────────
// Dropbox Sign computes: HMAC-SHA256(key=api_key, msg=event_time + raw_payload)
// and puts the hex digest in event.event_hash inside the payload.
function verifyHash(apiKey, rawPayload, eventTime, claimedHash) {
  const expected = crypto
    .createHmac('sha256', apiKey)
    .update(eventTime + rawPayload)
    .digest('hex');
  return expected === claimedHash;
}

// ── POST /api/webhooks/hellosign ──────────────────────────────────────────────
router.post('/hellosign', async (req, res) => {
  // Dropbox Sign requires exactly this response body on every 200
  const ack = () => res.status(200).send('Hello API Event Received');

  try {
    const rawPayload = req.body?.payload;
    if (!rawPayload) {
      console.warn('[Webhook] No payload field in request body');
      return ack();
    }

    let data;
    try { data = JSON.parse(rawPayload); }
    catch { console.warn('[Webhook] Could not parse payload JSON'); return ack(); }

    const { event, signature_request } = data;
    if (!event?.event_type) return ack();

    // ── Signature verification ───────────────────────────────────────────────
    const apiKey = process.env.HELLOSIGN_API_KEY || '';
    if (apiKey && event.event_hash) {
      if (!verifyHash(apiKey, rawPayload, String(event.event_time), event.event_hash)) {
        console.warn('[Webhook] Hash mismatch — possible spoofed request, ignoring');
        return ack();  // Still 200 so Dropbox Sign doesn't keep retrying
      }
    }

    const envelopeId = signature_request?.signature_request_id;
    const eventType  = event.event_type;
    console.log(`[Webhook] ${eventType}${envelopeId ? ' — ' + envelopeId : ''}`);

    // ── Map event → offer status update ─────────────────────────────────────
    const newStatus = EVENT_STATUS[eventType];
    if (newStatus && envelopeId) {
      try {
        await db.updateOfferByEnvelope(envelopeId, { status: newStatus });
        console.log(`[Webhook] Offer updated → ${newStatus} (envelope: ${envelopeId})`);
      } catch (dbErr) {
        // Log but don't fail — Supabase may not be configured in dev
        console.warn('[Webhook] DB update failed:', dbErr.message);
      }
    }
  } catch (err) {
    console.error('[Webhook] Unhandled error:', err.message);
  }

  return ack();
});

module.exports = router;
