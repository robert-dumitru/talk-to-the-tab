import { useState, useEffect } from "react";
import { useParams } from "react-router";
import type { Receipt as ReceiptType } from "@/types/receipt";
import { Receipt } from "@/components/ui/receipt";

export default function ReceiptEdit() {
	const { id } = useParams<{ id: string }>();
	const [receipt, setReceipt] = useState<ReceiptType | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadImage = () => {
			const storedImage = sessionStorage.getItem(`receipt_image_${id}`);
			if (storedImage) {
				processImage(storedImage);
			} else {
				setError("No image found");
			}
		};

		loadImage();
	}, [id]);

	const processImage = async (imageData: string) => {
		try {
			const response = await fetch("http://localhost:8000/ai/ocr", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ image: imageData }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.detail || "OCR processing failed");
			}

			const data = await response.json();
			console.log("OCR Result:", data);
			setReceipt(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to process image");
		}
	};

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
				<div className="text-red-600 text-center">
					<p className="text-xl font-bold">Error</p>
					<p>{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-3xl font-bold mb-6 text-center">Edit Receipt</h1>
				{receipt &&
					<Receipt
						receipt={receipt}
					/>
				}
			</div>
		</div>
	);
}
