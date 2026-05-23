const twilio = require('twilio');

// Lazy — only instantiate if credentials are actually set
function getClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || sid.startsWith('AC...') || !token || token === '...') {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env');
  }
  return twilio(sid, token);
}

async function sendOfferReadySMS({ to, clientName, agentName, address }) {
  const message = `Hi ${clientName}, your offer for ${address} is ready to review and sign. Check your email from ${agentName} for the signing link. — RealDraft AI`;
  return getClient().messages.create({ body: message, from: process.env.TWILIO_FROM_NUMBER, to });
}

async function sendSignatureReminderSMS({ to, clientName, address }) {
  const message = `Reminder: your offer for ${address} is waiting for your signature. Please check your email. — RealDraft AI`;
  return getClient().messages.create({ body: message, from: process.env.TWILIO_FROM_NUMBER, to });
}

async function sendExecutedNotificationSMS({ to, clientName, address }) {
  const message = `Great news ${clientName}! Your offer for ${address} has been fully executed by all parties. Check your email for the final copy. — RealDraft AI`;
  return getClient().messages.create({ body: message, from: process.env.TWILIO_FROM_NUMBER, to });
}

module.exports = { sendOfferReadySMS, sendSignatureReminderSMS, sendExecutedNotificationSMS };
