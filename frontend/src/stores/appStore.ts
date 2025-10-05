import { create } from "zustand";
import type { User } from "@/types";


interface AppStore {
    user: User | null;
    microphoneEnabled: boolean;

    setUser: (user: User | null) => void;
    setMicrophoneEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
    user: null,
    microphoneEnabled: false,

    setUser: (user: User | null) => set({ user }),
    setMicrophoneEnabled: (enabled: boolean) => set({ microphoneEnabled: enabled }),
}));