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
	imageData: string | null;
	editHistory: ToolCall[];

	setReceipt: (receipt: Receipt) => void;
	setImageData: (imageData: string) => void;
	addItem: (item: Omit<ReceiptItem, "id">) => void;
	removeItem: (id: string) => void;
	updateItem: (id: string, changes: Partial<Omit<ReceiptItem, "id">>) => void;
	reset: () => void;
	addToolCall: (toolCall: ToolCall) => void;
}

export const useReceiptStore = create<ReceiptStore>((set) => ({
	initialReceipt: null,
	imageData: null,
	editHistory: [],

	setReceipt: (receipt: Receipt) =>
		set({
			initialReceipt: receipt,
			editHistory: [],
		}),

	setImageData: (imageData: string) =>
		set({
			imageData,
		}),

	addItem: (item: Omit<ReceiptItem, "id">) =>
		set((state) => {
			if (!state.initialReceipt) return state;

			const newItem: ReceiptItem = {
				...item,
				id: crypto.randomUUID(),
			};

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "add_receipt_item",
				args: {...newItem},
			};

			return {
				editHistory: [...state.editHistory, toolCall],
			};
		}),

	removeItem: (id: string) =>
		set((state) => {
			if (!state.initialReceipt) return state;

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "remove_receipt_item",
				args: { id },
			};

			return {
				editHistory: [...state.editHistory, toolCall],
			};
		}),

	updateItem: (id: string, changes: Partial<Omit<ReceiptItem, "id">>) =>
		set((state) => {
			if (!state.initialReceipt) return state;

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "update_receipt_item",
				args: { id, ...changes },
			};

			return {
				editHistory: [...state.editHistory, toolCall],
			};
		}),

	reset: () =>
		set({
			editHistory: [],
		}),

	addToolCall: (toolCall: ToolCall) =>
		set((state) => ({
			editHistory: [...state.editHistory, toolCall],
		})),
}));
