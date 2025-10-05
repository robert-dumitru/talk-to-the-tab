import { useNavigate } from "react-router";
import { useReceiptStore } from "@/stores/receiptStore";
import { useAppStore } from "@/stores/appStore";

interface HeaderProps {
	microphoneConnected: boolean;
}

export function Header({ microphoneConnected }: HeaderProps) {
	const navigate = useNavigate();
	const initialReceipt = useReceiptStore((state) => state.initialReceipt);
	const microphoneEnabled = useAppStore((state) => state.microphoneEnabled);
	const setMicrophoneEnabled = useAppStore((state) => state.setMicrophoneEnabled);
	const reset = useReceiptStore((state) => state.reset);

	const handleReset = () => {
		reset();
		navigate("/");
	};

	const toggleMicrophone = () => {
		setMicrophoneEnabled(!microphoneEnabled);
	};

	return (
		<header className="border-b border-slate-200 bg-white">
			<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
				<h1 className="text-lg font-light text-slate-900">Receipt Split</h1>

				<div className="flex items-center gap-3">
						<button
							onClick={toggleMicrophone}
							className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all border ${
								microphoneEnabled && microphoneConnected
									? "bg-green-50 text-green-700 border-green-200"
									: microphoneEnabled
										? "bg-yellow-50 text-yellow-700 border-yellow-200"
										: "bg-gray-50 text-gray-500 border-gray-200"
							}`}
						>
							{microphoneEnabled && microphoneConnected
								? "🎤 Listening"
								: microphoneEnabled
									? "🎤 Connecting..."
									: "🎤 Off"}
						</button>

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
