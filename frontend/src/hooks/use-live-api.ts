import { useCallback, useEffect, useMemo, useState } from "react";
import { GenAILiveClient } from "@/lib/genai/live-client";
import { type LiveClientOptions } from "@/types/genai";
import { type LiveConnectConfig } from "@google/genai";

export type UseLiveAPIResults = {
	client: GenAILiveClient;
	setConfig: (config: LiveConnectConfig) => void;
	config: LiveConnectConfig;
	model: string;
	setModel: (model: string) => void;
	connected: boolean;
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
};

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
	const client = useMemo(() => new GenAILiveClient(options), [options]);

	const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
	const [config, setConfig] = useState<LiveConnectConfig>({});
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		const onOpen = () => {
			setConnected(true);
		};

		const onClose = () => {
			setConnected(false);
		};

		const onError = (error: ErrorEvent) => {
			console.error("error", error);
		};

		client.on("error", onError).on("open", onOpen).on("close", onClose);

		return () => {
			client.off("error", onError).off("open", onOpen).off("close", onClose);
		};
	}, [client]);

	const connect = useCallback(async () => {
		if (!config) {
			throw new Error("config has not been set");
		}
		client.disconnect();
		await client.connect(model, config);
	}, [client, config, model]);

	const disconnect = useCallback(async () => {
		client.disconnect();
		setConnected(false);
	}, [setConnected, client]);

	return {
		client,
		config,
		setConfig,
		model,
		setModel,
		connected,
		connect,
		disconnect,
	};
}
