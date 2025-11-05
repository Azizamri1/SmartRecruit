import os
import smtplib
from email.message import EmailMessage
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@smartrecruit.tn")

def _smtp_enabled() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)

def _send_raw(to_email: str, subject: str, html: str, text: Optional[str] = None):
    msg = EmailMessage()
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(text or "")
    msg.add_alternative(html, subtype="html")
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)

def send_email(to_email: str, subject: str, html: str, text: Optional[str] = None):
    """
    If SMTP envs are missing, we just log to console (dev-friendly, no crash).
    """
    if not _smtp_enabled():
        print(f"[EMAIL:DRYRUN] to={to_email} subj={subject}\n{text or ''}\n{html}\n")
        return
    _send_raw(to_email, subject, html, text)

# Templates (minimal)
def tpl_submission(candidate_email: str, job_title: str):
    subj = f"Votre candidature a été reçue — {job_title}"
    txt = f"Bonjour,\n\nNous avons bien reçu votre candidature pour: {job_title}."
    html = f"<p>Bonjour,</p><p>Nous avons bien reçu votre candidature pour: <b>{job_title}</b>.</p>"
    return subj, html, txt

def tpl_decision(candidate_email: str, job_title: str, status: str):
    status_label = "Acceptée" if status == "accepted" else "Rejetée"
    subj = f"Mise à jour — {job_title} : {status_label}"
    txt = f"Bonjour,\n\nVotre candidature pour '{job_title}' a été {status_label.lower()}."
    html = f"<p>Bonjour,</p><p>Votre candidature pour <b>{job_title}</b> a été <b>{status_label}</b>.</p>"
    return subj, html, txt
