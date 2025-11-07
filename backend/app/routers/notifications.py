from fastapi import APIRouter, HTTPException
from pydantic import EmailStr
from ..services.email_service import send_email, tpl_decision

router = APIRouter()

@router.post("/test/email")
def test_email(
    recipient: EmailStr = "test@example.com",
    status: str = "accepted",
    full_name: str = "Test User"
):
    """
    Test email functionality by sending a status email.
    Query params: recipient, status (accepted/rejected/pending), full_name
    """
    if status not in ["accepted", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        subj, html, txt = tpl_decision(
            candidate_name=full_name,
            job_title="Test Job",
            status=status,
            company_name="Test Company",
            next_steps_url=None,
        )
        success = send_email(recipient, subj, html, txt)
        if success:
            return {"message": "Test email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
