import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Receipt } from "@/components/ui/receipt";
import { useReceiptStore } from "@/stores/receiptStore";
import { useLiveAPIContext } from "@/contexts/LiveAPIContext";
import { useToolHandler } from "@/hooks/use-tool-handler";
import { useMicrophone } from "@/hooks/use-microphone";
import { receiptTools } from "@/lib/tools/receiptTools";

export default function ReceiptEdit() {
	const { id } = useParams<{ id: string }>();
	const [error, setError] = useState<string | null>(null);
	const setReceipt = useReceiptStore((state) => state.setReceipt);
	const setImageData = useReceiptStore((state) => state.setImageData);
	const initialReceipt = useReceiptStore((state) => state.initialReceipt);
	const { client, setConfig, connect, disconnect, connected } =
		useLiveAPIContext();

	// Set up tool handler
	useToolHandler(client);

	// Set up microphone input
	useMicrophone(client, connected);

	// Configure Live API with tools and system instruction
	useEffect(() => {
		if (!initialReceipt) return;

		const receiptContext = initialReceipt.items
			.map(
				(item) =>
					`- ${item.name}: $${(item.price / 100).toFixed(2)} (ID: ${item.id})`,
			)
			.join("\n");

		const systemInstruction = `You are a voice-controlled receipt editor. Listen to commands and make ONE tool call per command.

INITIAL RECEIPT (before any edits):
${receiptContext}

RULES:
1. ONLY respond with tool calls - no text or audio output. Make a tool call as soon as a command is complete, and keep listening.
2. The receipt shown above is just the STARTING point - assume all previous edits have been applied
3. Make exactly ONE tool call per user command, then STOP
4. Prices are in CENTS (e.g., $3.50 = 350 cents, $1.00 = 100 cents)
5. Use get_current_receipt when you need to check what items exist or their IDs
6. Do not repeat tool calls - they are shown on the frontend but not in the initial receipt

AVAILABLE TOOLS:
- add_receipt_item(name, price, quantity): Add a new item
- remove_receipt_item(id): Remove an item by ID
- update_receipt_item(id, name?, price?, quantity?): Update an item

EXAMPLES:

Command: "Add coffee for 3 dollars"
Tool Call: add_receipt_item(name="coffee", price=300, quantity=1)

Command: "Add two bagels at 2 fifty each"
Tool Call: add_receipt_item(name="bagels", price=250, quantity=2)

Command: "Remove the tax item"
Step 1: get_current_receipt() → see current items with IDs
Step 2: remove_receipt_item(id="<ID of TAX>")

Command: "Change milk price to 4 dollars"
Step 1: get_current_receipt() → find milk's ID
Step 2: update_receipt_item(id="<ID of milk>", price=400)

Remember: Use get_current_receipt to see edits. ONE tool call per command. Prices in cents.`;

		setConfig({
			tools: receiptTools,
			systemInstruction: { parts: [{ text: systemInstruction }] },
		});
	}, [setConfig, initialReceipt]);

	// Connect to Live API when receipt is loaded
	useEffect(() => {
		const connectToLiveAPI = async () => {
			if (!connected) {
				try {
					await connect();
					console.log("Connected to Gemini Live API with tools");
				} catch (error) {
					console.error("Failed to connect to Live API:", error);
				}
			}
		};

		connectToLiveAPI();

		// Disconnect when component unmounts
		return () => {
			if (connected) {
				disconnect();
			}
		};
	}, [connect, disconnect, connected]);

	useEffect(() => {
		const loadImage = () => {
			const storedImage = sessionStorage.getItem(`receipt_image_${id}`);
			if (storedImage) {
				setImageData(storedImage);
				processImage(storedImage);
			} else {
				setError("No image found");
			}
		};

		loadImage();
	}, [id, setImageData]);

	const processImage = async (imageData: string) => {
		try {
			const response = await fetch("http://localhost:8000/ai/ocr", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ image: imageData }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.detail || "OCR processing failed");
			}

			const data = await response.json();
			console.log("OCR Result:", data);
			setReceipt(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to process image");
		}
	};

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
				<div className="text-red-600 text-center">
					<p className="text-xl font-bold">Error</p>
					<p>{error}</p>
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
						{connected ? "🎤 Listening" : "Disconnected"}
					</div>
				</div>
				<Receipt />
			</div>
		</div>
	);
}
