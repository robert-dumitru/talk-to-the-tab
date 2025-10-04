import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import "@/App.css";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReceiptList from "@/pages/ReceiptList";
import ReceiptUpload from "@/pages/ReceiptUpload";
import ReceiptEdit from "@/pages/ReceiptEdit";

interface UserData {
	name: string;
	email: string;
	picture: string;
}

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

	const handleSignOut = async () => {
		try {
			await fetch("http://localhost:8000/auth/logout", {
				method: "POST",
				credentials: "include",
			});
		} catch (error) {
			console.error("Logout error:", error);
		}

		setUser(null);
	};

	return (
		<BrowserRouter>
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
		</BrowserRouter>
	);
}

export default App;
