import { Resend } from "resend";

async function sendInvitationEmail({
  to,
  role,
  token,
  appUrl,
  from,
  tempPassword,
}: {
  to: string;
  role: string;
  token: string;
  appUrl: string;
  from: string;
  tempPassword?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const link = `${appUrl}/accept-invitation?token=${token}`;

  const subject = "You're invited to Komersh";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>You're invited to Komersh</h2>
      <p><b>Role:</b> ${role}</p>
      ${tempPassword ? `<p><b>Temporary password:</b> ${tempPassword}</p>` : ""}
      <p>Click the link below to accept the invitation:</p>
      <p><a href="${link}">${link}</a></p>
    </div>
  `;

  await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}

// ✅ THIS is the important part for CJS bundle
module.exports = { sendInvitationEmail };
