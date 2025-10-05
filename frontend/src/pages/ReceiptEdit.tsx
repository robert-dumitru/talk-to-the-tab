import { Receipt } from "@/components/ui/receipt";
import { Header } from "@/components/ui/header";
import { useReceiptStore } from "@/stores/receiptStore";
import { useReceiptVoiceControl } from "@/hooks/use-receipt-voice-control";

export default function ReceiptEdit() {
	const initialReceipt = useReceiptStore((state) => state.initialReceipt);

	// Set up voice control with initial receipt (stays stable across edits)
	const { connected, isEnabled, toggleMicrophone } = useReceiptVoiceControl(initialReceipt);

	if (!initialReceipt) {
		return (
			<div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
				<div className="text-gray-600 text-center">
					<p className="text-xl font-bold">No receipt loaded</p>
					<p>Please upload a receipt first</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Header />
			<div className="p-4">
				<div className="max-w-md mx-auto mb-4">
					<button
						onClick={toggleMicrophone}
						className={`w-full px-4 py-2 rounded-sm text-sm font-medium transition-all border ${
							isEnabled && connected
								? "bg-green-50 text-green-700 border-green-200"
								: isEnabled
									? "bg-yellow-50 text-yellow-700 border-yellow-200"
									: "bg-gray-50 text-gray-500 border-gray-200"
						}`}
					>
						{isEnabled && connected
							? "🎤 Listening"
							: isEnabled
								? "🎤 Connecting..."
								: "🎤 Click to Enable Voice Control"}
					</button>
				</div>
				<Receipt />
			</div>
		</div>
	);
}
