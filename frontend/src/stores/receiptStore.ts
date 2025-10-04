import { create } from "zustand";
import type { Receipt, ReceiptItem } from "@/types/receipt";

export interface ToolCall {
	id: string;
	timestamp: number;
	functionName: string;
	args: Record<string, unknown>;
}

interface ReceiptStore {
	initialReceipt: Receipt | null;
	currentReceipt: Receipt | null;
	imageData: string | null;
	editHistory: ToolCall[];

	setReceipt: (receipt: Receipt) => void;
	setImageData: (imageData: string) => void;
	addItem: (item: Omit<ReceiptItem, "id">) => void;
	removeItem: (id: string) => void;
	updateItem: (id: string, changes: Partial<Omit<ReceiptItem, "id">>) => void;
	reset: () => void;
	applyToolCall: (toolCall: ToolCall) => void;
}

export const useReceiptStore = create<ReceiptStore>((set) => ({
	initialReceipt: null,
	currentReceipt: null,
	imageData: null,
	editHistory: [],

	setReceipt: (receipt: Receipt) =>
		set({
			initialReceipt: receipt,
			currentReceipt: receipt,
			editHistory: [],
		}),

	setImageData: (imageData: string) =>
		set({
			imageData,
		}),

	addItem: (item: Omit<ReceiptItem, "id">) =>
		set((state) => {
			if (!state.currentReceipt) return state;

			const newItem: ReceiptItem = {
				...item,
				id: crypto.randomUUID(),
			};

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "add_receipt_item",
				args: item,
			};

			return {
				currentReceipt: {
					...state.currentReceipt,
					items: [...state.currentReceipt.items, newItem],
				},
				editHistory: [...state.editHistory, toolCall],
			};
		}),

	removeItem: (id: string) =>
		set((state) => {
			if (!state.currentReceipt) return state;

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "remove_receipt_item",
				args: { id },
			};

			return {
				currentReceipt: {
					...state.currentReceipt,
					items: state.currentReceipt.items.filter((item) => item.id !== id),
				},
				editHistory: [...state.editHistory, toolCall],
			};
		}),

	updateItem: (id: string, changes: Partial<Omit<ReceiptItem, "id">>) =>
		set((state) => {
			if (!state.currentReceipt) return state;

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "update_receipt_item",
				args: { id, ...changes },
			};

			return {
				currentReceipt: {
					...state.currentReceipt,
					items: state.currentReceipt.items.map((item) =>
						item.id === id ? { ...item, ...changes } : item,
					),
				},
				editHistory: [...state.editHistory, toolCall],
			};
		}),

	reset: () =>
		set((state) => ({
			currentReceipt: state.initialReceipt,
			editHistory: [],
		})),

	applyToolCall: (toolCall: ToolCall) =>
		set((state) => {
			if (!state.currentReceipt) return state;

			let newReceipt = state.currentReceipt;

			switch (toolCall.functionName) {
				case "add_receipt_item": {
					const item = toolCall.args as Omit<ReceiptItem, "id">;
					const newItem: ReceiptItem = {
						...item,
						id: crypto.randomUUID(),
					};
					newReceipt = {
						...state.currentReceipt,
						items: [...state.currentReceipt.items, newItem],
					};
					break;
				}
				case "remove_receipt_item": {
					const { id } = toolCall.args as { id: string };
					newReceipt = {
						...state.currentReceipt,
						items: state.currentReceipt.items.filter((item) => item.id !== id),
					};
					break;
				}
				case "update_receipt_item": {
					const { id, ...changes } = toolCall.args as {
						id: string;
					} & Partial<Omit<ReceiptItem, "id">>;
					newReceipt = {
						...state.currentReceipt,
						items: state.currentReceipt.items.map((item) =>
							item.id === id ? { ...item, ...changes } : item,
						),
					};
					break;
				}
			}

			return {
				currentReceipt: newReceipt,
				editHistory: [...state.editHistory, toolCall],
			};
		}),
}));
