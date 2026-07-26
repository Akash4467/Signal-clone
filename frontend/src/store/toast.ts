import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "error" | "success";
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, kind?: Toast["kind"]) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, kind = "info") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
