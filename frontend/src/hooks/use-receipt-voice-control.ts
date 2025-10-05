import { useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "@/lib/genai/live-client";
import type { Receipt } from "@/types/receipt";
import type { LiveServerToolCall } from "@google/genai";
import { FunctionResponseScheduling } from "@google/genai";
import { useReceiptStore } from "@/stores/receiptStore";
import type { ToolCall } from "@/stores/receiptStore";
import { receiptTools } from "@/lib/tools/receiptTools";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const SAMPLE_RATE = 16000;

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
}

/**
 * Unified hook for voice-controlled receipt editing.
 * Manages GenAI Live API client, microphone input, and tool call handling.
 */
export function useReceiptVoiceControl(
	receipt: Receipt | null,
): UseReceiptVoiceControlResult {
	const addToolCall = useReceiptStore((state) => state.addToolCall);

	// Create client once
	const client = useMemo(
		() => new GenAILiveClient({ apiKey: API_KEY }),
		[],
	);

	// Track connection state
	const [connected, setConnected] = useState(false);

	// Track audio resources
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const workletNodeRef = useRef<AudioWorkletNode | null>(null);

	// Setup and manage the entire voice control lifecycle
	useEffect(() => {
		if (!receipt) return;

		let isActive = true;

		// Build system instruction from receipt
		const receiptContext = receipt.items
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

		// Handle tool calls
		const handleToolCall = (toolCall: LiveServerToolCall) => {
			console.log("Received tool call:", toolCall);

			try {
				const functionCalls = toolCall.functionCalls || [];
				const functionResponses = functionCalls.map((fc) => {
					try {
						let args = fc.args || {};
						if (fc.name === "add_receipt_item" && !args.id) {
							args = { ...args, id: crypto.randomUUID() };
						}

						const localToolCall: ToolCall = {
							id: fc.id || crypto.randomUUID(),
							timestamp: Date.now(),
							functionName: fc.name || "",
							args,
						};

						addToolCall(localToolCall);

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

				if (functionResponses.length > 0) {
					client.sendToolResponse({ functionResponses });
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

					if (client && isActive) {
						client.sendRealtimeInput([
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
				client.on("toolcall", handleToolCall);
				client.on("open", () => {
					setConnected(true);
				});
				client.on("close", () => {
					setConnected(false);
				});

				await client.connect("models/gemini-2.0-flash-exp", {
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

			client.off("toolcall", handleToolCall);
			client.disconnect();

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
	}, [receipt, client, addToolCall]);

	return {
		connected,
	};
}
