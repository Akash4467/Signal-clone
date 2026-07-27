"use client";

import type { Member } from "@/lib/types";

interface TypingIndicatorProps {
  typingUserIds: number[];
  members: Member[];
}

export function TypingIndicator({ typingUserIds, members }: TypingIndicatorProps) {
  if (typingUserIds.length === 0) return null;
  const names = typingUserIds
    .map((id) => members.find((m) => m.user.id === id)?.user.display_name.split(" ")[0])
    .filter(Boolean);
  if (names.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-5 pb-1 text-xs text-signal-muted dark:text-signal-mutedDark">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal-muted dark:bg-signal-mutedDark"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span>
        {names.join(", ")} {names.length === 1 ? "is" : "are"} typing…
      </span>
    </div>
  );
}
