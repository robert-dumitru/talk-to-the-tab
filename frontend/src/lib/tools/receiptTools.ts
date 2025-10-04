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
		],
	},
];
