export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatListTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;

  if (date >= startOfToday) return formatTime(iso);
  if (date >= new Date(startOfToday.getTime() - dayMs)) return "Yesterday";
  if (date >= new Date(startOfToday.getTime() - 6 * dayMs)) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatDaySeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;

  if (date >= startOfToday) return "Today";
  if (date >= new Date(startOfToday.getTime() - dayMs)) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function formatLastSeen(iso: string | null): string {
  if (!iso) return "Offline";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "Last seen just now";
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  if (diffMin < 24 * 60) return `Last seen ${Math.floor(diffMin / 60)}h ago`;
  return `Last seen ${new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

export function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
