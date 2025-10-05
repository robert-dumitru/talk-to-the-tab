import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Container } from "@/components/ui/container";
import { useAppStore } from "@/stores/appStore";
import { apiFetch } from "@/lib/utils";

export default function Login() {
	const user = useAppStore((state) => state.user);
	const setUser = useAppStore((state) => state.setUser);
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
				client_id: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
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
			const res = await apiFetch("/auth/google", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: response.credential }),
			});

			if (!res.ok) {
				throw new Error("Authentication failed");
			}

			const data = await res.json();
			setUser(data.user);
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
