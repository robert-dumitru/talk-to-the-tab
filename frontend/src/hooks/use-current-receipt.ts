import { useMemo } from "react";
import { useReceiptStore } from "@/stores/receiptStore";
import type { Receipt, ReceiptItem, ItemSplit } from "@/types/receipt";
import type { ToolCall } from "@/stores/receiptStore";

export interface PersonTotal {
	person: string;
	subtotal: number;
	tax: number;
	tip: number;
	total: number;
}

export interface SplitSummary {
	splits: ItemSplit[];
	personTotals: PersonTotal[];
	unsplitAmount: number;
}

/**
 * Applies a single edit (tool call) to a receipt and returns the modified receipt.
 */
function applyEdit(receipt: Receipt, toolCall: ToolCall): Receipt {
	switch (toolCall.functionName) {
		case "add_receipt_item": {
			const item = toolCall.args as ReceiptItem;
			return {
				...receipt,
				items: [...receipt.items, item],
			};
		}
		case "remove_receipt_item": {
			const { id } = toolCall.args as { id: string };
			return {
				...receipt,
				items: receipt.items.filter((item) => item.id !== id),
			};
		}
		case "update_receipt_item": {
			const { id, ...changes } = toolCall.args as {
				id: string;
			} & Partial<Omit<ReceiptItem, "id">>;
			return {
				...receipt,
				items: receipt.items.map((item) =>
					item.id === id ? { ...item, ...changes } : item,
				),
			};
		}
		default:
			return receipt;
	}
}

/**
 * Applies a single split (tool call) to splits array and returns the modified array.
 */
function applySplit(splits: ItemSplit[], toolCall: ToolCall): ItemSplit[] {
	switch (toolCall.functionName) {
		case "add_split": {
			const split = toolCall.args as ItemSplit;
			return [...splits, split];
		}
		case "remove_split": {
			const { id } = toolCall.args as { id: string };
			return splits.filter((split) => split.id !== id);
		}
		case "update_split": {
			const { id, ...changes } = toolCall.args as {
				id: string;
			} & Partial<Omit<ItemSplit, "id">>;
			return splits.map((split) =>
				split.id === id ? { ...split, ...changes } : split,
			);
		}
		default:
			return splits;
	}
}

/**
 * Computes split summary from current receipt and splits.
 */
function computeSplitSummary(
	receipt: Receipt,
	splits: ItemSplit[],
): SplitSummary {
	const lineItems = receipt.items.filter(
		(item) => item.name !== "TAX" && item.name !== "TIP",
	);
	const tax = receipt.items.find((item) => item.name === "TAX");
	const tip = receipt.items.find((item) => item.name === "TIP");
	const taxAmount = tax?.price || 0;
	const tipAmount = tip?.price || 0;
	const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0);
	const grandTotal = subtotal + taxAmount + tipAmount;

	// Calculate per-person totals
	const personMap = new Map<string, PersonTotal>();

	// Process each split
	for (const split of splits) {
		const item = lineItems.find((i) => i.id === split.itemId);
		if (!item) continue;

		let splitAmount = 0;
		if (split.type === "absolute") {
			splitAmount = split.amount || 0;
		} else if (split.type === "proportional") {
			const shares = split.shares || 0;
			const totalShares = split.totalShares || 1;
			splitAmount = Math.round((item.price * shares) / totalShares);
		}

		if (!personMap.has(split.person)) {
			personMap.set(split.person, {
				person: split.person,
				subtotal: 0,
				tax: 0,
				tip: 0,
				total: 0,
			});
		}

		const personTotal = personMap.get(split.person)!;
		personTotal.subtotal += splitAmount;
	}

	// Calculate total split amount and distribute tax/tip proportionally
	let totalSplitAmount = 0;
	for (const personTotal of personMap.values()) {
		totalSplitAmount += personTotal.subtotal;
	}

	for (const personTotal of personMap.values()) {
		if (subtotal > 0) {
			const proportion = personTotal.subtotal / subtotal;
			personTotal.tax = Math.round(taxAmount * proportion);
			personTotal.tip = Math.round(tipAmount * proportion);
		}
		personTotal.total = personTotal.subtotal + personTotal.tax + personTotal.tip;
	}

	const personTotals = Array.from(personMap.values());
	const totalAssigned = personTotals.reduce((sum, p) => sum + p.total, 0);
	const unsplitAmount = grandTotal - totalAssigned;

	return {
		splits,
		personTotals,
		unsplitAmount,
	};
}

/**
 * Hook that computes the current receipt and splits by applying all edits/splits to the initial receipt.
 * Returns null if no initial receipt is set.
 */
export function useCurrentReceipt(): {
	receipt: Receipt | null;
	splitSummary: SplitSummary | null;
} {
	const initialReceipt = useReceiptStore((state) => state.initialReceipt);
	const editHistory = useReceiptStore((state) => state.editHistory);
	const splitHistory = useReceiptStore((state) => state.splitHistory);

	const currentReceipt = useMemo(() => {
		if (!initialReceipt) return null;

		return editHistory.reduce(
			(receipt, toolCall) => applyEdit(receipt, toolCall),
			initialReceipt,
		);
	}, [initialReceipt, editHistory]);

	const currentSplits = useMemo(() => {
		return splitHistory.reduce(
			(splits, toolCall) => applySplit(splits, toolCall),
			[] as ItemSplit[],
		);
	}, [splitHistory]);

	const splitSummary = useMemo(() => {
		if (!currentReceipt) return null;
		return computeSplitSummary(currentReceipt, currentSplits);
	}, [currentReceipt, currentSplits]);

	return {
		receipt: currentReceipt,
		splitSummary,
	};
}
