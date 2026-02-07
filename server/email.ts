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
export async function sendInvitationEmail({
  to,
  role,
  token,
  appUrl,
  tempPassword,
}: {
  to: string;
  role: string;
  token: string;
  appUrl: string;
  tempPassword?: string;
}) {
  const inviteLink = `${appUrl}/accept-invitation?token=${token}`;
  const loginLink = `${appUrl}/login`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "You're invited to Komersh",
    html: `
      <h2>You have been invited</h2>
      <p>Role: <b>${role}</b></p>
      <p>Click the link below to accept the invitation:</p>
      <a href="${inviteLink}">${inviteLink}</a>

      ${
        tempPassword
          ? `
        <hr />
        <p><b>Temporary password:</b> <code>${tempPassword}</code></p>
        <p>Login here:</p>
        <a href="${loginLink}">${loginLink}</a>
        <p><b>Important:</b> Please change your password from Account page after logging in.</p>
      `
          : ""
      }
    `,
  });
}
