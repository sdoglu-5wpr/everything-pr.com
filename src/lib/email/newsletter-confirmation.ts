// Branded HTML email for newsletter confirmation. Inline styles only —
// email clients do not reliably support external CSS, custom properties, or
// modern features like oklch.

const BRAND_BLACK = "#0a0a0a";
const BRAND_BLUE = "#2563eb";
const TEXT = "#1f2937";
const LOGO_URL = "https://everything-pr.com/everything-pr-logo.png";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG = "#f5f5f4";

export function renderNewsletterConfirmationEmail(): { subject: string; html: string; text: string } {
  const subject = "Welcome to Everything-PR — you're subscribed";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Georgia,'Times New Roman',serif;color:${TEXT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    You're in. Daily PR headlines, weekly long-form analysis, and proprietary research — straight to your inbox.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_BLACK};padding:28px 32px;text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1.1;">
                Everything-<span style="color:${BRAND_RED};">PR</span>
              </div>
              <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">
                Public Relations, decoded daily
              </div>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 16px 40px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND_RED};font-weight:700;">
                Subscription confirmed
              </div>
              <h1 style="margin:12px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;color:${BRAND_BLACK};font-weight:700;">
                Welcome to Everything-PR.
              </h1>
              <p style="margin:18px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:${TEXT};">
                You're officially on the list. Thanks for joining the PR professionals,
                comms leaders, and brand strategists who read us every morning.
              </p>
            </td>
          </tr>

          <!-- What to expect -->
          <tr>
            <td style="padding:24px 40px 8px 40px;">
              <div style="border-top:1px solid ${BORDER};padding-top:24px;">
                <h2 style="margin:0 0 14px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${BRAND_BLACK};font-weight:700;">
                  What lands in your inbox
                </h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};line-height:1.6;">
                      <strong style="color:${BRAND_BLACK};">Daily headlines</strong> — the PR moves that matter, every morning.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};line-height:1.6;">
                      <strong style="color:${BRAND_BLACK};">Weekly analysis</strong> — long-form takes on the week's biggest stories.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};line-height:1.6;">
                      <strong style="color:${BRAND_BLACK};">Proprietary research</strong> — original studies on agency spend, transparency, and influence.
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 40px 8px 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background:${BRAND_BLACK};">
                    <a href="https://everything-pr.com/" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Read today's headlines →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 32px 40px;">
              <div style="border-top:1px solid ${BORDER};padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
                You're receiving this because you subscribed at
                <a href="https://everything-pr.com/" style="color:${MUTED};text-decoration:underline;">everything-pr.com</a>.
                <br />
                If this wasn't you, you can safely ignore this email and you won't hear from us again.
              </div>
              <div style="margin-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};">
                © ${new Date().getUTCFullYear()} Everything-PR · The independent voice of public relations.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "Welcome to Everything-PR.",
    "",
    "You're officially on the list. Thanks for joining the PR professionals, comms leaders, and brand strategists who read us every morning.",
    "",
    "What lands in your inbox:",
    "  • Daily headlines — the PR moves that matter, every morning.",
    "  • Weekly analysis — long-form takes on the week's biggest stories.",
    "  • Proprietary research — original studies on agency spend, transparency, and influence.",
    "",
    "Read today's headlines: https://everything-pr.com/",
    "",
    "You're receiving this because you subscribed at everything-pr.com.",
    "If this wasn't you, you can safely ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
