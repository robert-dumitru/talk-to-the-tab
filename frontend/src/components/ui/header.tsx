import { useNavigate } from "react-router";
import { useReceiptStore } from "@/stores/receiptStore";

export function Header() {
	const navigate = useNavigate();
	const initialReceipt = useReceiptStore((state) => state.initialReceipt);
	const reset = useReceiptStore((state) => state.reset);

	const handleReset = () => {
		reset();
		navigate("/");
	};

	return (
		<header className="border-b border-slate-200 bg-white">
			<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
				<h1 className="text-lg font-light text-slate-900">Receipt Split</h1>

				<div className="flex items-center gap-3">
					{initialReceipt && (
						<button
							onClick={handleReset}
							className="px-3 py-1.5 text-xs font-light text-slate-700 border border-slate-300 rounded-sm hover:border-slate-400 transition-colors"
						>
							New Receipt
						</button>
					)}
				</div>
			</div>
		</header>
	);
}
