import { create } from "zustand";
import { api, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  loadSession: () => Promise<void>;
  completeAuth: (token: string, user: User) => void;
  updateProfile: (fields: Partial<Pick<User, "display_name" | "about" | "avatar_color">>) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  loadSession: async () => {
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, loading: false });
    } catch {
      setToken(null);
      set({ user: null, loading: false });
    }
  },

  completeAuth: (token, user) => {
    setToken(token);
    set({ user, loading: false });
  },

  updateProfile: async (fields) => {
    const user = await api.patch<User>("/auth/me", fields);
    set({ user });
  },

  logout: () => {
    setToken(null);
    set({ user: null });
  },
}));
