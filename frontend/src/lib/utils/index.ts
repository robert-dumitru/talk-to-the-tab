export function base64ToArrayBuffer(base64: string) {
	var binaryString = atob(base64);
	var bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
	return fetch(`${BACKEND_URL}${path}`, {
		...options,
		credentials: "include",
	});
}

