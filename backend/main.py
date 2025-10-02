from fastapi import FastAPI, Response, Cookie, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
import os

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
