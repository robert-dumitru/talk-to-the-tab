import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import "@/App.css";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReceiptUpload from "@/pages/ReceiptUpload";
import ReceiptEdit from "@/pages/ReceiptEdit";
import { useAppStore } from "@/stores/appStore";

function App() {
	// This initializes the auth state on reload
	const setUser = useAppStore((state) => state.setUser);

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
	}, [setUser]);

	return (
		<BrowserRouter>
			<Routes>
				<Route
					path="/login"
					element={<Login />}
				/>
				<Route
					path="/"
					element={
						<ProtectedRoute>
							<ReceiptUpload />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/edit"
					element={
						<ProtectedRoute>
							<ReceiptEdit />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
