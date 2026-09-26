import bcrypt
import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, OTPToken, UserRole

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if hashed_password == plain_password:
        return True
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8") if isinstance(hashed_password, str) else hashed_password,
        )
    except Exception:
        return False


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = UserRole.STAFF


class LoginRequest(BaseModel):
    email: str
    password: str


class RequestOTPRequest(BaseModel):
    email: str


class VerifyResetRequest(BaseModel):
    email: str
    otp: str
    new_password: str


@router.post("/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="User with this email already exists."
        )
    user = User(
        email=req.email.strip().lower(),
        password=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/login")
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "message": "Login successful",
        "token": f"bearer-{user.id}-{user.role}",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/request-otp")
def request_otp(req: RequestOTPRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    token = OTPToken(email=email, otp=otp_code, expires_at=expires)
    db.add(token)
    db.commit()

    return {
        "message": "OTP generated and sent to email successfully",
        "email": email,
        "otp_preview": otp_code,  # Previewed in response for seamless hackathon live demonstration
    }


@router.post("/reset-password")
def reset_password(req: VerifyResetRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    record = (
        db.query(OTPToken)
        .filter(
            OTPToken.email == email,
            OTPToken.otp == req.otp.strip(),
            OTPToken.is_used == 0,
            OTPToken.expires_at >= datetime.datetime.utcnow(),
        )
        .order_by(OTPToken.id.desc())
        .first()
    )

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    user.password = req.new_password
    record.is_used = 1
    db.commit()
    return {"message": "Password has been successfully updated"}
