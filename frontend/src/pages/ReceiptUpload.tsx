import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Header } from "@/components/ui/header";
import { useReceiptStore } from "@/stores/receiptStore";

export default function ReceiptUpload() {
	const [image, setImage] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const setReceipt = useReceiptStore((state) => state.setReceipt);
	const setImageData = useReceiptStore((state) => state.setImageData);

	const compressImage = (file: File): Promise<string> => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					// This compresses the image so we don't blow up localStorage
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					if (!ctx) return;

					const MAX_WIDTH = 800;
					const MAX_HEIGHT = 800;
					let width = img.width;
					let height = img.height;

					if (width > height) {
						if (width > MAX_WIDTH) {
							height *= MAX_WIDTH / width;
							width = MAX_WIDTH;
						}
					} else {
						if (height > MAX_HEIGHT) {
							width *= MAX_HEIGHT / height;
							height = MAX_HEIGHT;
						}
					}

					canvas.width = width;
					canvas.height = height;
					ctx.drawImage(img, 0, 0, width, height);

					resolve(canvas.toDataURL("image/jpeg", 0.7));
				};
				img.src = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		});
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const compressed = await compressImage(file);
		setImage(compressed);
	};

	const handleContinue = async () => {
		if (!image) return;

		setIsProcessing(true);
		setError(null);

		try {
			const response = await fetch("http://localhost:8000/ai/ocr", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ image }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.detail || "OCR processing failed");
			}

			const receipt = await response.json();

			// Store receipt and image in the store
			setReceipt(receipt);
			setImageData(image);

			// Navigate to edit page
			navigate("/edit");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to process image");
			setIsProcessing(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<Header microphoneConnected={false} />
			<div className="max-w-4xl mx-auto p-4 pt-8">

				{!image ? (
					<Container>
						<div className="flex flex-col items-center">
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								capture="environment"
								onChange={handleFileChange}
								className="hidden"
							/>
							<Button onClick={() => fileInputRef.current?.click()}>
								Take Photo / Upload
							</Button>

							<p className="text-center text-gray-600 mt-4 text-sm">
								Upload a photo of your receipt to get started
							</p>
						</div>
					</Container>
				) : (
					<div className="bg-white shadow-lg rounded-lg p-4">
						<img
							src={image}
							alt="Receipt preview"
							className="w-full rounded-lg mb-4"
						/>

						{error && (
							<div className="text-red-600 text-sm mb-4 text-center">
								{error}
							</div>
						)}

						<div className="flex flex-row gap-3 w-full">
							<div className="flex-1" />
							<Button onClick={() => setImage(null)} disabled={isProcessing}>
								Retake
							</Button>
							<Button onClick={handleContinue} disabled={isProcessing}>
								{isProcessing ? "Processing..." : "Continue"}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
