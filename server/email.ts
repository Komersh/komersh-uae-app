import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
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

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "You're invited to Komersh",
    html: `
      <h2>You have been invited</h2>
      <p>Role: <b>${role}</b></p>
      <p>Click the link below to accept the invitation:</p>
      <a href="${inviteLink}">${inviteLink}</a>
    `,
  });
}
