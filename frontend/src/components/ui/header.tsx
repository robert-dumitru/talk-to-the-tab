import { useNavigate } from "react-router";
import { useReceiptStore } from "@/stores/receiptStore";

export function Header() {
	const navigate = useNavigate();
	const reset = useReceiptStore((state) => state.reset);

	const handleReset = () => {
		reset();
		navigate("/");
	};

	return (
		<header className="border-b border-slate-200 bg-white p-4 flex justify-center">
				<button onClick={handleReset} className="cursor-pointer">
				<h1 className="text-2xl font-light text-slate-900">Talk to the Tab</h1>
				</button>
		</header>
	);
}
