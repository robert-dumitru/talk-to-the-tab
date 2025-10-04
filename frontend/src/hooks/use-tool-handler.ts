import { useEffect } from "react";
import type { GenAILiveClient } from "@/lib/genai/live-client";
import type { LiveServerToolCall } from "@google/genai";
import { useReceiptStore } from "@/stores/receiptStore";
import type { ToolCall } from "@/stores/receiptStore";

/**
 * Hook to handle tool calls from the Gemini Live API.
 * Listens for tool call events, applies them to the receipt store,
 * and sends responses back to the API.
 */
export function useToolHandler(client: GenAILiveClient | null) {
	const applyToolCall = useReceiptStore((state) => state.applyToolCall);

	useEffect(() => {
		if (!client) return;

		const handleToolCall = (toolCall: LiveServerToolCall) => {
			console.log("Received tool call:", toolCall);

			try {
				// Extract function calls from the tool call
				const functionCalls = toolCall.functionCalls || [];

				// Process each function call
				const functionResponses = functionCalls.map((fc) => {
					try {
						// Convert to our ToolCall format and apply to store
						const localToolCall: ToolCall = {
							id: fc.id || crypto.randomUUID(),
							timestamp: Date.now(),
							functionName: fc.name || "",
							args: fc.args || {},
						};

						applyToolCall(localToolCall);

						// Return success response
						return {
							id: fc.id,
							response: {
								success: true,
								message: `Successfully executed ${fc.name}`,
							},
						};
					} catch (error) {
						console.error(`Error executing tool call ${fc.name}:`, error);
						return {
							id: fc.id,
							response: {
								success: false,
								error:
									error instanceof Error ? error.message : "Unknown error",
							},
						};
					}
				});

				// Send responses back to the API
				if (functionResponses.length > 0) {
					client.sendToolResponse({ functionResponses });
				}
			} catch (error) {
				console.error("Error handling tool call:", error);
			}
		};

		// Register the event handler
		client.on("toolcall", handleToolCall);

		// Cleanup on unmount
		return () => {
			client.off("toolcall", handleToolCall);
		};
	}, [client, applyToolCall]);
}
