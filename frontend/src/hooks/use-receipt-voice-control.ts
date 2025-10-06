import { useEffect, useRef, useState } from "react";
import { GenAILiveClient } from "@/lib/genai/live-client";
import type { Receipt, ItemSplit } from "@/types/receipt";
import type { LiveServerToolCall } from "@google/genai";
import { FunctionResponseScheduling } from "@google/genai";
import { useReceiptStore } from "@/stores/receiptStore";
import type { ToolCall } from "@/stores/receiptStore";
import { receiptTools } from "@/lib/tools/receiptTools";
import { useCurrentReceipt } from "@/hooks/use-current-receipt";
import type { SplitSummary } from "@/hooks/use-current-receipt";

const SAMPLE_RATE = 16000;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Fetch ephemeral token from backend
async function fetchEphemeralToken(): Promise<string> {
	const response = await fetch(`${BACKEND_URL}/ai/get-ephemeral-key`, {
		credentials: "include",
	});
	if (!response.ok) {
		throw new Error("Failed to fetch ephemeral token");
	}
	const data = await response.json();
	return data.token;
}

// AudioWorklet processor for microphone input
const MicrophoneWorklet = `
class MicrophoneProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      const samples = input[0];
      const pcm16 = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(pcm16.buffer);
    }
    return true;
  }
}
registerProcessor('microphone-processor', MicrophoneProcessor);
`;

export interface UseReceiptVoiceControlResult {
	connected: boolean;
	isEnabled: boolean;
	toggleMicrophone: () => void;
}

/**
 * Unified hook for voice-controlled receipt editing.
 * Manages GenAI Live API client, microphone input, and tool call handling.
 */
export function useReceiptVoiceControl(
	receipt: Receipt | null,
): UseReceiptVoiceControlResult {
	const addToolCall = useReceiptStore((state) => state.addToolCall);
	const addSplit = useReceiptStore((state) => state.addSplit);
	const removeSplit = useReceiptStore((state) => state.removeSplit);

	// Get current receipt state (with all edits applied)
	const { receipt: currentReceipt, splitSummary } = useCurrentReceipt();

	// Store current state in ref so handleToolCall always has latest values
	// without causing the effect to re-run on every edit
	const currentStateRef = useRef<{ receipt: Receipt | null; splitSummary: SplitSummary | null }>({
		receipt: currentReceipt,
		splitSummary,
	});
	currentStateRef.current = { receipt: currentReceipt, splitSummary };

	// Track microphone state locally
	const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

	// Track connection state
	const [connected, setConnected] = useState(false);

	// Client ref (will be initialized with ephemeral token)
	const clientRef = useRef<GenAILiveClient | null>(null);

	// Track audio resources
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const workletNodeRef = useRef<AudioWorkletNode | null>(null);

	// Setup and manage the entire voice control lifecycle
	useEffect(() => {
		if (!receipt || !microphoneEnabled) {
			setConnected(false);
			return;
		}

		let isActive = true;

		async function initializeClient() {
			try {
				// Fetch ephemeral token from backend
				const token = await fetchEphemeralToken();

				if (!isActive) return;

				// Create client with ephemeral token
				clientRef.current = new GenAILiveClient({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
			} catch (error) {
				console.error("Failed to initialize client:", error);
			}
		}

		// Build system instruction from receipt
		const receiptContext = receipt.items
			.map(
				(item) =>
					`- ${item.name}: $${(item.price / 100).toFixed(2)} (ID: ${item.id})`,
			)
			.join("\n");

		const systemInstruction = `You are a voice-controlled receipt editor with cost-splitting. Listen to commands and call the appropriate tools to satisfy each request.

INITIAL RECEIPT (before any edits):
${receiptContext}

RULES:
1. ONLY respond with tool calls - no text or audio output. Make tool calls as soon as a command is complete, and keep listening.
2. The receipt shown above is just the STARTING point - use get_current_receipt to see the current state with all edits applied
3. You can make MULTIPLE tool calls to satisfy a single user request (e.g., get_current_receipt to find an ID, then remove_receipt_item to delete it)
4. Prices are in CENTS (e.g., $3.50 = 350 cents, $1.00 = 100 cents)
5. Always call get_current_receipt BEFORE making edits when you need to know item IDs or check current state
6. Do not repeat tool calls - they are shown on the frontend

AVAILABLE TOOLS:
View State:
- get_current_receipt(): Get current receipt items and splits (use before editing when you need IDs)

Receipt Items:
- add_receipt_item(name, price, quantity): Add a new item
- remove_receipt_item(id): Remove an item by ID
- update_receipt_item(id, name?, price?, quantity?): Update an item

Cost Splitting:
- add_split(itemId, person, amount): Split item with absolute dollar amount in cents
- add_proportional_split(itemId, person, shares, totalShares): Split item by proportional shares
- remove_split(id): Remove a split by ID

EXAMPLES:

Adding Items (single tool call):
Command: "Add coffee for 3 dollars"
→ add_receipt_item(name="coffee", price=300, quantity=1)

Command: "Add two bagels at 2 fifty each"
→ add_receipt_item(name="bagels", price=250, quantity=2)

Removing/Updating Items (multiple tool calls):
Command: "Remove the tax item"
→ get_current_receipt()
→ remove_receipt_item(id="<ID from get_current_receipt>")

Command: "Change milk price to 4 dollars"
→ get_current_receipt()
→ update_receipt_item(id="<ID from get_current_receipt>", price=400)

Splitting Costs (multiple tool calls):
Command: "Split coffee with Alice for 2 dollars"
→ get_current_receipt()
→ add_split(itemId="<ID from get_current_receipt>", person="Alice", amount=200)

Command: "Split pizza evenly between Bob and Charlie"
→ get_current_receipt()
→ add_proportional_split(itemId="<ID>", person="Bob", shares=1, totalShares=2)
→ add_proportional_split(itemId="<ID>", person="Charlie", shares=1, totalShares=2)

Command: "Give Alice one third of the salad"
→ get_current_receipt()
→ add_proportional_split(itemId="<ID>", person="Alice", shares=1, totalShares=3)

Remember: Call get_current_receipt first when you need IDs. You can make multiple tool calls. Prices in cents.`;

		// Handle tool calls
		const handleToolCall = (toolCall: LiveServerToolCall) => {
			console.log("Received tool call:", toolCall);

			try {
				const functionCalls = toolCall.functionCalls || [];
				const functionResponses = functionCalls.map((fc) => {
					try {
						let args = fc.args || {};

						// Handle get_current_receipt - return current state
						if (fc.name === "get_current_receipt") {
							const items = currentStateRef.current.receipt?.items || [];
							const splits = currentStateRef.current.splitSummary?.splits || [];

							const itemsFormatted = items
								.map((item) => `${item.name} ($${(item.price / 100).toFixed(2)}) [ID: ${item.id}]`)
								.join(", ");

							const splitsFormatted = splits.length > 0
								? splits.map((split) => {
									const itemName = items.find(i => i.id === split.itemId)?.name || "Unknown";
									const amount = split.type === "absolute"
										? `$${((split.amount || 0) / 100).toFixed(2)}`
										: `${split.shares}/${split.totalShares}`;
									return `${itemName}: ${split.person} gets ${amount} [Split ID: ${split.id}]`;
								}).join(", ")
								: "No splits";

							return {
								id: fc.id,
								name: fc.name,
								response: {
									result: `Current Receipt Items: ${itemsFormatted}. Splits: ${splitsFormatted}`,
									scheduling: FunctionResponseScheduling.INTERRUPT,
								},
							};
						}

						// Handle receipt item tools
						if (fc.name === "add_receipt_item" && !args.id) {
							args = { ...args, id: crypto.randomUUID() };
						}

						// Handle split tools
						if (fc.name === "add_split") {
							addSplit({
								itemId: args.itemId as string,
								person: args.person as string,
								type: "absolute",
								amount: args.amount as number,
							});
						} else if (fc.name === "add_proportional_split") {
							addSplit({
								itemId: args.itemId as string,
								person: args.person as string,
								type: "proportional",
								shares: args.shares as number,
								totalShares: args.totalShares as number,
							});
						} else if (fc.name === "remove_split") {
							removeSplit(args.id as string);
						} else {
							// Handle receipt item edits
							const localToolCall: ToolCall = {
								id: fc.id || crypto.randomUUID(),
								timestamp: Date.now(),
								functionName: fc.name || "",
								args,
							};
							addToolCall(localToolCall);
						}

						return {
							id: fc.id,
							name: fc.name,
							response: {
								result: "ok",
								scheduling: FunctionResponseScheduling.SILENT,
							},
						};
					} catch (error) {
						console.error(`Error executing tool call ${fc.name}:`, error);
						return {
							id: fc.id,
							name: fc.name,
							response: {
								result: "error",
								scheduling: FunctionResponseScheduling.SILENT,
								error: error instanceof Error ? error.message : "Unknown error",
							},
						};
					}
				});

				if (functionResponses.length > 0 && clientRef.current) {
					clientRef.current.sendToolResponse({ functionResponses });
				}
			} catch (error) {
				console.error("Error handling tool call:", error);
			}
		};

		// Start microphone capture
		async function startMicrophone() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						sampleRate: SAMPLE_RATE,
						channelCount: 1,
						echoCancellation: true,
						noiseSuppression: true,
					},
				});

				if (!isActive) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}

				streamRef.current = stream;

				const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
				audioContextRef.current = audioContext;

				const workletBlob = new Blob([MicrophoneWorklet], {
					type: "application/javascript",
				});
				const workletUrl = URL.createObjectURL(workletBlob);

				await audioContext.audioWorklet.addModule(workletUrl);
				URL.revokeObjectURL(workletUrl);

				const source = audioContext.createMediaStreamSource(stream);
				const workletNode = new AudioWorkletNode(
					audioContext,
					"microphone-processor",
				);

				workletNodeRef.current = workletNode;

				workletNode.port.onmessage = (event: MessageEvent) => {
					const pcm16Buffer = event.data as ArrayBuffer;
					const bytes = new Uint8Array(pcm16Buffer);
					let binary = "";
					for (let i = 0; i < bytes.length; i++) {
						binary += String.fromCharCode(bytes[i]);
					}
					const base64 = btoa(binary);

					if (clientRef.current && isActive) {
						clientRef.current.sendRealtimeInput([
							{
								mimeType: "audio/pcm;rate=16000",
								data: base64,
							},
						]);
					}
				};

				source.connect(workletNode);
				console.log("Microphone started successfully");
			} catch (error) {
				console.error("Failed to start microphone:", error);
			}
		}

		// Connect to Live API
		async function connectToLiveAPI() {
			try {
				// Initialize client first
				await initializeClient();

				if (!clientRef.current || !isActive) return;

				const client = clientRef.current;

				client.on("toolcall", handleToolCall);
				client.on("open", () => {
					setConnected(true);
				});
				client.on("close", () => {
					setConnected(false);
				});

				await client.connect("gemini-live-2.5-flash-preview", {
					tools: receiptTools,
					systemInstruction: { parts: [{ text: systemInstruction }] },
				});

				console.log("Connected to Gemini Live API with tools");

				// Start microphone after connection
				await startMicrophone();
			} catch (error) {
				console.error("Failed to connect to Live API:", error);
			}
		}

		connectToLiveAPI();

		// Cleanup
		return () => {
			isActive = false;
			setConnected(false);

			if (clientRef.current) {
				clientRef.current.off("toolcall", handleToolCall);
				clientRef.current.disconnect();
			}

			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
				streamRef.current = null;
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
			workletNodeRef.current = null;
		};
	}, [receipt, microphoneEnabled, addToolCall, addSplit, removeSplit]);

	const toggleMicrophone = () => {
		setMicrophoneEnabled((prev) => !prev);
	};

	return {
		connected,
		isEnabled: microphoneEnabled,
		toggleMicrophone,
	};
}
