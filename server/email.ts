import nodemailer from "nodemailer";

export type InvitationEmailArgs = {
  to: string;
  role: string;
  token: string;
  appUrl: string;
  tempPassword?: string;
};

export async function sendInvitationEmail({
  to,
  role,
  token,
  appUrl,
  tempPassword,
}: InvitationEmailArgs) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const link = `${appUrl}/accept-invitation?token=${token}`;

  await transporter.sendMail({
    from: `"Komersh" <${process.env.SMTP_FROM}>`,
    to,
    subject: "You're invited to Komersh",
    html: `
      <h2>You have been invited to Komersh</h2>
      <p>Role: <b>${role}</b></p>
      ${
        tempPassword
          ? `<p><b>Temporary password:</b> ${tempPassword}</p>`
          : ""
      }
      <p><a href="${link}">Click here to accept the invitation</a></p>
    `,
  });
}

// (اختياري بس مفيد)
export default sendInvitationEmail;
