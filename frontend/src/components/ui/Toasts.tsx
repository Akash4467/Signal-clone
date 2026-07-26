"use client";

import { useToastStore } from "@/store/toast";

const kindStyles = {
  info: "bg-signal-text text-white dark:bg-white dark:text-signal-text",
  error: "bg-red-600 text-white",
  success: "bg-green-600 text-white",
};

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto rounded-full px-4 py-2 text-sm shadow-lg ${kindStyles[t.kind]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
