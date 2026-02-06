import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  await resend.emails.send({
    from: process.env.MAIL_FROM!, // Komersh <noreply@send.komersh.com>
    to,
    subject: "You're invited to Komersh",
    html: `
      <h2>You have been invited to Komersh</h2>
      <p>Role: <b>${role}</b></p>
      <p>Click the link below to accept the invitation:</p>
      <a href="${inviteLink}">${inviteLink}</a>
    `,
  });
}
