import { useState, useEffect, useRef } from 'react'
import './App.css'

interface UserData {
  name: string
  email: string
  picture: string
}

function App() {
  const [user, setUser] = useState<UserData | null>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://localhost:8000/auth/me', {
          credentials: 'include'
        })

        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Failed to verify session:', error)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (!window.google) return

      window.google.accounts.id.initialize({
        client_id: '406580829140-uj1esijhuvjruakt65bvcjlsfm0256pl.apps.googleusercontent.com',
        callback: handleCredentialResponse,
      })

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
        })
      }
    }

    // Wait for Google script to load
    if (window.google) {
      initializeGoogleSignIn()
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initializeGoogleSignIn()
          clearInterval(interval)
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [])

  const handleCredentialResponse = async (response: { credential: string }) => {
    try {
      // Send JWT token to backend for verification
      const res = await fetch('http://localhost:8000/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ token: response.credential })
      })

      if (!res.ok) {
        throw new Error('Authentication failed')
      }

      const data = await res.json()

      // Backend sets httpOnly cookie, just update UI state
      setUser(data.user)
    } catch (error) {
      console.error('Authentication error:', error)
      alert('Failed to authenticate with Google')
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('http://localhost:8000/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }

    setUser(null)
  }

  return (
    <>
      <div>
        <h1>Sign In with Google Demo</h1>
        {!user ? (
          <div>
            <p>Please sign in to continue</p>
            <div ref={buttonRef}></div>
          </div>
        ) : (
          <div>
            <img
              src={user.picture}
              alt={user.name}
              style={{ borderRadius: '50%', width: '96px', height: '96px' }}
            />
            <h2>Welcome, {user.name}!</h2>
            <p>Email: {user.email}</p>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        )}
      </div>
    </>
  )
}

export default App
