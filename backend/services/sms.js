const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendOfferReadySMS({ to, clientName, agentName, address }) {
  const message = `Hi ${clientName}, your offer for ${address} is ready to review and sign. Check your email from ${agentName} for the signing link. — RealDraft AI`;

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_FROM_NUMBER,
    to,
  });
}

async function sendSignatureReminderSMS({ to, clientName, address }) {
  const message = `Reminder: your offer for ${address} is waiting for your signature. Please check your email. — RealDraft AI`;

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_FROM_NUMBER,
    to,
  });
}

async function sendExecutedNotificationSMS({ to, clientName, address }) {
  const message = `Great news ${clientName}! Your offer for ${address} has been fully executed by all parties. Check your email for the final copy. — RealDraft AI`;

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_FROM_NUMBER,
    to,
  });
}

module.exports = { sendOfferReadySMS, sendSignatureReminderSMS, sendExecutedNotificationSMS };
