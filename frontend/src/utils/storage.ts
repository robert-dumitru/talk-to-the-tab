import type { Receipt } from "../types/receipt";

const STORAGE_KEY = "receipts";

export function getAllReceipts(): Receipt[] {
	const data = localStorage.getItem(STORAGE_KEY);
	return data ? JSON.parse(data) : [];
}

export function getReceipt(id: string): Receipt | null {
	const receipts = getAllReceipts();
	return receipts.find((r) => r.id === id) || null;
}

export function saveReceipt(receipt: Receipt): void {
	const receipts = getAllReceipts();
	const index = receipts.findIndex((r) => r.id === receipt.id);

	if (index >= 0) {
		receipts[index] = receipt;
	} else {
		receipts.push(receipt);
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

export function deleteReceipt(id: string): void {
	const receipts = getAllReceipts();
	const filtered = receipts.filter((r) => r.id !== id);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
