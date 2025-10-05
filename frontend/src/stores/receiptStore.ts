import { create } from "zustand";
import type { Receipt, ReceiptItem, ItemSplit } from "@/types/receipt";

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
	splitHistory: ToolCall[];

	setReceipt: (receipt: Receipt) => void;
	setImageData: (imageData: string | null) => void;
	addItem: (item: Omit<ReceiptItem, "id">) => void;
	removeItem: (id: string) => void;
	updateItem: (id: string, changes: Partial<Omit<ReceiptItem, "id">>) => void;
	addSplit: (split: Omit<ItemSplit, "id">) => void;
	removeSplit: (id: string) => void;
	updateSplit: (id: string, changes: Partial<Omit<ItemSplit, "id">>) => void;
	reset: () => void;
	addToolCall: (toolCall: ToolCall) => void;
}

export const useReceiptStore = create<ReceiptStore>((set) => ({
	initialReceipt: null,
	imageData: null,
	editHistory: [],
	splitHistory: [],

	setReceipt: (receipt: Receipt) =>
		set({
			initialReceipt: receipt,
			editHistory: [],
			splitHistory: [],
		}),

	setImageData: (imageData: string | null) =>
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

	addSplit: (split: Omit<ItemSplit, "id">) =>
		set((state) => {
			if (!state.initialReceipt) return state;

			const newSplit: ItemSplit = {
				...split,
				id: crypto.randomUUID(),
			};

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "add_split",
				args: { ...newSplit },
			};

			return {
				splitHistory: [...state.splitHistory, toolCall],
			};
		}),

	removeSplit: (id: string) =>
		set((state) => {
			if (!state.initialReceipt) return state;

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "remove_split",
				args: { id },
			};

			return {
				splitHistory: [...state.splitHistory, toolCall],
			};
		}),

	updateSplit: (id: string, changes: Partial<Omit<ItemSplit, "id">>) =>
		set((state) => {
			if (!state.initialReceipt) return state;

			const toolCall: ToolCall = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				functionName: "update_split",
				args: { id, ...changes },
			};

			return {
				splitHistory: [...state.splitHistory, toolCall],
			};
		}),

	reset: () =>
		set({
			editHistory: [],
			splitHistory: [],
		}),

	addToolCall: (toolCall: ToolCall) =>
		set((state) => ({
			editHistory: [...state.editHistory, toolCall],
		}))
}));
