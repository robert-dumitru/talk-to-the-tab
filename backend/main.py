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

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# CORS configuration - adjust origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_CLIENT_ID = "406580829140-uj1esijhuvjruakt65bvcjlsfm0256pl.apps.googleusercontent.com"

class GoogleTokenRequest(BaseModel):
    token: str

class OCRRequest(BaseModel):
    image: str  # base64 encoded image data

class ReceiptItem(BaseModel):
    id: str
    name: str
    price: int  # price in cents
    taxed: bool

# Schema for Gemini structured output (without id field)
class ReceiptItemRaw(BaseModel):
    name: str
    price: int  # price in cents
    taxed: bool

class ReceiptItemsRaw(BaseModel):
    items: list[ReceiptItemRaw]
    tax: int = 0  # tax amount in cents
    tip: int = 0  # tip amount in cents

class OCRResponse(BaseModel):
    items: list[ReceiptItem]
    tax: int  # tax amount in cents
    tip: int  # tip amount in cents

# In-memory session store (use Redis or database in production)
sessions = {}

@app.post("/auth/google")
async def verify_google_token(request: GoogleTokenRequest, response: Response):
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Extract user info
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')

        # Store session data
        sessions[google_id] = {
            "google_id": google_id,
            "email": email,
            "name": name,
            "picture": picture
        }

        # Set httpOnly cookie with the google_id
        # In production, use Secure=True and proper domain
        response.set_cookie(
            key="session",
            value=google_id,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=3600  # 1 hour
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

    # Look up user in session store
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

        # Remove data URL prefix if present
        image_data = request.image.split(",")[1] if "," in request.image else request.image

        # Decode base64 string to bytes
        image_bytes = base64.b64decode(image_data)

        prompt = """
            Extract all items from this receipt.
            Rules:
            - price must be in cents (multiply dollars by 100)
            - taxed should be true for items that have tax applied
            - Extract tax amount separately (in cents). If no tax is shown, set to 0
            - Extract tip amount separately (in cents). If no tip is shown, set to 0
            - The items array should only contain line items, not tax or tip
            - Return structured JSON matching the schema
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
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

        # Parse and validate response with Pydantic
        if not response.text:
            raise HTTPException(status_code=500, detail="Empty response from OCR")
        parsed_data = ReceiptItemsRaw.model_validate_json(response.text)

        # Add IDs to items
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
            tax=parsed_data.tax,
            tip=parsed_data.tip
        )

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"OCR processing failed")

@app.get("/ai/get-ephemeral-key")
async def get_ephemeral_key(session: str = Cookie(None)):
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
        from datetime import datetime, timedelta, timezone

        client = genai.Client(api_key=api_key)

        # Calculate expiration times
        now = datetime.now(timezone.utc)
        expire_time = now + timedelta(minutes=30)
        new_session_expire_time = now + timedelta(minutes=1)

        # Create ephemeral token
        token_response = client.auth_tokens.create(
            config=types.CreateAuthTokenConfig(
                expire_time=expire_time,
                new_session_expire_time=new_session_expire_time,
                uses=1,  # Single use token
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
