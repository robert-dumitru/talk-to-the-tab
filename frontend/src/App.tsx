import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import "@/App.css";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReceiptList from "@/pages/ReceiptList";
import ReceiptUpload from "@/pages/ReceiptUpload";
import ReceiptEdit from "@/pages/ReceiptEdit";
import { LiveAPIProvider } from "@/contexts/LiveAPIContext";
import { type LiveClientOptions } from "@/types/genai";

interface UserData {
	name: string;
	email: string;
	picture: string;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
	throw new Error("set VITE_GEMINI_API_KEY in .env");
}

const apiOptions: LiveClientOptions = {
	apiKey: API_KEY,
};

function App() {
	const [user, setUser] = useState<UserData | null>(null);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const res = await fetch("http://localhost:8000/auth/me", {
					credentials: "include",
				});

				if (res.ok) {
					const data = await res.json();
					setUser(data.user);
				}
			} catch (error) {
				console.error("Failed to verify session:", error);
			}
		};

		checkAuth();
	}, []);

	return (
		<BrowserRouter>
			<LiveAPIProvider options={apiOptions}>
				<Routes>
					<Route
						path="/login"
						element={<Login user={user} onLogin={setUser} />}
					/>
					<Route
						path="/"
						element={
							<ProtectedRoute user={user}>
								<ReceiptList />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/upload"
						element={
							<ProtectedRoute user={user}>
								<ReceiptUpload />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/edit/:id"
						element={
							<ProtectedRoute user={user}>
								<ReceiptEdit />
							</ProtectedRoute>
						}
					/>
				</Routes>
			</LiveAPIProvider>
		</BrowserRouter>
	);
}

export default App;
