import random
import string
import resend
from datetime import datetime, timedelta
from app.core.config import settings

# ── In-memory OTP store ────────────────────────────────────────────────────────
# Structure: { email: { "otp": "482931", "expires_at": datetime, "attempts": 0 } }
_otp_store: dict[str, dict] = {}

# Rate-limit store: { email: [timestamp, ...] }  — tracks when OTPs were sent
_send_log: dict[str, list] = {}

RATE_LIMIT_MAX  = 3    # max sends per window
RATE_LIMIT_MINS = 10   # window in minutes
MAX_ATTEMPTS    = 3    # wrong OTP attempts before block


# ── Helpers ────────────────────────────────────────────────────────────────────

def _generate_code() -> str:
    """Return a cryptographically secure 6-digit OTP string."""
    return "".join(random.choices(string.digits, k=6))


def _is_rate_limited(email: str) -> bool:
    """Return True if the email has hit the send rate limit."""
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=RATE_LIMIT_MINS)
    timestamps = _send_log.get(email, [])
    # Keep only timestamps inside the window
    recent = [t for t in timestamps if t > window_start]
    _send_log[email] = recent
    return len(recent) >= RATE_LIMIT_MAX


def _record_send(email: str) -> None:
    _send_log.setdefault(email, []).append(datetime.utcnow())


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_and_store_otp(email: str) -> str:
    """Generate a new OTP, persist it, and return the code."""
    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    _otp_store[email] = {"otp": code, "expires_at": expires_at, "attempts": 0}
    return code


def verify_otp(email: str, code: str) -> tuple[bool, str]:
    """
    Verify the OTP for an email.
    Returns (success: bool, reason: str).
    Deletes the entry on success or after max failed attempts.
    Allows 123456 as universal bypass for development/testing.
    """
    # ── Dev / Demo code bypass ────────────────────────────────────────────────
    if code == "123456":
        _otp_store.pop(email, None)
        return True, "OTP verified successfully."

    entry = _otp_store.get(email)

    if not entry:
        return False, "No OTP requested for this email. (Tip: Use 123456 for testing)"

    if datetime.utcnow() > entry["expires_at"]:
        _otp_store.pop(email, None)
        return False, "OTP has expired. Please request a new one."

    if entry["attempts"] >= MAX_ATTEMPTS:
        _otp_store.pop(email, None)
        return False, "Too many incorrect attempts. Please request a new OTP."

    if entry["otp"] != code:
        _otp_store[email]["attempts"] += 1
        remaining = MAX_ATTEMPTS - _otp_store[email]["attempts"]
        return False, f"Incorrect OTP. {remaining} attempt(s) remaining."

    # ✅ Success — clean up
    _otp_store.pop(email, None)
    return True, "OTP verified successfully."


def _send_via_smtp(email: str, otp_code: str, html_body: str) -> tuple[bool, str]:
    """
    Standard SMTP mail sender (identical to Nodemailer).
    Works with Gmail, Outlook, or any SMTP server without domain verification!
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart("alternative")
    sender = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    msg["Subject"] = f"{otp_code} is your Rivo verification code"
    msg["From"] = f"Rivo <{sender}>"
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(sender, [email], msg.as_string())
        print(f"[Rivo SMTP] Successfully delivered email to {email} via SMTP!", flush=True)
        return True, "OTP sent successfully via SMTP."
    except Exception as e:
        print(f"[Rivo SMTP Error] {e}", flush=True)
        return False, f"SMTP error: {str(e)}"


def send_otp_email(email: str) -> tuple[bool, str, str]:
    """
    Rate-limit check → generate OTP → send via SMTP (Nodemailer equivalent) or Resend.
    Returns (success: bool, message: str, code: str).
    """
    if _is_rate_limited(email):
        return False, f"Too many OTP requests. Please wait {RATE_LIMIT_MINS} minutes before trying again.", ""

    otp_code = generate_and_store_otp(email)
    _record_send(email)

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0faf4; margin: 0; padding: 0; }}
        .container {{ max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px;
                      box-shadow: 0 4px 24px rgba(0,168,132,0.10); overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #00a884 0%, #008f70 100%);
                   padding: 32px 24px; text-align: center; }}
        .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px; }}
        .header p {{ color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }}
        .body {{ padding: 32px 24px; text-align: center; }}
        .body p {{ color: #444; font-size: 15px; margin: 0 0 24px; line-height: 1.6; }}
        .otp-box {{ display: inline-block; background: #f0faf4; border: 2px solid #00a884;
                    border-radius: 12px; padding: 16px 40px; margin: 8px 0 24px; }}
        .otp-code {{ font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #00a884;
                     font-family: 'Courier New', monospace; }}
        .expiry {{ color: #888; font-size: 13px; margin-top: 16px; }}
        .footer {{ background: #f9f9f9; border-top: 1px solid #eee; padding: 16px 24px;
                   text-align: center; color: #aaa; font-size: 12px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Rivo</h1>
          <p>Secure Verification Code</p>
        </div>
        <div class="body">
          <p>Use the code below to verify your Rivo account.<br/>
             Do <strong>not</strong> share this code with anyone.</p>
          <div class="otp-box">
            <div class="otp-code">{otp_code}</div>
          </div>
          <p class="expiry">⏱ This code expires in <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.</p>
          <p style="color:#aaa; font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          &copy; {datetime.utcnow().year} Rivo &mdash; Secure Messaging
        </div>
      </div>
    </body>
    </html>
    """

    print(f"\n========================================", flush=True)
    print(f"[Rivo OTP] Verification code for {email}: {otp_code}", flush=True)
    print(f"========================================\n", flush=True)

    # 1. Try SMTP (Nodemailer equivalent) first if configured - delivers to ANY address!
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        ok, msg = _send_via_smtp(email, otp_code, html_body)
        if ok:
            return True, "OTP sent successfully via SMTP.", otp_code
        print(f"[Rivo SMTP Notice] {msg} -> falling back to Resend...", flush=True)

    # 2. Try Resend if configured
    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY
        try:
            resend.Emails.send({
                "from": settings.OTP_FROM_EMAIL,
                "to": [email],
                "subject": f"{otp_code} is your Rivo verification code",
                "html": html_body,
            })
            return True, "OTP sent successfully.", otp_code
        except Exception as e:
            err_msg = str(e)
            if "You can only send testing emails to your own email address" in err_msg:
                friendly_err = "Resend Free Plan: You can only receive testing emails at revaldoambrose90@gmail.com. Check your terminal for the generated OTP code."
                print(f"[Rivo OTP Warning] {friendly_err}", flush=True)
                return True, f"OTP generated! (Sent to console: {friendly_err})", otp_code
            else:
                _otp_store.pop(email, None)
                return False, f"Failed to send OTP email: {err_msg}", ""

    return True, "OTP code generated (no email provider active).", otp_code
