import type { Tool, Type } from "@google/genai";

export const receiptTools: Tool[] = [
	{
		functionDeclarations: [
			{
				name: "add_receipt_item",
				description: "Adds a new item to the receipt with the specified name, price, and quantity.",
				parameters: {
					type: "OBJECT" as Type,
					properties: {
						name: {
							type: "STRING" as Type,
							description: "The name or description of the item",
						},
						price: {
							type: "NUMBER" as Type,
							description: "The price of a single unit of the item",
						},
						quantity: {
							type: "NUMBER" as Type,
							description: "The quantity of items purchased",
						},
					},
					required: ["name", "price", "quantity"],

				},
			},
			{
				name: "remove_receipt_item",
				description: "Removes an item from the receipt by its ID.",
				parameters: {
					type: "OBJECT" as Type,
					properties: {
						id: {
							type: "STRING" as Type,
							description: "The unique identifier of the item to remove",
						},
					},
					required: ["id"],
				},
			},
			{
				name: "update_receipt_item",
				description: "Updates an existing receipt item with new values for name, price, and/or quantity.",
				parameters: {
					type: "OBJECT" as Type,
					properties: {
						id: {
							type: "STRING" as Type,
							description: "The unique identifier of the item to update",
						},
						name: {
							type: "STRING" as Type,
							description: "The updated name or description of the item",
						},
						price: {
							type: "NUMBER" as Type,
							description: "The updated price of a single unit of the item",
						},
						quantity: {
							type: "NUMBER" as Type,
							description: "The updated quantity of items",
						},
					},
					required: ["id"],
				},
			},
			{
				name: "add_split",
				description: "Adds an absolute dollar amount split for an item, assigning a specific amount to a person.",
				parameters: {
					type: "OBJECT" as Type,
					properties: {
						itemId: {
							type: "STRING" as Type,
							description: "The ID of the receipt item to split",
						},
						person: {
							type: "STRING" as Type,
							description: "The name of the person this split is for",
						},
						amount: {
							type: "NUMBER" as Type,
							description: "The dollar amount in cents assigned to this person",
						},
					},
					required: ["itemId", "person", "amount"],
				},
			},
			{
				name: "add_proportional_split",
				description: "Adds a proportional split for an item, dividing it based on shares (e.g., 1/2, 2/3).",
				parameters: {
					type: "OBJECT" as Type,
					properties: {
						itemId: {
							type: "STRING" as Type,
							description: "The ID of the receipt item to split",
						},
						person: {
							type: "STRING" as Type,
							description: "The name of the person this split is for",
						},
						shares: {
							type: "NUMBER" as Type,
							description: "The number of shares this person gets (numerator)",
						},
						totalShares: {
							type: "NUMBER" as Type,
							description: "The total number of shares (denominator)",
						},
					},
					required: ["itemId", "person", "shares", "totalShares"],
				},
			},
			{
				name: "remove_split",
				description: "Removes a split by its ID.",
				parameters: {
					type: "OBJECT" as Type,
					properties: {
						id: {
							type: "STRING" as Type,
							description: "The unique identifier of the split to remove",
						},
					},
					required: ["id"],
				},
			},
		],
	},
];
