import { Receipt } from "@/components/ui/receipt";
import { Header } from "@/components/ui/header";
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
		<div className="min-h-screen bg-gray-50">
			<Header microphoneConnected={connected} />
			<div className="p-4">
				<Receipt />
			</div>
		</div>
	);
}
