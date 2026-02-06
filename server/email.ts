import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true فقط مع 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  // ⬇️ مهم جدًا عشان ما يعلق السيرفر
  connectionTimeout: 10_000, // 10 seconds
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

export async function sendInvitationEmail({
  to,
  role,
  token,
  appUrl,
}: {
  to: string;
  role: string;
  token: string;
  appUrl: string;
}) {
  const inviteLink = `${appUrl}/accept-invitation?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: "You're invited to Komersh",
      html: `
        <h2>You have been invited</h2>
        <p>Role: <b>${role}</b></p>
        <p>Click the link below to accept the invitation:</p>
        <p>
          <a href="${inviteLink}">
            Accept invitation
          </a>
        </p>
        <br />
        <small>If you didn’t expect this email, you can ignore it.</small>
      `,
    });
  } catch (err) {
    console.error("❌ Failed to send invitation email:", err);
    throw err; // عشان API يرجع 500 واضح
  }
}
