# backend/app/services/email_service.py
from email.message import EmailMessage
from email.utils import formataddr
import smtplib
import socket
import logging
from typing import Optional, Tuple
from ..config import settings

log = logging.getLogger("smartrecruit.email")

SENDER_TUPLE = (settings.EMAIL_FROM_NAME or "TT SmartRecruit", settings.EMAIL_FROM)

def _build_message(to_email: str, subject: str, html: str, text: Optional[str] = None) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr(SENDER_TUPLE)
    msg["To"] = to_email
    msg["Subject"] = subject
    # Plain first, then HTML alternative
    msg.set_content(text or "", subtype="plain", charset="utf-8")
    msg.add_alternative(html or "<html><body></body></html>", subtype="html", charset="utf-8")
    return msg

def send_email(to_email: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """
    Synchronous sender; safe to schedule via BackgroundTasks.
    Returns True if accepted (including DRY_RUN), False on failure.
    """
    msg = _build_message(to_email, subject, html, text)

    # DRY RUN (dev/test) — logs but does not connect
    if settings.EMAIL_DRY_RUN or not settings.SMTP_SERVER:
        log.info("[EMAIL:DRYRUN] to=%s subj=%s from=%s", to_email, subject, SENDER_TUPLE[1])
        return True

    try:
        if settings.SMTP_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=15) as s:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=15) as s:
                s.ehlo()
                if settings.SMTP_STARTTLS:
                    s.starttls()
                    s.ehlo()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)
        log.info("[EMAIL:sent] to=%s subj=%s", to_email, subject)
        return True
    except (smtplib.SMTPException, OSError, socket.timeout) as e:
        log.error("[EMAIL:error] to=%s subj=%s err=%r", to_email, subject, e)
        return False

# ------------------ Templates (concise, name-aware) ------------------ #

def tpl_submission(candidate_name: str, job_title: str, company_name: Optional[str] = None,
                   application_url: Optional[str] = None) -> Tuple[str, str, str]:
    company = f" chez {company_name}" if company_name else ""
    subj = f"Candidature reçue — {job_title}"
    greeting = f"Bonjour {candidate_name}," if candidate_name else "Bonjour,"
    body = (
        f"{greeting}\n\n"
        f"Nous avons bien reçu votre candidature pour le poste « {job_title} »{company}."
        " Notre équipe va l’examiner et vous reviendra rapidement.\n\n"
        f"{('Consulter votre dossier : ' + application_url) if application_url else ''}\n\n"
        "— TT SmartRecruit"
    )
    html = f"""
    <html><body>
      <p>{greeting}</p>
      <p>Nous avons bien reçu votre candidature pour le poste <b>{job_title}</b>{company}.
         Notre équipe va l’examiner et vous reviendra rapidement.</p>
      {f'<p><a href="{application_url}">Consulter votre dossier</a></p>' if application_url else ''}
      <p>— TT SmartRecruit</p>
    </body></html>
    """
    return subj, html, body

def tpl_decision(candidate_name: str, job_title: str, status: str,
                 company_name: Optional[str] = None, next_steps_url: Optional[str] = None) -> Tuple[str, str, str]:
    company = f" chez {company_name}" if company_name else ""
    status_label = "acceptée" if status == "accepted" else "rejetée"
    subj = f"Mise à jour — {job_title} : {status_label.capitalize()}"
    greeting = f"Bonjour {candidate_name}," if candidate_name else "Bonjour,"
    if status == "accepted":
        extra = f'Prochaine étape : <a href="{next_steps_url}">compléter votre dossier</a>.' if next_steps_url else ""
        ptxt  = f"Prochaine étape : {next_steps_url}\n" if next_steps_url else ""
    else:
        extra = "Vous pouvez continuer à postuler à d’autres offres qui vous correspondent."
        ptxt  = extra + "\n"
    body = (
        f"{greeting}\n\n"
        f"Votre candidature pour « {job_title} »{company} a été {status_label}.\n"
        f"{ptxt}\n"
        "Merci pour votre intérêt.\n\n"
        "— TT SmartRecruit"
    )
    html = f"""
    <html><body>
      <p>{greeting}</p>
      <p>Votre candidature pour <b>{job_title}</b>{company} a été <b>{status_label}</b>.</p>
      <p>{extra}</p>
      <p>Merci pour votre intérêt.</p>
      <p>— TT SmartRecruit</p>
    </body></html>
    """
    return subj, html, body

def applicant_display_name(*, user=None, application=None) -> str:
    # Fallback logic if needed; keep here so templates can be name-aware everywhere.
    if user and getattr(user, "full_name", None):
        return user.full_name
    if user and getattr(user, "first_name", None):
        fn = user.first_name or ""
        ln = getattr(user, "last_name", "") or ""
        nm = (fn + " " + ln).strip()
        if nm:
            return nm
    if user and getattr(user, "email", None):
        return user.email.split("@", 1)[0]
    return "candidat"
