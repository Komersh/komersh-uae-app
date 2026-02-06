import { Resend } from "resend";

type SendInvitationArgs = {
  to: string;
  role: string;
  token: string;
  appUrl: string;
};

export async function sendInvitationEmail({ to, role, token, appUrl }: SendInvitationArgs) {
  const apiKey = process.env.RESEND_API_KEY;

  // ✅ لا تكسّر السيرفر لو المتغير ناقص
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing in environment variables");
  }

  const resend = new Resend(apiKey);

  const inviteLink = `${appUrl}/accept-invitation?token=${token}`;

  await resend.emails.send({
    from: process.env.MAIL_FROM || "Komersh <noreply@komersh.com>",
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
