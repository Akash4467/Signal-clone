"use client";

import { useEffect } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-signal-sidebarDark shadow-xl border border-signal-border dark:border-signal-borderDark">
        <div className="flex items-center justify-between border-b border-signal-border dark:border-signal-borderDark px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-signal-muted hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}
