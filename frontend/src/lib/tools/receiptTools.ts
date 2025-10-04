import type { Tool, Behavior } from "@google/genai";

/**
 * Tool declarations for receipt editing functionality.
 * These can be passed to the Gemini Live API configuration.
 */
export const receiptTools: Tool[] = [
	{
		functionDeclarations: [
			{name: "add_receipt_item"},
			{name: "remove_receipt_item"},
			{name: "update_receipt_item"},
		],
	},
];
