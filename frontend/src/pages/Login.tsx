import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Container } from "@/components/ui/container";

interface LoginProps {
	user: { name: string; email: string; picture: string } | null;
	onLogin: (userData: { name: string; email: string; picture: string }) => void;
}

export default function Login({ user, onLogin }: LoginProps) {
	const buttonRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (user) {
			navigate("/");
		}
	}, [user, navigate]);

	useEffect(() => {
		const initializeGoogleSignIn = () => {
			if (!window.google) return;

			window.google.accounts.id.initialize({
				client_id:
					"406580829140-uj1esijhuvjruakt65bvcjlsfm0256pl.apps.googleusercontent.com",
				callback: handleCredentialResponse,
			});

			if (buttonRef.current) {
				window.google.accounts.id.renderButton(buttonRef.current, {
					theme: "outline",
					size: "large",
					type: "standard",
				});
			}
		};

		if (window.google) {
			initializeGoogleSignIn();
		} else {
			const interval = setInterval(() => {
				if (window.google) {
					initializeGoogleSignIn();
					clearInterval(interval);
				}
			}, 100);
			return () => clearInterval(interval);
		}
	}, []);

	const handleCredentialResponse = async (response: { credential: string }) => {
		try {
			const res = await fetch("http://localhost:8000/auth/google", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ token: response.credential }),
			});

			if (!res.ok) {
				throw new Error("Authentication failed");
			}

			const data = await res.json();
			onLogin(data.user);
		} catch (error) {
			console.error("Authentication error:", error);
			alert("Failed to authenticate with Google");
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<Container>
					<div className="flex flex-col items-center gap-4">
						<h1 className="text-2xl font-light text-slate-900 tracking-tight">
							Please Sign In to Continue:
						</h1>
						<div ref={buttonRef}></div>
					</div>
				</Container>
			</div>
		</div>
	);
}
