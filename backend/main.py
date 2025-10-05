from fastapi import FastAPI, Response, Cookie, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import secrets
import json
import base64

load_dotenv()

app = FastAPI()

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]

IS_PROD = len([origin for origin in allowed_origins if origin != "http://localhost:5173"]) > 0

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise Exception("GOOGLE_OAUTH_CLIENT_ID not set in environment")

class GoogleTokenRequest(BaseModel):
    token: str

class OCRRequest(BaseModel):
    image: str

class ReceiptItem(BaseModel):
    id: str
    name: str
    price: int # price in cents
    taxed: bool

class ReceiptItemRaw(BaseModel):
    name: str
    price: int  
    taxed: bool

class ReceiptItemsRaw(BaseModel):
    items: list[ReceiptItemRaw]

class OCRResponse(BaseModel):
    items: list[ReceiptItem]

# TODO: this should be in the DB (but it's not too bad here because most stuff happens client-side)
sessions = {}

@app.post("/auth/google")
async def verify_google_token(request: GoogleTokenRequest, response: Response):
    try:
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')

        sessions[google_id] = {
            "google_id": google_id,
            "email": email,
            "name": name,
            "picture": picture
        }

        response.set_cookie(
            key="session",
            value=google_id,
            httponly=True,
            secure=True if IS_PROD else False,
            samesite="lax",
            max_age=3600
        )

        return {
            "success": True,
            "user": {
                "email": email,
                "name": name,
                "picture": picture
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/auth/me")
async def get_current_user(session: str = Cookie(None)):
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # TODO: this lookup should be from the db
    user_data = sessions.get(session)
    if not user_data:
        raise HTTPException(status_code=401, detail="Session expired")

    return {"user": {
        "email": user_data["email"],
        "name": user_data["name"],
        "picture": user_data["picture"]
    }}

@app.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="session")
    return {"success": True}

@app.post("/ai/ocr")
async def ocr_receipt(request: OCRRequest, session: str = Cookie(None)):
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_data = sessions.get(session)
    if not user_data:
        raise HTTPException(status_code=401, detail="Session expired")

    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    try:
        client = genai.Client(api_key=api_key)

        # Decode base64 image
        image_data = request.image.split(",")[1] if "," in request.image else request.image
        image_bytes = base64.b64decode(image_data)

        prompt = """
            Extract all items from this receipt.
            Rules:
            - price must be in cents (multiply dollars by 100)
            - taxed should be true for items that have tax applied
            - Always make a special item called "TAX". If no tax is shown, set to 0
            - Always make a special item called "TIP". If no tip is shown, set to 0
            - Return structured JSON matching the schema
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                prompt,
                types.Part.from_bytes(
                    mime_type="image/jpeg",
                    data=image_bytes,
                ),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReceiptItemsRaw,
            ),
        )

        if not response.text:
            raise HTTPException(status_code=500, detail="Empty response from OCR")
        parsed_data = ReceiptItemsRaw.model_validate_json(response.text)

        items_with_ids = [
            ReceiptItem(
                id=secrets.token_hex(4),
                name=item.name,
                price=item.price,
                taxed=item.taxed
            )
            for item in parsed_data.items
        ]

        return OCRResponse(
            items=items_with_ids,
        )

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"OCR processing failed")

@app.get("/ai/get-ephemeral-key")
async def get_ephemeral_key(session: str = Cookie(None)):
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # TODO: this lookup should be from the db
    user_data = sessions.get(session)
    if not user_data:
        raise HTTPException(status_code=401, detail="Session expired")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    try:
        from datetime import datetime, timedelta, timezone

        client = genai.Client(api_key=api_key)

        now = datetime.now(timezone.utc)
        expire_time = now + timedelta(minutes=30)
        new_session_expire_time = now + timedelta(minutes=1)

        token_response = client.auth_tokens.create(
            config=types.CreateAuthTokenConfig(
                expire_time=expire_time,
                new_session_expire_time=new_session_expire_time,
                uses=1, 
                http_options=types.HttpOptions(
                    api_version="v1alpha",
                )
            )
        )

        return {
            "token": token_response.name,
            "expires_at": expire_time.isoformat()
        }
    except Exception as e:
        print(f"Error creating ephemeral token: {e}")
        raise HTTPException(status_code=500, detail="Failed to create ephemeral token")
