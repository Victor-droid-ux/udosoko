'use strict';

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[EMAIL - DEV MODE] To: ${to} | Subject: ${subject}`);
    return;
  }
  const nodemailer  = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from:    process.env.SMTP_FROM || `"UDUSOK PG Portal" <${process.env.SMTP_USER}>`,
    to, subject, html, text,
  });
}

function emailTemplate(title, body) {
  return `
  <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
  <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
    <div style="max-width:560px;margin:0 auto;background:white;border-radius:8px;overflow:hidden">
      <div style="background:#1a3a6b;padding:24px;text-align:center">
        <h2 style="color:white;margin:0">UDUSOK PG Admission Portal</h2>
        <p style="color:#aac4ff;margin:4px 0 0;font-size:13px">Usmanu Danfodiyo University Sokoto</p>
      </div>
      <div style="padding:32px">
        <h3 style="color:#1a3a6b">${title}</h3>
        ${body}
      </div>
      <div style="background:#f4f4f4;padding:16px;text-align:center;font-size:12px;color:#888">
        © ${new Date().getFullYear()} UDUSOK College of Postgraduate Studies. All rights reserved.
      </div>
    </div>
  </body></html>`;
}

exports.sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.SITE_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify Your Email — UDUSOK PG Portal',
    html: emailTemplate('Email Verification', `
      <p>Dear ${name},</p>
      <p>Thank you for registering on the UDUSOK Postgraduate Admission Portal.</p>
      <p>Please click the button below to verify your email address:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${url}" style="background:#1a3a6b;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Verify Email</a>
      </div>
      <p style="color:#888;font-size:12px">This link expires in 24 hours. If you did not register, ignore this email.</p>
    `),
  });
};

exports.sendApplicationConfirmation = async (email, name, appNumber) => {
  await sendEmail({
    to: email,
    subject: 'Application Received — UDUSOK PG Portal',
    html: emailTemplate('Application Submitted Successfully', `
      <p>Dear ${name},</p>
      <p>Your postgraduate application has been received successfully.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold">Application Number</td><td style="padding:8px">${appNumber}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold">Session</td><td style="padding:8px">2026/2027</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:bold">Status</td><td style="padding:8px;color:orange">Under Review</td></tr>
      </table>
      <p>Please keep your application number safe. You will be notified of any updates via email.</p>
    `),
  });
};

exports.sendAdmissionLetter = async (email, name, programme, appNumber) => {
  await sendEmail({
    to: email,
    subject: 'Congratulations! Admission Offer — UDUSOK PG',
    html: emailTemplate('Admission Offer Letter', `
      <p>Dear ${name},</p>
      <p>We are pleased to inform you that you have been offered provisional admission into the <strong>${programme}</strong> programme at the College of Postgraduate Studies, Usmanu Danfodiyo University Sokoto for the 2026/2027 academic session.</p>
      <p><strong>Application Number:</strong> ${appNumber}</p>
      <p>Please log in to your portal to accept this offer and complete your registration.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${process.env.SITE_URL || 'http://localhost:5000'}/login" style="background:#1a3a6b;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Login to Portal</a>
      </div>
    `),
  });
};

exports.sendPasswordReset = async (email, name, token) => {
  const url = `${process.env.SITE_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Password Reset — UDUSOK PG Portal',
    html: emailTemplate('Password Reset Request', `
      <p>Dear ${name},</p>
      <p>We received a request to reset your password. Click the button below:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${url}" style="background:#c8331a;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Reset Password</a>
      </div>
      <p style="color:#888;font-size:12px">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
    `),
  });
};
