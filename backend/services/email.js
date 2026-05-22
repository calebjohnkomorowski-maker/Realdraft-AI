const nodemailer = require('nodemailer');

/** Build a transporter — uses dynamic credentials if provided, falls back to .env */
function makeTransporter(smtpUser, smtpPass) {
  const user = smtpUser || process.env.SMTP_USER;
  const pass = smtpPass || process.env.SMTP_PASS;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });
}

/** Send the offer PDF as an email attachment directly to recipients. */
async function sendOfferPackage({ to, clientName, agentName, agentEmail, address, pdfBuffer, smtpUser, smtpPass }) {
  const transporter = makeTransporter(smtpUser, smtpPass);
  const fromEmail   = smtpUser || process.env.FROM_EMAIL || process.env.SMTP_USER;
  const fromName    = agentName  || process.env.FROM_NAME || 'RealDraft AI';
  const safeAddr    = (address || 'Property').replace(/[^a-zA-Z0-9\s-]/g, '').trim();

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    replyTo: agentEmail || fromEmail,
    subject: `Offer for ${address} — Please Review`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
        <h2>Hi ${clientName},</h2>
        <p>Please find attached the Agreement of Sale for <strong>${address}</strong>, prepared by <strong>${agentName}</strong>.</p>
        <p>Review the attached PDF and reply to this email with any questions.</p>
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
        <p style="color:#999; font-size:12px;">Sent via RealDraft AI on behalf of ${agentName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `Offer-${safeAddr}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
      },
    ],
  });
}

/** Send offer + signing link (e-signature flow). */
async function sendOfferSigningRequest({ to, clientName, agentName, agentEmail, address, signingUrl, smtpUser, smtpPass }) {
  const transporter = makeTransporter(smtpUser, smtpPass);
  const fromEmail   = smtpUser || process.env.FROM_EMAIL || process.env.SMTP_USER;
  const fromName    = agentName  || process.env.FROM_NAME || 'RealDraft AI';

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    replyTo: agentEmail || fromEmail,
    subject: `Your Offer for ${address} — Ready to Sign`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Hi ${clientName},</h2>
        <p>Your offer for <strong>${address}</strong> has been prepared by <strong>${agentName}</strong> and is ready for your signature.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${signingUrl}" style="background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">
            Review &amp; Sign Offer
          </a>
        </div>
        <p style="color:#666;font-size:14px;">If the button doesn't work: <a href="${signingUrl}">${signingUrl}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
        <p style="color:#999;font-size:12px;">Sent by RealDraft AI on behalf of ${agentName}</p>
      </div>
    `,
  });
}

/** Send fully executed copy with PDF attached. */
async function sendExecutedCopy({ to, name, address, pdfBuffer, smtpUser, smtpPass }) {
  const transporter = makeTransporter(smtpUser, smtpPass);
  const fromEmail   = smtpUser || process.env.FROM_EMAIL || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"RealDraft AI" <${fromEmail}>`,
    to,
    subject: `Fully Executed Agreement — ${address}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Congratulations, ${name}!</h2>
        <p>All parties have signed the Agreement of Sale for <strong>${address}</strong>. Your fully executed copy is attached.</p>
      </div>
    `,
    attachments: [
      {
        filename: `Executed-${address.replace(/\s+/g, '-')}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
      },
    ],
  });
}

/** Quick connection test — returns { ok, error }. */
async function testEmailConnection(smtpUser, smtpPass) {
  try {
    const t = makeTransporter(smtpUser, smtpPass);
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendOfferPackage, sendOfferSigningRequest, sendExecutedCopy, testEmailConnection };
