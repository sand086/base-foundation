from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    require_2fa: bool = False
    temp_token: Optional[str] = None
    user: Optional[dict] = None


class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str
    manual_entry_key: str


class TwoFactorVerifyRequest(BaseModel):
    code: str
    temp_token: Optional[str] = None


class TwoFactorEnableRequest(BaseModel):
    code: str
