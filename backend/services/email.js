const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOfferSigningRequest({ to, clientName, agentName, address, signingUrl }) {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'RealDraft AI'}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: `Your Offer for ${address} — Ready to Sign`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Hi ${clientName},</h2>
        <p>Your real estate offer for <strong>${address}</strong> has been prepared by <strong>${agentName}</strong> and is ready for your review and signature.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${signingUrl}" style="
            background: #2563eb;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
          ">Review & Sign Offer</a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy this link:<br>
          <a href="${signingUrl}">${signingUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="color: #999; font-size: 12px;">Sent by RealDraft AI on behalf of ${agentName}</p>
      </div>
    `,
  });
}

async function sendExecutedCopy({ to, name, address, pdfBuffer }) {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'RealDraft AI'}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: `Fully Executed Agreement — ${address}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Congratulations, ${name}!</h2>
        <p>All parties have signed the Agreement of Sale for <strong>${address}</strong>. Please find your fully executed copy attached.</p>
        <p>Keep this document for your records.</p>
      </div>
    `,
    attachments: [
      {
        filename: `Executed-Agreement-${address.replace(/\s+/g, '-')}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
      },
    ],
  });
}

module.exports = { sendOfferSigningRequest, sendExecutedCopy };
