import type { MessageStatus } from "@/lib/types";

interface ReceiptTicksProps {
  status: MessageStatus | null;
  light?: boolean;
}

function SingleCheck({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 12" className={className}>
      <path d="M5.5 9.5L1.9 5.9l-1 1L5.5 11.5 15 2l-1-1z" fill="currentColor" />
    </svg>
  );
}

function DoubleCheck({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 12" className={className}>
      <path d="M5.5 9.5L1.9 5.9l-1 1L5.5 11.5 15 2l-1-1z" fill="currentColor" />
      <path d="M10.5 9.5l-1-1 1-1 1 1L19 1l1 1-9.5 9.5z" fill="currentColor" />
    </svg>
  );
}

export function ReceiptTicks({ status, light }: ReceiptTicksProps) {
  if (!status) return null;
  const base = "inline-block h-3 w-auto";
  const color = light ? "text-white/80" : "text-signal-muted dark:text-signal-mutedDark";

  if (status === "sending") {
    return (
      <svg viewBox="0 0 12 12" className={`${base} ${color} animate-spin`}>
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="18" strokeDashoffset="6" />
      </svg>
    );
  }
  if (status === "sent") return <SingleCheck className={`${base} ${color}`} />;
  if (status === "delivered") return <DoubleCheck className={`${base} ${color}`} />;
  return <DoubleCheck className={`${base} ${light ? "text-sky-200" : "text-signal-blue"}`} />;
}
