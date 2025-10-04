import { useEffect, useRef } from "react";
import type { GenAILiveClient } from "@/lib/genai/live-client";

const SAMPLE_RATE = 16000; // Gemini Live API expects 16kHz

// AudioWorklet processor that captures audio and converts to PCM16
const MicrophoneWorklet = `
class MicrophoneProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      const samples = input[0];

      // Convert Float32 samples to Int16 PCM
      const pcm16 = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Send PCM16 data to main thread
      this.port.postMessage(pcm16.buffer);
    }
    return true;
  }
}

registerProcessor('microphone-processor', MicrophoneProcessor);
`;

/**
 * Hook to capture microphone audio and send it to Gemini Live API
 */
export function useMicrophone(
	client: GenAILiveClient | null,
	connected: boolean,
) {
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const workletNodeRef = useRef<AudioWorkletNode | null>(null);

	useEffect(() => {
		if (!client || !connected) {
			// Clean up if disconnected
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
				streamRef.current = null;
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
			workletNodeRef.current = null;
			return;
		}

		let isActive = true;

		async function startMicrophone() {
			try {
				// Request microphone permission
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						sampleRate: SAMPLE_RATE,
						channelCount: 1,
						echoCancellation: true,
						noiseSuppression: true,
					},
				});

				if (!isActive) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}

				streamRef.current = stream;

				// Create audio context
				const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
				audioContextRef.current = audioContext;

				// Create worklet
				const workletBlob = new Blob([MicrophoneWorklet], {
					type: "application/javascript",
				});
				const workletUrl = URL.createObjectURL(workletBlob);

				await audioContext.audioWorklet.addModule(workletUrl);
				URL.revokeObjectURL(workletUrl);

				const source = audioContext.createMediaStreamSource(stream);
				const workletNode = new AudioWorkletNode(
					audioContext,
					"microphone-processor",
				);

				workletNodeRef.current = workletNode;

				// Handle audio chunks
				workletNode.port.onmessage = (event: MessageEvent) => {
					const pcm16Buffer = event.data as ArrayBuffer;

					// Convert to base64
					const bytes = new Uint8Array(pcm16Buffer);
					let binary = "";
					for (let i = 0; i < bytes.length; i++) {
						binary += String.fromCharCode(bytes[i]);
					}
					const base64 = btoa(binary);

					// Send to Gemini Live API
					if (client && isActive) {
						client.sendRealtimeInput([
							{
								mimeType: "audio/pcm;rate=16000",
								data: base64,
							},
						]);
					}
				};

				// Connect the audio graph
				source.connect(workletNode);
				// Note: We don't connect to destination as we don't want to hear ourselves

				console.log("Microphone started successfully");
			} catch (error) {
				console.error("Failed to start microphone:", error);
			}
		}

		startMicrophone();

		return () => {
			isActive = false;
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, [client, connected]);
}
