import { Receipt } from "@/components/ui/receipt";
import { useReceiptStore } from "@/stores/receiptStore";
import { useReceiptVoiceControl } from "@/hooks/use-receipt-voice-control";

export default function ReceiptEdit() {
	const initialReceipt = useReceiptStore((state) => state.initialReceipt);

	// Set up voice control with initial receipt (stays stable across edits)
	const { connected } = useReceiptVoiceControl(initialReceipt);

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
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-center gap-4 mb-6">
					<h1 className="text-3xl font-bold">Edit Receipt</h1>
					<div
						className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
							connected
								? "bg-green-100 text-green-700"
								: "bg-gray-100 text-gray-500"
						}`}
					>
						{connected ? "🎤 Listening" : "Connecting..."}
					</div>
				</div>
				<Receipt />
			</div>
		</div>
	);
}
