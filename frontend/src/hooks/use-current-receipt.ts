import { useMemo } from "react";
import { useReceiptStore } from "@/stores/receiptStore";
import type { Receipt, ReceiptItem } from "@/types/receipt";
import type { ToolCall } from "@/stores/receiptStore";

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
 * Hook that computes the current receipt by applying all edits to the initial receipt.
 * Returns null if no initial receipt is set.
 */
export function useCurrentReceipt(): Receipt | null {
	const initialReceipt = useReceiptStore((state) => state.initialReceipt);
	const editHistory = useReceiptStore((state) => state.editHistory);

	const currentReceipt = useMemo(() => {
		if (!initialReceipt) return null;

		return editHistory.reduce(
			(receipt, toolCall) => applyEdit(receipt, toolCall),
			initialReceipt,
		);
	}, [initialReceipt, editHistory]);

	return currentReceipt;
}
