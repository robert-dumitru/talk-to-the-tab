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

		const systemInstruction = `You are a voice-controlled receipt editor. Your job is to listen to voice commands and modify the receipt using the available tools.

Current receipt items:
${receiptContext}

Available tools:
- add_receipt_item: Add a new item to the receipt (requires name, price in cents, quantity)
- remove_receipt_item: Remove an item by ID
- update_receipt_item: Update an existing item (requires ID, can update name, price, quantity)

IMPORTANT: You must ONLY respond using tool calls. Do not generate any text or audio responses. When you hear a command like "add coffee for 3 dollars", "remove the first item", or "change the price of milk to 5 dollars", immediately use the appropriate tool to make the change.`;

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
