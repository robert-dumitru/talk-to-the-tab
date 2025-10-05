import { Navigate } from "react-router";
import { useAppStore } from "@/stores/appStore";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export default function ProtectedRoute({
	children,
}: ProtectedRouteProps) {
	const user = useAppStore((state) => state.user);
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
